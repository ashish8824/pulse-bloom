import { prisma } from "../../config/db";
import { MilestoneType } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────
// MILESTONE REPOSITORY
// The only layer that directly queries the Milestone table.
// No business logic — only typed, efficient DB operations.
// ─────────────────────────────────────────────────────────────────

/**
 * Check whether a milestone has already been awarded.
 *
 * We check before trying to award so the happy path (already exists)
 * is a clean early-return rather than catching a P2002 error.
 * The @@unique constraint is still the DB-level safety net for races.
 *
 * habitId is null for mood / account milestones.
 */
export const findMilestone = async (
  userId: string,
  type: MilestoneType,
  habitId?: string | null,
) => {
  return prisma.milestone.findFirst({
    where: {
      userId,
      type,
      habitId: habitId ?? null,
    },
  });
};

/**
 * Insert a milestone row, idempotent via upsert.
 *
 * Why upsert instead of create?
 * Two concurrent requests (e.g. rapid double-tap on complete) could
 * both pass the findMilestone check simultaneously and then race to
 * insert. upsert absorbs this: second caller hits the update branch
 * which is a no-op (we don't overwrite achievedAt).
 */
export const awardMilestone = async (data: {
  userId: string;
  type: MilestoneType;
  habitId?: string | null;
  value?: number | null;
}) => {
  return prisma.milestone.upsert({
    where: {
      userId_type_habitId: {
        userId: data.userId,
        type: data.type,
        habitId: data.habitId ?? null,
      },
    },
    update: {}, // no-op — keep original achievedAt
    create: {
      userId: data.userId,
      type: data.type,
      habitId: data.habitId ?? null,
      value: data.value ?? null,
    },
  });
};

/**
 * Fetch all milestones for a user, newest first.
 */
export const getMilestonesByUser = async (userId: string) => {
  return prisma.milestone.findMany({
    where: { userId },
    orderBy: { achievedAt: "desc" },
  });
};

/**
 * Fetch distinct habitIds referenced by a user's milestones.
 * Used by the timeline service to batch-load habit titles in one query.
 */
export const getHabitIdsFromMilestones = async (
  userId: string,
): Promise<string[]> => {
  const rows = await prisma.milestone.findMany({
    where: { userId, habitId: { not: null } },
    select: { habitId: true },
    distinct: ["habitId"],
  });
  return rows.map((r) => r.habitId!);
};

/**
 * Fetch habit titles by ID list.
 * Returns a map of { habitId → title } for O(1) enrichment.
 */
export const getHabitTitlesByIds = async (
  habitIds: string[],
): Promise<Record<string, string>> => {
  if (habitIds.length === 0) return {};
  const habits = await prisma.habit.findMany({
    where: { id: { in: habitIds } },
    select: { id: true, title: true },
  });
  return Object.fromEntries(habits.map((h) => [h.id, h.title]));
};

/**
 * Count total mood entries for a user.
 * Used to detect FIRST_MOOD_ENTRY milestone (count === 1 after insert).
 */
export const countMoodEntries = async (userId: string): Promise<number> => {
  return prisma.moodEntry.count({ where: { userId } });
};

/**
 * Fetch weekly mood averages for a user (all time).
 * Used to check BEST_WEEK_MOOD: if the current week's average
 * is the highest ever recorded, award the milestone.
 *
 * Returns rows ordered by weekStart ASC.
 */
export const getWeeklyMoodAverages = async (
  userId: string,
): Promise<{ weekStart: Date; avg: number; count: number }[]> => {
  // Raw query: group by ISO week start (Monday midnight UTC)
  // date_trunc('week', ...) in Postgres returns Monday 00:00:00 UTC
  const rows = await prisma.$queryRaw<
    { week_start: Date; avg: number; count: bigint }[]
  >`
    SELECT
      date_trunc('week', "createdAt" AT TIME ZONE 'UTC') AS week_start,
      AVG("moodScore")::float                             AS avg,
      COUNT(*)                                            AS count
    FROM "MoodEntry"
    WHERE "userId" = ${userId}
    GROUP BY week_start
    ORDER BY week_start ASC
  `;

  return rows.map((r) => ({
    weekStart: r.week_start,
    avg: parseFloat(r.avg.toFixed(2)),
    count: Number(r.count),
  }));
};
