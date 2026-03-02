// src/modules/auth/auth.service.ts

import bcrypt from "bcrypt";
import crypto from "crypto";
import {
  createUser,
  findUserByEmail,
  findUserById,
  markUserVerified,
  updateUserPassword,
  updateUserPreferences,
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
const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const OTP_EXPIRY_MINUTES = 15;
const RESET_TOKEN_EXPIRY_HOURS = 1;

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
const daysFromNow = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

const minutesFromNow = (minutes: number): Date =>
  new Date(Date.now() + minutes * 60 * 1000);

const hoursFromNow = (hours: number): Date =>
  new Date(Date.now() + hours * 60 * 60 * 1000);

const generateOTP = (): string => crypto.randomInt(100000, 999999).toString();

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
  accessTokenExpiresInSeconds: 14 * 60,
});

// ═════════════════════════════════════════════════════════════════
// 1. REGISTER
// ═════════════════════════════════════════════════════════════════
export const registerUser = async (
  email: string,
  password: string,
  name: string,
) => {
  const existing = await findUserByEmail(email);
  if (existing) throw new Error("User already exists");

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await createUser({ email, password: hashedPassword, name });

  const otp = generateOTP();
  await createEmailVerification({
    otp,
    userId: user.id,
    expiresAt: minutesFromNow(OTP_EXPIRY_MINUTES),
  });

  sendVerificationEmail(user.email, user.name, otp).catch((err) => {
    console.error("[Auth] Failed to send verification email:", err.message);
  });

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
// ═════════════════════════════════════════════════════════════════
export const verifyEmail = async (email: string, otp: string) => {
  const user = await findUserByEmail(email);
  if (!user) throw new Error("Invalid verification attempt");
  if (user.isVerified) throw new Error("Email is already verified");

  const verification = await findEmailVerification(user.id);
  if (!verification) {
    throw new Error(
      "No pending verification found. Please request a new code.",
    );
  }

  if (verification.otp !== otp) throw new Error("Invalid verification code");
  if (verification.expiresAt < new Date()) {
    throw new Error("Verification code has expired. Please request a new one.");
  }

  const updatedUser = await markUserVerified(user.id);
  await deleteEmailVerifications(user.id);

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
// ═════════════════════════════════════════════════════════════════
export const resendVerification = async (email: string) => {
  const user = await findUserByEmail(email);

  if (!user || user.isVerified) {
    return {
      message:
        "If this email is registered and unverified, a new code has been sent.",
    };
  }

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
// ═════════════════════════════════════════════════════════════════
export const loginUser = async (email: string, password: string) => {
  const user = await findUserByEmail(email);
  if (!user) throw new Error("Invalid credentials");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid credentials");

  if (!user.isVerified) {
    throw new Error("Please verify your email before logging in");
  }

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
// 5. REFRESH TOKEN
// ═════════════════════════════════════════════════════════════════
export const refreshAccessToken = async (token: string) => {
  const stored = await findRefreshToken(token);
  if (!stored) throw new Error("Invalid refresh token");

  if (stored.isRevoked) {
    await revokeAllRefreshTokens(stored.userId);
    throw new Error("Refresh token has been revoked. Please log in again.");
  }

  if (stored.expiresAt < new Date()) {
    throw new Error("Refresh token has expired. Please log in again.");
  }

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
// ═════════════════════════════════════════════════════════════════
export const logoutUser = async (refreshToken: string) => {
  const stored = await findRefreshToken(refreshToken);
  if (stored && !stored.isRevoked) {
    await revokeRefreshToken(refreshToken);
  }
  return { message: "Logged out successfully" };
};

// ═════════════════════════════════════════════════════════════════
// 7. GET ME
// ═════════════════════════════════════════════════════════════════
export const getMe = async (userId: string) => {
  const user = await findUserById(userId);
  if (!user) throw new Error("User not found");
  return { user };
};

// ═════════════════════════════════════════════════════════════════
// 8. FORGOT PASSWORD
// ═════════════════════════════════════════════════════════════════
export const forgotPassword = async (email: string) => {
  const GENERIC_RESPONSE = {
    message:
      "If this email is registered, a password reset link has been sent.",
  };

  const user = await findUserByEmail(email);
  if (!user) return GENERIC_RESPONSE;

  await deletePasswordResets(user.id);

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
// ═════════════════════════════════════════════════════════════════
export const resetPassword = async (token: string, newPassword: string) => {
  const reset = await findPasswordReset(token);
  if (!reset) throw new Error("Invalid or expired reset token");
  if (reset.expiresAt < new Date())
    throw new Error("Invalid or expired reset token");

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await updateUserPassword(reset.userId, hashedPassword);
  await revokeAllRefreshTokens(reset.userId);
  await deletePasswordResets(reset.userId);

  return {
    message: "Password reset successful. Please log in with your new password.",
  };
};

// ═════════════════════════════════════════════════════════════════
// 10. UPDATE PREFERENCES  ← NEW
//
// Handles PATCH /api/auth/me/preferences.
//
// Business rules enforced here:
//
//   moodReminderOn: true requires a time to be set.
//     → If the request sets moodReminderOn=true but provides no
//       moodReminderTime, we check whether one is already stored in DB.
//     → If neither exists, we reject with a clear error message.
//
//   moodReminderOn: false → we leave moodReminderTime as-is so the
//     user can easily re-enable the reminder without re-entering the time.
//
// Returns the updated preference fields only (not the full user object).
// ═════════════════════════════════════════════════════════════════
export const updatePreferences = async (
  userId: string,
  data: {
    weeklyDigestOn?: boolean;
    moodReminderOn?: boolean;
    moodReminderTime?: string | null;
  },
) => {
  // ── Validate: enabling mood reminder requires a time ─────────
  if (data.moodReminderOn === true) {
    // If no time is being provided in this request, check if one is already stored
    if (data.moodReminderTime === undefined || data.moodReminderTime === null) {
      const user = await findUserById(userId);

      // findUserById selects moodReminderTime — check if it's already set
      const existingTime = (user as any)?.moodReminderTime;

      if (!existingTime) {
        throw new Error(
          "Cannot enable mood reminder without a reminder time. Please provide moodReminderTime (e.g. '08:30').",
        );
      }
    }
  }

  const updated = await updateUserPreferences(userId, data);

  return {
    message: "Preferences updated successfully.",
    preferences: updated,
  };
};
