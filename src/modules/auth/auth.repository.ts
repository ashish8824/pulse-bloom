// src/modules/auth/auth.repository.ts

import { prisma } from "../../config/db";

// ═════════════════════════════════════════════════════════════════
// USER OPERATIONS
// ═════════════════════════════════════════════════════════════════

export const createUser = async (data: {
  email: string;
  password: string;
  name: string;
}) => {
  return prisma.user.create({ data });
};

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      isVerified: true,
      plan: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const findUserById = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      // ── Engagement preferences ─────────────────────────────────
      // Returned by GET /api/auth/me so the frontend can
      // pre-populate the preferences toggles without a separate call.
      weeklyDigestOn: true,
      moodReminderOn: true,
      moodReminderTime: true,
      plan: true,
    },
  });
};

export const markUserVerified = async (userId: string) => {
  return prisma.user.update({
    where: { id: userId },
    data: { isVerified: true },
    select: {
      id: true,
      email: true,
      name: true,
      isVerified: true,
      plan: true,
    },
  });
};

export const updateUserPassword = async (
  userId: string,
  hashedPassword: string,
) => {
  return prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
};

// ─────────────────────────────────────────────────────────────────
// UPDATE USER PREFERENCES  ← NEW
//
// Used by PATCH /api/auth/me/preferences.
//
// Only the fields explicitly passed are updated (partial update).
// Prisma skips undefined fields automatically — no need to merge
// the existing row in the service layer.
//
// Valid fields:
//   weeklyDigestOn   — opt-in/out of Saturday 8am email digest
//   moodReminderOn   — toggle mood reminder without clearing the time
//   moodReminderTime — "HH:MM" for daily mood nudge (null = clear it)
// ─────────────────────────────────────────────────────────────────
export const updateUserPreferences = async (
  userId: string,
  data: {
    weeklyDigestOn?: boolean;
    moodReminderOn?: boolean;
    moodReminderTime?: string | null; // null explicitly clears the stored time
  },
) => {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      weeklyDigestOn: true,
      moodReminderOn: true,
      moodReminderTime: true,
    },
  });
};

// ─────────────────────────────────────────────────────────────────
// FIND USERS FOR WEEKLY DIGEST  ← NEW
//
// Called by the weekly digest cron job (Saturday 8am).
//
// Returns only the fields needed to build the digest email.
// We avoid selecting password or any sensitive field.
//
// The plan field is included so the cron can skip free users
// if we ever want to gate the digest behind a plan tier.
// (Currently it's available to everyone — weeklyDigestOn defaults true.)
// ─────────────────────────────────────────────────────────────────
export const findUsersForWeeklyDigest = async () => {
  return prisma.user.findMany({
    where: {
      weeklyDigestOn: true,
      isVerified: true, // never send to unverified accounts
    },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
    },
  });
};

// ═════════════════════════════════════════════════════════════════
// REFRESH TOKEN OPERATIONS
// ═════════════════════════════════════════════════════════════════

export const createRefreshToken = async (data: {
  token: string;
  userId: string;
  expiresAt: Date;
}) => {
  return prisma.refreshToken.create({ data });
};

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

export const revokeRefreshToken = async (token: string) => {
  return prisma.refreshToken.update({
    where: { token },
    data: { isRevoked: true },
  });
};

export const revokeAllRefreshTokens = async (userId: string) => {
  return prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
};

export const cleanupExpiredRefreshTokens = async () => {
  return prisma.refreshToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { isRevoked: true }],
    },
  });
};

// ═════════════════════════════════════════════════════════════════
// EMAIL VERIFICATION OPERATIONS
// ═════════════════════════════════════════════════════════════════

export const createEmailVerification = async (data: {
  otp: string;
  userId: string;
  expiresAt: Date;
}) => {
  return prisma.emailVerification.create({ data });
};

export const findEmailVerification = async (userId: string) => {
  return prisma.emailVerification.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

export const deleteEmailVerifications = async (userId: string) => {
  return prisma.emailVerification.deleteMany({ where: { userId } });
};

// ═════════════════════════════════════════════════════════════════
// PASSWORD RESET OPERATIONS
// ═════════════════════════════════════════════════════════════════

export const createPasswordReset = async (data: {
  token: string;
  userId: string;
  expiresAt: Date;
}) => {
  return prisma.passwordReset.create({ data });
};

export const findPasswordReset = async (token: string) => {
  return prisma.passwordReset.findUnique({
    where: { token },
    include: {
      user: { select: { id: true, email: true } },
    },
  });
};

export const deletePasswordResets = async (userId: string) => {
  return prisma.passwordReset.deleteMany({ where: { userId } });
};
