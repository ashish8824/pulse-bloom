// src/modules/auth/auth.service.ts

import bcrypt from "bcrypt";
import crypto from "crypto";
import {
  createUser,
  findUserByEmail,
  findUserById,
  markUserVerified,
  updateUserPassword,
  createRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  createEmailVerification,
  findEmailVerification,
  deleteEmailVerifications,
  createPasswordReset,
  findPasswordReset,
  deletePasswordResets,
} from "./auth.repository";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../../utils/mailer";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const BCRYPT_ROUNDS = 12; // 12 rounds ≈ 300ms/hash — good balance of security vs perf
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const OTP_EXPIRY_MINUTES = 15;
const RESET_TOKEN_EXPIRY_HOURS = 1;

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/** Returns a Date N days from now */
const daysFromNow = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

/** Returns a Date N minutes from now */
const minutesFromNow = (minutes: number): Date => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

/** Returns a Date N hours from now */
const hoursFromNow = (hours: number): Date => {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
};

/**
 * Generate a 6-digit numeric OTP.
 * Uses crypto.randomInt for cryptographic randomness (not Math.random).
 * Range: 100000–999999 guarantees always 6 digits (no leading-zero issues).
 */
const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Build the standard auth response shape returned by login and refresh-token.
 * Keeps token delivery consistent across both endpoints.
 */
const buildAuthResponse = (
  user: { id: string; email: string; name: string; isVerified: boolean },
  accessToken: string,
  refreshToken: string,
) => ({
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    isVerified: user.isVerified,
  },
  accessToken,
  refreshToken,
  // Tell the client when to call /refresh-token (14 minutes gives 1-minute buffer)
  accessTokenExpiresInSeconds: 14 * 60,
});

// ═════════════════════════════════════════════════════════════════
// 1. REGISTER
//
// Steps:
//   1. Check email uniqueness
//   2. Hash password
//   3. Create user (isVerified: false)
//   4. Generate & save OTP (expires 15 min)
//   5. Send verification email
//   6. Return user info (NO tokens — user must verify first)
//
// Why no tokens on register?
//   Issuing tokens before email verification lets anyone create accounts
//   with fake emails and immediately start using the API.
//   Forcing verification first ensures every active user has a real email.
// ═════════════════════════════════════════════════════════════════
export const registerUser = async (
  email: string,
  password: string,
  name: string,
) => {
  // ── 1. Duplicate check ─────────────────────────────────────────
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error("User already exists");
  }

  // ── 2. Hash password ───────────────────────────────────────────
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // ── 3. Create user ─────────────────────────────────────────────
  const user = await createUser({ email, password: hashedPassword, name });

  // ── 4. Generate OTP + save ─────────────────────────────────────
  const otp = generateOTP();
  await createEmailVerification({
    otp,
    userId: user.id,
    expiresAt: minutesFromNow(OTP_EXPIRY_MINUTES),
  });

  // ── 5. Send email ──────────────────────────────────────────────
  // Fire-and-forget: we don't await here so email failure doesn't block the response.
  // In production, replace this with a job queue (Bull/BullMQ) for retry logic.
  sendVerificationEmail(user.email, user.name, otp).catch((err) => {
    console.error("[Auth] Failed to send verification email:", err.message);
  });

  // ── 6. Return (no tokens until verified) ──────────────────────
  return {
    message:
      "Registration successful. Please check your email for the verification code.",
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
    },
  };
};

// ═════════════════════════════════════════════════════════════════
// 2. VERIFY EMAIL
//
// Steps:
//   1. Find user by email
//   2. Check if already verified
//   3. Find OTP row for this user
//   4. Validate OTP matches + not expired
//   5. Mark user as verified
//   6. Delete OTP rows (single-use)
//   7. Issue access + refresh tokens (first login after verification)
// ═════════════════════════════════════════════════════════════════
export const verifyEmail = async (email: string, otp: string) => {
  // ── 1. Find user ────────────────────────────────────────────────
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("Invalid verification attempt");
  }

  // ── 2. Already verified? ───────────────────────────────────────
  if (user.isVerified) {
    throw new Error("Email is already verified");
  }

  // ── 3. Find OTP ─────────────────────────────────────────────────
  const verification = await findEmailVerification(user.id);
  if (!verification) {
    throw new Error(
      "No pending verification found. Please request a new code.",
    );
  }

  // ── 4. Validate OTP ─────────────────────────────────────────────
  if (verification.otp !== otp) {
    throw new Error("Invalid verification code");
  }
  if (verification.expiresAt < new Date()) {
    throw new Error("Verification code has expired. Please request a new one.");
  }

  // ── 5. Mark verified ────────────────────────────────────────────
  const updatedUser = await markUserVerified(user.id);

  // ── 6. Cleanup OTP ──────────────────────────────────────────────
  await deleteEmailVerifications(user.id);

  // ── 7. Issue tokens ─────────────────────────────────────────────
  const accessToken = generateAccessToken({ userId: updatedUser.id });
  const refreshToken = generateRefreshToken();
  await createRefreshToken({
    token: refreshToken,
    userId: updatedUser.id,
    expiresAt: daysFromNow(REFRESH_TOKEN_EXPIRY_DAYS),
  });

  return {
    message: "Email verified successfully. Welcome to PulseBloom!",
    ...buildAuthResponse(
      {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        isVerified: true,
      },
      accessToken,
      refreshToken,
    ),
  };
};

// ═════════════════════════════════════════════════════════════════
// 3. RESEND VERIFICATION
//
// Rate limited on the route level (3 req / 15 min per IP).
// Extra guard: delete old OTP before creating a new one so there's
// never more than 1 valid OTP per user at a time.
// ═════════════════════════════════════════════════════════════════
export const resendVerification = async (email: string) => {
  const user = await findUserByEmail(email);

  // Always return the same message to prevent user enumeration.
  // (Don't reveal whether the email exists or not.)
  if (!user || user.isVerified) {
    return {
      message:
        "If this email is registered and unverified, a new code has been sent.",
    };
  }

  // Delete old OTP → create new one
  await deleteEmailVerifications(user.id);
  const otp = generateOTP();
  await createEmailVerification({
    otp,
    userId: user.id,
    expiresAt: minutesFromNow(OTP_EXPIRY_MINUTES),
  });

  sendVerificationEmail(user.email, user.name, otp).catch((err) => {
    console.error("[Auth] Failed to resend verification email:", err.message);
  });

  return {
    message:
      "If this email is registered and unverified, a new code has been sent.",
  };
};

// ═════════════════════════════════════════════════════════════════
// 4. LOGIN
//
// Steps:
//   1. Find user by email
//   2. Compare password
//   3. Check email is verified
//   4. Issue access + refresh tokens
//
// Security note: We check password BEFORE checking isVerified.
// This way an attacker who doesn't know the password still gets
// "Invalid credentials" rather than "Email not verified", which
// would confirm the account exists with that email.
// ═════════════════════════════════════════════════════════════════
export const loginUser = async (email: string, password: string) => {
  // ── 1. Find user ────────────────────────────────────────────────
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("Invalid credentials");
  }

  // ── 2. Password check ───────────────────────────────────────────
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  // ── 3. Verified check ───────────────────────────────────────────
  // Separate error message here is acceptable — attacker already proved
  // they know the correct password, so revealing "not verified" is fine.
  if (!user.isVerified) {
    throw new Error("Please verify your email before logging in");
  }

  // ── 4. Issue tokens ─────────────────────────────────────────────
  const accessToken = generateAccessToken({ userId: user.id });
  const refreshToken = generateRefreshToken();
  await createRefreshToken({
    token: refreshToken,
    userId: user.id,
    expiresAt: daysFromNow(REFRESH_TOKEN_EXPIRY_DAYS),
  });

  return buildAuthResponse(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
    },
    accessToken,
    refreshToken,
  );
};

// ═════════════════════════════════════════════════════════════════
// 5. REFRESH TOKEN (Token Rotation)
//
// Steps:
//   1. Find the RefreshToken row in DB
//   2. Check it's not revoked
//   3. Check it's not expired
//   4. Revoke old token (rotation — each token is single-use)
//   5. Issue new access token + new refresh token
//
// Token Rotation means:
//   • Every /refresh-token call invalidates the old refresh token and issues a new one
//   • If an attacker steals an old refresh token and tries to use it after the
//     legitimate client has already rotated it, they get an error
//   • This provides "refresh token reuse detection" — a stolen token can't be silently used
// ═════════════════════════════════════════════════════════════════
export const refreshAccessToken = async (token: string) => {
  // ── 1. Look up token ────────────────────────────────────────────
  const stored = await findRefreshToken(token);
  if (!stored) {
    throw new Error("Invalid refresh token");
  }

  // ── 2. Revocation check ─────────────────────────────────────────
  if (stored.isRevoked) {
    // Possible token reuse attack — revoke ALL tokens for this user
    await revokeAllRefreshTokens(stored.userId);
    throw new Error("Refresh token has been revoked. Please log in again.");
  }

  // ── 3. Expiry check ─────────────────────────────────────────────
  if (stored.expiresAt < new Date()) {
    throw new Error("Refresh token has expired. Please log in again.");
  }

  // ── 4. Rotate — revoke old, issue new ───────────────────────────
  await revokeRefreshToken(token);
  const newAccessToken = generateAccessToken({ userId: stored.userId });
  const newRefreshToken = generateRefreshToken();
  await createRefreshToken({
    token: newRefreshToken,
    userId: stored.userId,
    expiresAt: daysFromNow(REFRESH_TOKEN_EXPIRY_DAYS),
  });

  return buildAuthResponse(stored.user, newAccessToken, newRefreshToken);
};

// ═════════════════════════════════════════════════════════════════
// 6. LOGOUT
//
// Revokes the specific refresh token for this device/session.
// The access token naturally expires in 15 minutes.
// For immediate access token invalidation, you'd need a Redis denylist
// (marked as upcoming in the README).
// ═════════════════════════════════════════════════════════════════
export const logoutUser = async (refreshToken: string) => {
  const stored = await findRefreshToken(refreshToken);

  // Silently succeed even if token not found (idempotent logout)
  if (stored && !stored.isRevoked) {
    await revokeRefreshToken(refreshToken);
  }

  return { message: "Logged out successfully" };
};

// ═════════════════════════════════════════════════════════════════
// 7. GET ME
//
// Returns the authenticated user's profile.
// The `protect` middleware already verified the JWT and attached req.userId.
// We query the DB to always return fresh data (not stale JWT payload data).
// ═════════════════════════════════════════════════════════════════
export const getMe = async (userId: string) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return { user };
};

// ═════════════════════════════════════════════════════════════════
// 8. FORGOT PASSWORD
//
// Always returns the same success message regardless of whether
// the email exists. This prevents user enumeration attacks.
//
// Steps (if user found):
//   1. Delete any existing reset token (one active token per user)
//   2. Generate 64-char random hex token
//   3. Save with 1-hour expiry
//   4. Email the reset link
// ═════════════════════════════════════════════════════════════════
export const forgotPassword = async (email: string) => {
  const GENERIC_RESPONSE = {
    message:
      "If this email is registered, a password reset link has been sent.",
  };

  const user = await findUserByEmail(email);

  // Return early with same message to prevent user enumeration
  if (!user) {
    return GENERIC_RESPONSE;
  }

  // Delete existing reset tokens for this user
  await deletePasswordResets(user.id);

  // Generate cryptographically secure reset token
  const resetToken = crypto.randomBytes(32).toString("hex");

  await createPasswordReset({
    token: resetToken,
    userId: user.id,
    expiresAt: hoursFromNow(RESET_TOKEN_EXPIRY_HOURS),
  });

  sendPasswordResetEmail(user.email, user.name, resetToken).catch((err) => {
    console.error("[Auth] Failed to send password reset email:", err.message);
  });

  return GENERIC_RESPONSE;
};

// ═════════════════════════════════════════════════════════════════
// 9. RESET PASSWORD
//
// Steps:
//   1. Find reset token row
//   2. Check expiry
//   3. Hash new password
//   4. Update user password
//   5. Revoke ALL refresh tokens (force re-login everywhere)
//   6. Delete the used reset token
// ═════════════════════════════════════════════════════════════════
export const resetPassword = async (token: string, newPassword: string) => {
  // ── 1. Find token ────────────────────────────────────────────────
  const reset = await findPasswordReset(token);
  if (!reset) {
    throw new Error("Invalid or expired reset token");
  }

  // ── 2. Expiry check ─────────────────────────────────────────────
  if (reset.expiresAt < new Date()) {
    throw new Error("Invalid or expired reset token");
    // Same message as "not found" — don't distinguish between invalid and expired
  }

  // ── 3. Hash new password ────────────────────────────────────────
  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // ── 4. Update password ──────────────────────────────────────────
  await updateUserPassword(reset.userId, hashedPassword);

  // ── 5. Revoke all sessions (security: force re-login everywhere) ─
  await revokeAllRefreshTokens(reset.userId);

  // ── 6. Delete used reset token ──────────────────────────────────
  await deletePasswordResets(reset.userId);

  return {
    message: "Password reset successful. Please log in with your new password.",
  };
};
