// src/modules/challenges/challenge.service.ts
//
// BUSINESS LOGIC LAYER — challenges.
//
// ─────────────────────────────────────────────────────────────────
// DESIGN DECISIONS:
//
//   joinCode generation: crypto.randomBytes(4).toString("hex") →
//     8 hex chars (e.g. "a3f9e201"). Lowercase, URL-safe, fits in a
//     SMS or chat message. Not a security token — just a friendly code.
//
//   Creator auto-join: when you create a challenge you're automatically
//     participant #1. This means your own habit completions count toward
//     the challenge immediately and you appear on the leaderboard.
//
//   Progress auto-advance: completeHabit() calls
//     advanceChallengeProgressForHabit() as a fire-and-forget side
//     effect. No user action needed — completing the habit advances
//     all linked active challenges automatically.
//
//   Completion notification: when a participant hits targetDays,
//     a CHALLENGE_UPDATE notification fires automatically.
// ─────────────────────────────────────────────────────────────────

import crypto from "crypto";
import {
  createChallengeRecord,
  getPublicChallenges,
  getChallengesByCreator,
  findChallengeById,
  findChallengeByJoinCode,
  addParticipant,
  getParticipation,
  incrementParticipantProgress,
  getChallengeLeaderboard,
  getUserJoinedChallenges,
  getActiveChallengesForHabit,
} from "./challenge.repository";
import { CreateChallengeInput } from "./challenge.validation";
import { createNotification } from "../notifications/notification.service";

// ─────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────

/**
 * Create a new challenge and auto-join the creator as participant #1.
 *
 * endDate is computed as startDate + targetDays (midnight UTC).
 * joinCode is an 8-char hex string — unique at DB level.
 */
export const createChallenge = async (
  data: CreateChallengeInput,
  userId: string,
) => {
  const joinCode = crypto.randomBytes(4).toString("hex").toUpperCase();

  // endDate = startDate + targetDays in milliseconds
  const endDate = new Date(
    data.startDate.getTime() + data.targetDays * 24 * 60 * 60 * 1000,
  );

  const challenge = await createChallengeRecord({
    title: data.title,
    description: data.description,
    habitId: data.habitId,
    targetDays: data.targetDays,
    startDate: data.startDate,
    endDate,
    isPublic: data.isPublic,
    joinCode,
    createdBy: userId,
  });

  // Auto-join creator as participant #1
  await addParticipant(challenge.id, userId);

  return { ...challenge, participantCount: 1 };
};

// ─────────────────────────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/challenges — public challenge discovery feed.
 * Returns paginated public challenges with participant counts.
 * Sorted newest first.
 */
export const listPublicChallenges = async (
  page: number,
  limit: number,
  activeOnly?: boolean,
) => {
  const { challenges, total } = await getPublicChallenges(
    page,
    limit,
    activeOnly,
  );

  return {
    challenges: challenges.map((c) => ({
      ...c,
      participantCount: c._count.participants,
      _count: undefined, // don't expose Prisma internals
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * GET /api/challenges/mine — challenges created by the authenticated user.
 * Includes joinCode so the creator can share private challenges.
 */
export const getMyChallenges = async (userId: string) => {
  return getChallengesByCreator(userId);
};

/**
 * GET /api/challenges/joined — challenges the user has joined.
 * Includes progress toward completion.
 */
export const getJoinedChallenges = async (userId: string) => {
  const participations = await getUserJoinedChallenges(userId);

  return participations.map((p) => ({
    ...p.challenge,
    progress: {
      completionsCount: p.completionsCount,
      targetDays: p.challenge.targetDays,
      progressPct: Math.min(
        100,
        Math.round((p.completionsCount / p.challenge.targetDays) * 100),
      ),
      isCompleted: p.isCompleted,
      completedAt: p.completedAt,
    },
    joinedAt: p.joinedAt,
  }));
};

// ─────────────────────────────────────────────────────────────────
// JOIN
// ─────────────────────────────────────────────────────────────────

/**
 * Join a challenge by ID (public challenges) or joinCode (private).
 *
 * Rules:
 * - Cannot join an inactive (ended) challenge
 * - Cannot join twice — @@unique constraint + service-level check
 * - Joining your own challenge is allowed (creator is already auto-joined
 *   at creation; this call becomes a no-op that returns 409)
 */
export const joinChallenge = async (
  challengeId: string,
  userId: string,
  joinCode?: string,
) => {
  // Find the challenge
  const challenge = joinCode
    ? await findChallengeByJoinCode(joinCode)
    : await findChallengeById(challengeId);

  if (!challenge) {
    const err = new Error("Challenge not found") as any;
    err.statusCode = 404;
    throw err;
  }

  if (!challenge.isActive) {
    const err = new Error(
      "This challenge has ended and is no longer accepting participants",
    ) as any;
    err.statusCode = 400;
    throw err;
  }

  // Check already joined
  const existing = await getParticipation(challenge.id, userId);
  if (existing) {
    const err = new Error("You have already joined this challenge") as any;
    err.statusCode = 409;
    throw err;
  }

  await addParticipant(challenge.id, userId);

  return {
    message: `You joined "${challenge.title}"! Complete ${challenge.targetDays} days to finish.`,
    challengeId: challenge.id,
    targetDays: challenge.targetDays,
  };
};

// ─────────────────────────────────────────────────────────────────
// PROGRESS
// ─────────────────────────────────────────────────────────────────

/**
 * Manually mark a challenge day as complete.
 * Used for challenges without a linked habit (free-form challenges).
 * For habit-linked challenges, progress advances automatically via
 * advanceChallengeProgressForHabit() called from completeHabit().
 */
export const markChallengeComplete = async (
  challengeId: string,
  userId: string,
) => {
  const challenge = await findChallengeById(challengeId);

  if (!challenge) {
    const err = new Error("Challenge not found") as any;
    err.statusCode = 404;
    throw err;
  }

  const participation = await getParticipation(challengeId, userId);
  if (!participation) {
    const err = new Error("You are not a participant in this challenge") as any;
    err.statusCode = 403;
    throw err;
  }

  if (participation.isCompleted) {
    return {
      message: "You have already completed this challenge!",
      alreadyCompleted: true,
      completedAt: participation.completedAt,
    };
  }

  const updated = await incrementParticipantProgress(
    challengeId,
    userId,
    challenge.targetDays,
  );

  // Fire completion notification if just finished
  if (updated.isCompleted && !participation.isCompleted) {
    void createNotification({
      userId,
      type: "CHALLENGE_UPDATE",
      title: `🎉 Challenge Complete: ${challenge.title}`,
      message: `You completed all ${challenge.targetDays} days! Great work.`,
      relatedId: challengeId,
    });
  }

  return {
    completionsCount: updated.completionsCount,
    targetDays: challenge.targetDays,
    progressPct: Math.min(
      100,
      Math.round((updated.completionsCount / challenge.targetDays) * 100),
    ),
    isCompleted: updated.isCompleted,
    completedAt: updated.completedAt ?? null,
  };
};

/**
 * Advance challenge progress when a habit is completed.
 * Called as fire-and-forget from habit.service.ts:
 *
 *   void advanceChallengeProgressForHabit(habitId, userId);
 *
 * Finds all active challenges linked to this habit where the user
 * is a participant, then increments each one.
 */
export const advanceChallengeProgressForHabit = async (
  habitId: string,
  userId: string,
): Promise<void> => {
  try {
    const linkedChallenges = await getActiveChallengesForHabit(habitId, userId);

    for (const challenge of linkedChallenges) {
      const updated = await incrementParticipantProgress(
        challenge.id,
        userId,
        challenge.targetDays,
      );

      // Notify on completion
      if (updated.isCompleted) {
        void createNotification({
          userId,
          type: "CHALLENGE_UPDATE",
          title: "🎉 Challenge Complete!",
          message: `You finished a linked habit challenge.`,
          relatedId: challenge.id,
        });
      }
    }
  } catch {
    // Fire-and-forget — never propagates
  }
};

// ─────────────────────────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/challenges/:id/leaderboard
 * Returns ranked participants sorted by completionsCount DESC.
 * Adds a `rank` field (1-indexed) so the frontend doesn't need to compute it.
 */
export const getLeaderboard = async (
  challengeId: string,
  requestingUserId: string,
) => {
  const challenge = await findChallengeById(challengeId);

  if (!challenge) {
    const err = new Error("Challenge not found") as any;
    err.statusCode = 404;
    throw err;
  }

  // Non-participants can view public challenge leaderboards
  if (!challenge.isPublic) {
    const participation = await getParticipation(challengeId, requestingUserId);
    if (!participation) {
      const err = new Error(
        "This is a private challenge — join to view the leaderboard",
      ) as any;
      err.statusCode = 403;
      throw err;
    }
  }

  const participants = await getChallengeLeaderboard(challengeId);

  return {
    challengeId,
    challengeTitle: challenge.title,
    targetDays: challenge.targetDays,
    totalParticipants: participants.length,
    leaderboard: participants.map((p, index) => ({
      rank: index + 1,
      name: p.user.name,
      completionsCount: p.completionsCount,
      progressPct: Math.min(
        100,
        Math.round((p.completionsCount / challenge.targetDays) * 100),
      ),
      isCompleted: p.isCompleted,
      completedAt: p.completedAt,
      isMe: p.userId === requestingUserId, // helps frontend highlight the user's own row
    })),
  };
};
