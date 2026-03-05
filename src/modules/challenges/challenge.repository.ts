// src/modules/challenges/challenge.repository.ts
//
// DB LAYER — all Prisma queries for challenges and participants.

import { prisma } from "../../config/db";

// ─────────────────────────────────────────────────────────────────
// CHALLENGE QUERIES
// ─────────────────────────────────────────────────────────────────

/**
 * Create a challenge record.
 * joinCode is pre-generated in the service (crypto.randomBytes).
 * Creator is auto-added as a participant in the service after creation.
 */
export const createChallengeRecord = async (data: {
  title: string;
  description?: string;
  habitId?: string;
  targetDays: number;
  startDate: Date;
  endDate: Date;
  isPublic: boolean;
  joinCode: string;
  createdBy: string;
}) => {
  return prisma.challenge.create({ data });
};

/**
 * Paginated list of public, active challenges.
 * Sorted by most recently created — newest challenges are most relevant.
 * Includes participant count so the frontend can show "12 joined".
 */
export const getPublicChallenges = async (
  page: number,
  limit: number,
  activeOnly?: boolean,
) => {
  const where: any = { isPublic: true };
  if (activeOnly !== undefined) where.isActive = activeOnly;

  const [challenges, total] = await Promise.all([
    prisma.challenge.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        habitId: true,
        targetDays: true,
        startDate: true,
        endDate: true,
        isPublic: true,
        isActive: true,
        createdBy: true,
        createdAt: true,
        _count: { select: { participants: true } },
      },
    }),
    prisma.challenge.count({ where }),
  ]);

  return { challenges, total };
};

/**
 * Get all challenges created by a user.
 * Includes participant count and participation status for the creator.
 */
export const getChallengesByCreator = async (userId: string) => {
  return prisma.challenge.findMany({
    where: { createdBy: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      targetDays: true,
      startDate: true,
      endDate: true,
      isPublic: true,
      isActive: true,
      joinCode: true, // creator can see their own join code
      createdAt: true,
      _count: { select: { participants: true } },
    },
  });
};

/**
 * Get a single challenge by ID.
 * Used by join, complete, leaderboard endpoints.
 */
export const findChallengeById = async (id: string) => {
  return prisma.challenge.findUnique({
    where: { id },
    include: { _count: { select: { participants: true } } },
  });
};

/**
 * Find a private challenge by its joinCode.
 * Used by POST /api/challenges/join { joinCode: "ABCD1234" }
 */
export const findChallengeByJoinCode = async (joinCode: string) => {
  return prisma.challenge.findUnique({ where: { joinCode } });
};

// ─────────────────────────────────────────────────────────────────
// PARTICIPANT QUERIES
// ─────────────────────────────────────────────────────────────────

/**
 * Add a user to a challenge.
 * Called when a user joins a public challenge or uses a join code.
 * The challenge creator is also added via this function at creation time.
 */
export const addParticipant = async (challengeId: string, userId: string) => {
  return prisma.challengeParticipant.create({
    data: { challengeId, userId },
  });
};

/**
 * Check if a user is already participating in a challenge.
 * Used before join to prevent duplicate entries (supplements DB constraint).
 */
export const getParticipation = async (challengeId: string, userId: string) => {
  return prisma.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId, userId } },
  });
};

/**
 * Increment completionsCount for a participant.
 * Called when:
 *   (a) the linked habit is completed (from completeHabit hook)
 *   (b) user manually marks a day complete (POST /:id/complete)
 *
 * Also checks if completionsCount >= targetDays to set isCompleted.
 * Returns the updated participant record.
 */
export const incrementParticipantProgress = async (
  challengeId: string,
  userId: string,
  targetDays: number,
) => {
  // Increment count first
  const updated = await prisma.challengeParticipant.update({
    where: { challengeId_userId: { challengeId, userId } },
    data: { completionsCount: { increment: 1 } },
  });

  // Check if challenge is now complete
  if (!updated.isCompleted && updated.completionsCount >= targetDays) {
    return prisma.challengeParticipant.update({
      where: { challengeId_userId: { challengeId, userId } },
      data: { isCompleted: true, completedAt: new Date() },
    });
  }

  return updated;
};

/**
 * Get leaderboard for a challenge.
 * Sorted by completionsCount DESC, then completedAt ASC (who finished first wins ties).
 * Includes display name for the frontend leaderboard.
 */
export const getChallengeLeaderboard = async (challengeId: string) => {
  return prisma.challengeParticipant.findMany({
    where: { challengeId },
    orderBy: [
      { completionsCount: "desc" },
      { completedAt: "asc" }, // earlier completion = higher rank on tie
    ],
    select: {
      userId: true,
      completionsCount: true,
      isCompleted: true,
      completedAt: true,
      joinedAt: true,
      user: {
        select: { name: true }, // only name — no email or sensitive fields
      },
    },
  });
};

/**
 * Get all challenges a user has joined (not created).
 * Includes progress info for the "My Challenges" screen.
 */
export const getUserJoinedChallenges = async (userId: string) => {
  return prisma.challengeParticipant.findMany({
    where: { userId },
    orderBy: { joinedAt: "desc" },
    select: {
      completionsCount: true,
      isCompleted: true,
      completedAt: true,
      joinedAt: true,
      challenge: {
        select: {
          id: true,
          title: true,
          description: true,
          targetDays: true,
          startDate: true,
          endDate: true,
          isActive: true,
          habitId: true,
        },
      },
    },
  });
};

/**
 * Get all active challenges linked to a specific habit.
 * Called from completeHabit() to find challenges that should be progressed.
 * Only returns challenges where the user is a participant.
 */
export const getActiveChallengesForHabit = async (
  habitId: string,
  userId: string,
) => {
  return prisma.challenge.findMany({
    where: {
      habitId,
      isActive: true,
      participants: {
        some: { userId },
      },
    },
    select: {
      id: true,
      targetDays: true,
    },
  });
};
