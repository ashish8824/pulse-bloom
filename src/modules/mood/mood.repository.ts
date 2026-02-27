import { prisma } from "../../config/db";

// ─────────────────────────────────────────────────────────────────
// MOOD REPOSITORY
// The only layer that directly queries the database.
// No business logic — only typed, efficient DB operations.
// ─────────────────────────────────────────────────────────────────

// ─── SHARED HELPER ────────────────────────────────────────────────

/**
 * Builds the reusable Prisma `where` clause for mood queries.
 * Centralised here so date-range logic never drifts across functions.
 *
 * endDate is end-of-day inclusive (23:59:59.999) so that passing
 * "2026-02-28" includes all entries logged on that day.
 */
const buildWhereClause = (
  userId: string,
  startDate?: string,
  endDate?: string,
) => {
  const where: {
    userId: string;
    createdAt?: { gte?: Date; lte?: Date };
  } = { userId };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  return where;
};

// ─── WRITE ────────────────────────────────────────────────────────

/**
 * Insert a new MoodEntry row.
 * journalId is the MongoDB ObjectId string — null if no journal was saved.
 */
export const createMoodEntry = async (data: {
  moodScore: number;
  emoji: string;
  journalId?: string;
  userId: string;
}) => {
  return prisma.moodEntry.create({ data });
};

/**
 * Partially update a MoodEntry.
 * Only the fields present in `data` are changed — Prisma ignores undefined keys.
 */
export const updateMoodEntryRecord = async (
  id: string,
  data: {
    moodScore?: number;
    emoji?: string;
    journalId?: string | null; // null = detach the journal reference
  },
) => {
  return prisma.moodEntry.update({ where: { id }, data });
};

/**
 * Hard-delete a MoodEntry by id.
 * The calling service is responsible for cleaning up the linked
 * MongoDB journal document before calling this.
 */
export const deleteMoodEntryRecord = async (id: string) => {
  return prisma.moodEntry.delete({ where: { id } });
};

// ─── READ — SINGLE ────────────────────────────────────────────────

/**
 * Fetch a single MoodEntry by id.
 * Used for ownership checks before any write operation,
 * and by the GET /api/mood/:id endpoint.
 */
export const findMoodById = async (id: string) => {
  return prisma.moodEntry.findUnique({ where: { id } });
};

// ─── READ — PAGINATED LIST ────────────────────────────────────────

/**
 * Fetch paginated mood entries with optional date filtering.
 * Runs count + findMany concurrently via Promise.all — halves DB round-trip time.
 */
export const getUserMoods = async (
  userId: string,
  page: number,
  limit: number,
  startDate?: string,
  endDate?: string,
) => {
  const skip = (page - 1) * limit;
  const where = buildWhereClause(userId, startDate, endDate);

  const [data, total] = await Promise.all([
    prisma.moodEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.moodEntry.count({ where }),
  ]);

  return { data, total };
};

// ─── READ — ANALYTICS (LEAN) ──────────────────────────────────────

/**
 * Fetch only moodScore + createdAt for analytics calculations.
 *
 * Why a lean select?
 * Analytics never needs emoji, journalId, or id.
 * Over large date ranges this meaningfully reduces memory and bandwidth.
 *
 * Requires schema indexes: @@index([userId]) + @@index([userId, createdAt])
 */
export const getMoodScores = async (
  userId: string,
  startDate?: string,
  endDate?: string,
): Promise<{ moodScore: number; createdAt: Date }[]> => {
  const where = buildWhereClause(userId, startDate, endDate);

  return prisma.moodEntry.findMany({
    where,
    select: { moodScore: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
};

// ─── READ — STREAK ────────────────────────────────────────────────

/**
 * Fetch distinct calendar dates on which the user logged a mood.
 * Returns dates in DESC order (most recent first) for streak walking.
 *
 * Uses a raw select of just `createdAt` — streak only needs to know
 * which days had at least one entry, not the scores.
 */
export const getMoodLogDates = async (
  userId: string,
): Promise<{ createdAt: Date }[]> => {
  return prisma.moodEntry.findMany({
    where: { userId },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });
};

// ─── READ — HEATMAP ───────────────────────────────────────────────

/**
 * Fetch mood entries within a date range for heatmap generation.
 * Returns only date + score — the heatmap maps score → colour intensity.
 */
export const getMoodScoresInRange = async (
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

// ─── READ — MONTHLY SUMMARY ───────────────────────────────────────

/**
 * Fetch all mood entries for a given calendar month.
 * Returns date + score for calendar day rendering.
 */
export const getMoodEntriesForMonth = async (
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

// ─── READ — DAY-OF-WEEK / TIME-OF-DAY PATTERN ────────────────────

/**
 * Fetch score + timestamp for day-of-week and time-of-day pattern analysis.
 * Needs full createdAt (not just date) so we can extract the hour.
 * Returns data for up to the last 90 days by default for meaningful signal.
 */
export const getMoodScoresWithTimestamp = async (
  userId: string,
  startDate?: string,
  endDate?: string,
): Promise<{ moodScore: number; createdAt: Date }[]> => {
  const where = buildWhereClause(userId, startDate, endDate);

  return prisma.moodEntry.findMany({
    where,
    select: { moodScore: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
};
