// src/modules/auth/auth.repository.ts

import { prisma } from "../../config/db";

// ═════════════════════════════════════════════════════════════════
// USER OPERATIONS
// ═════════════════════════════════════════════════════════════════

/**
 * Create a new user.
 * isVerified defaults to false (Prisma schema default).
 * The email verification OTP is created separately in a follow-up call.
 */
export const createUser = async (data: {
  email: string;
  password: string;
  name: string;
}) => {
  return prisma.user.create({ data });
};

/**
 * Find user by email.
 * Used in: login, register (duplicate check), forgot-password, resend-verification.
 */
export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

/**
 * Find user by ID.
 * Used in: GET /me, protect middleware (optional — we trust the JWT payload for now).
 */
export const findUserById = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    // Never return the password hash to the application layer
    select: {
      id: true,
      email: true,
      name: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Mark user's email as verified.
 * Called after OTP is confirmed in auth.service.ts.
 */
export const markUserVerified = async (userId: string) => {
  return prisma.user.update({
    where: { id: userId },
    data: { isVerified: true },
  });
};

/**
 * Update user's hashed password.
 * Called after password reset is confirmed.
 */
export const updateUserPassword = async (
  userId: string,
  hashedPassword: string,
) => {
  return prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
};

// ═════════════════════════════════════════════════════════════════
// REFRESH TOKEN OPERATIONS
// ═════════════════════════════════════════════════════════════════

/**
 * Save a new refresh token to the database.
 * One user can have many active tokens (multi-device support).
 *
 * @param token     — 256-bit random hex string generated in auth.service.ts
 * @param userId    — the user this session belongs to
 * @param expiresAt — 7 days from now (set in auth.service.ts)
 */
export const createRefreshToken = async (data: {
  token: string;
  userId: string;
  expiresAt: Date;
}) => {
  return prisma.refreshToken.create({ data });
};

/**
 * Find a refresh token row by its token string.
 * Includes the related user so the service can issue a new access token.
 *
 * The @@index([token]) on the model makes this lookup O(1) at scale.
 */
export const findRefreshToken = async (token: string) => {
  return prisma.refreshToken.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          isVerified: true,
        },
      },
    },
  });
};

/**
 * Revoke a single refresh token (logout from one device).
 * Sets isRevoked = true instead of deleting — keeps an audit trail.
 */
export const revokeRefreshToken = async (token: string) => {
  return prisma.refreshToken.update({
    where: { token },
    data: { isRevoked: true },
  });
};

/**
 * Revoke ALL refresh tokens for a user (logout from all devices).
 * Called after a password reset to force re-authentication everywhere.
 */
export const revokeAllRefreshTokens = async (userId: string) => {
  return prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
};

/**
 * Delete expired or revoked tokens to keep the table clean.
 * Call this from a nightly cron job (e.g., reminder.cron.ts or a dedicated cleanup job).
 *
 * Usage:
 *   await cleanupExpiredRefreshTokens();
 */
export const cleanupExpiredRefreshTokens = async () => {
  return prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } }, // already expired
        { isRevoked: true }, // already revoked
      ],
    },
  });
};

// ═════════════════════════════════════════════════════════════════
// EMAIL VERIFICATION OPERATIONS
// ═════════════════════════════════════════════════════════════════

/**
 * Create a new email verification OTP row.
 * Any previous OTP for this user is deleted first (in auth.service.ts)
 * to prevent multiple valid OTPs existing at the same time.
 */
export const createEmailVerification = async (data: {
  otp: string;
  userId: string;
  expiresAt: Date;
}) => {
  return prisma.emailVerification.create({ data });
};

/**
 * Find the most recent (first) email verification row for a user.
 * Ordered by createdAt desc to handle any edge cases with multiple rows.
 */
export const findEmailVerification = async (userId: string) => {
  return prisma.emailVerification.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Delete ALL email verification rows for a user.
 * Called on:
 *   1. Successful verification (cleanup after success)
 *   2. Resend (delete old OTP before creating a new one)
 */
export const deleteEmailVerifications = async (userId: string) => {
  return prisma.emailVerification.deleteMany({ where: { userId } });
};

// ═════════════════════════════════════════════════════════════════
// PASSWORD RESET OPERATIONS
// ═════════════════════════════════════════════════════════════════

/**
 * Create a password reset token row.
 * Any existing reset token for this user is deleted first (in auth.service.ts).
 */
export const createPasswordReset = async (data: {
  token: string;
  userId: string;
  expiresAt: Date;
}) => {
  return prisma.passwordReset.create({ data });
};

/**
 * Find a password reset row by its token.
 * The @@index([token]) makes this an O(1) lookup.
 */
export const findPasswordReset = async (token: string) => {
  return prisma.passwordReset.findUnique({
    where: { token },
    include: {
      user: {
        select: { id: true, email: true },
      },
    },
  });
};

/**
 * Delete ALL password reset rows for a user.
 * Called after successful reset and on new forgot-password requests.
 */
export const deletePasswordResets = async (userId: string) => {
  return prisma.passwordReset.deleteMany({ where: { userId } });
};
