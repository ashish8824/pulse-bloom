import { prisma } from "../../config/db";

// ─────────────────────────────────────────────────────────────────
// ANALYTICS REPOSITORY
// Queries that span multiple modules (mood + habits) for cross-module analytics.
// Kept separate from mood.repository and habit.repository to respect
// module boundaries while providing the joined data analytics needs.
// ─────────────────────────────────────────────────────────────────

/**
 * Fetch all mood scores with their UTC date for a user within a date range.
 * Returns only the two fields analytics needs — lean select for performance.
 */
export const getMoodScoresForCorrelation = async (
  userId: string,
  from: Date,
  to: Date,
): Promise<{ moodScore: number; createdAt: Date }[]> => {
  return prisma.moodEntry.findMany({
    where: {
      userId,
      createdAt: { gte: from, lte: to },
    },
    select: { moodScore: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
};

/**
 * Fetch all active (non-archived) habits for a user.
 * Only id, title, frequency — all analytics needs for grouping.
 */
export const getActiveHabitsForUser = async (
  userId: string,
): Promise<{ id: string; title: string; frequency: string }[]> => {
  return prisma.habit.findMany({
    where: { userId, isArchived: false },
    select: { id: true, title: true, frequency: true },
    orderBy: { sortOrder: "asc" },
  });
};

/**
 * Fetch completion log dates for a specific habit within a date range.
 * Returns only `date` — we only need to know which periods were completed.
 */
export const getHabitLogDatesInRange = async (
  habitId: string,
  from: Date,
  to: Date,
): Promise<{ date: Date }[]> => {
  return prisma.habitLog.findMany({
    where: {
      habitId,
      date: { gte: from, lte: to },
    },
    select: { date: true },
    orderBy: { date: "asc" },
  });
};

/**
 * Fetch ALL habit logs for ALL of a user's active habits in one query.  ← NEW (#10)
 *
 * Why one query instead of N queries (one per habit)?
 * The correlation matrix needs logs for every habit pair. With N habits
 * that would be N individual queries. A single JOIN query is far more
 * efficient — one DB round-trip regardless of how many habits the user has.
 *
 * Returns habitId + date so the service can build per-habit date Sets
 * without any further DB calls.
 *
 * The nested `habit` filter ensures we only get logs belonging to this
 * user's active habits — no cross-user data leaks even though HabitLog
 * has no direct userId column.
 */
export const getAllHabitLogsInRange = async (
  userId: string,
  from: Date,
  to: Date,
): Promise<{ habitId: string; date: Date }[]> => {
  return prisma.habitLog.findMany({
    where: {
      date: { gte: from, lte: to },
      habit: {
        userId,
        isArchived: false,
      },
    },
    select: { habitId: true, date: true },
    orderBy: { date: "asc" },
  });
};
