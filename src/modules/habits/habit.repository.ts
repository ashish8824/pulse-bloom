import { prisma } from "../../config/db";

// ─────────────────────────────────────────────────────────────────
// REPOSITORY LAYER
// The ONLY place that talks to the database.
// No business logic here — just raw, typed DB operations.
// ─────────────────────────────────────────────────────────────────

// ─── HABIT CRUD ───────────────────────────────────────────────────

/**
 * Insert a new habit row.
 * Accepts all optional new fields (category, color, icon, etc.)
 */
export const createHabitRecord = async (data: {
  title: string;
  description?: string;
  frequency: "daily" | "weekly";
  category?: string;
  color?: string;
  icon?: string;
  targetPerWeek?: number;
  reminderTime?: string;
  reminderOn?: boolean;
  userId: string;
}) => {
  return prisma.habit.create({ data });
};

/**
 * Find a single habit by primary key.
 * Used before every write operation for ownership verification.
 */
export const findHabitById = async (habitId: string) => {
  return prisma.habit.findUnique({ where: { id: habitId } });
};

/**
 * Check for an existing active habit with the same title+frequency for this user.
 *
 * mode: "insensitive" = case-insensitive ("Meditation" == "meditation")
 * excludeId: used during PATCH to skip checking the habit being edited
 */
export const findDuplicateHabit = async (
  userId: string,
  title: string,
  frequency: "daily" | "weekly",
  excludeId?: string,
) => {
  return prisma.habit.findFirst({
    where: {
      userId,
      frequency,
      isArchived: false,
      title: { equals: title, mode: "insensitive" },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
};

/**
 * Fetch all active (non-archived) habits for a user.
 * Ordered by sortOrder ASC so user-defined order is respected,
 * then by createdAt DESC as a tiebreaker for new habits.
 */
export const getHabitsByUser = async (userId: string) => {
  return prisma.habit.findMany({
    where: { userId, isArchived: false },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
};

/**
 * Fetch all archived habits for a user.
 * Used by GET /api/habits/archived — separate from active habits list.
 */
export const getArchivedHabitsByUser = async (userId: string) => {
  return prisma.habit.findMany({
    where: { userId, isArchived: true },
    orderBy: { updatedAt: "desc" }, // most recently archived first
  });
};

/**
 * Fetch habits filtered by category.
 * Used by GET /api/habits?category=health
 */
export const getHabitsByCategory = async (userId: string, category: string) => {
  return prisma.habit.findMany({
    where: { userId, isArchived: false, category: category as any },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
};

/**
 * Update mutable fields on a habit.
 * Prisma ignores undefined keys — only present fields are changed.
 * updatedAt is auto-updated by Prisma (@updatedAt in schema).
 */
export const updateHabitRecord = async (
  habitId: string,
  data: {
    title?: string;
    description?: string;
    frequency?: "daily" | "weekly";
    category?: string;
    color?: string | null;
    icon?: string | null;
    targetPerWeek?: number | null;
    reminderTime?: string | null;
    reminderOn?: boolean;
    sortOrder?: number;
  },
) => {
  return prisma.habit.update({ where: { id: habitId }, data });
};

/**
 * Soft-delete: flip isArchived to true.
 * Preserves all HabitLog history — hard delete would cascade-destroy it.
 */
export const archiveHabitRecord = async (habitId: string) => {
  return prisma.habit.update({
    where: { id: habitId },
    data: { isArchived: true },
  });
};

/**
 * Restore: flip isArchived back to false.
 * Brings the habit back to the active list with all history intact.
 */
export const restoreHabitRecord = async (habitId: string) => {
  return prisma.habit.update({
    where: { id: habitId },
    data: { isArchived: false },
  });
};

/**
 * Bulk-update sortOrder for multiple habits in a single transaction.
 *
 * Why a transaction:
 * Reordering requires updating multiple rows atomically.
 * If one update fails mid-way, the transaction rolls back all changes,
 * preventing a partially reordered list that would be inconsistent.
 *
 * prisma.$transaction([]) runs all operations in one DB round-trip.
 */
export const bulkUpdateSortOrder = async (
  habits: { id: string; sortOrder: number }[],
) => {
  const updates = habits.map((h) =>
    prisma.habit.update({
      where: { id: h.id },
      data: { sortOrder: h.sortOrder },
    }),
  );

  return prisma.$transaction(updates);
};

/**
 * Fetch all habits that have reminders enabled.
 * Used by the cron job to find habits needing reminder notifications.
 */
export const getHabitsWithReminders = async () => {
  return prisma.habit.findMany({
    where: {
      isArchived: false,
      reminderOn: true,
      reminderTime: { not: null },
    },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  });
};

// ─── HABIT LOG OPERATIONS ────────────────────────────────────────

/**
 * Insert a completion log.
 * The @@unique([habitId, date]) constraint catches duplicates at DB level.
 * Service catches P2002 and converts it to a readable error.
 */
export const createHabitLog = async (
  habitId: string,
  date: Date,
  note?: string,
) => {
  return prisma.habitLog.create({
    data: { habitId, date, note },
  });
};

/**
 * Fetch all logs ordered DESC (most recent first).
 * Required for streak calculation — walking backwards from today.
 */
export const getHabitLogs = async (habitId: string) => {
  return prisma.habitLog.findMany({
    where: { habitId },
    orderBy: { date: "desc" },
  });
};

/**
 * Fetch a habit with all its logs ordered ASC (oldest first).
 * Ascending order required for analytics gap-detection.
 */
export const getHabitWithLogs = async (habitId: string) => {
  return prisma.habit.findUnique({
    where: { id: habitId },
    include: {
      logs: { orderBy: { date: "asc" } },
    },
  });
};

/**
 * Delete the most recent log for a habit.
 * Used by "undo last completion" feature.
 *
 * Why findFirst + delete (not deleteMany):
 * We want to remove exactly ONE log (the most recent one).
 * deleteMany would delete all logs matching the where clause.
 * findFirst gets the specific row, then we delete by its unique id.
 */
export const deleteLatestHabitLog = async (habitId: string) => {
  const latest = await prisma.habitLog.findFirst({
    where: { habitId },
    orderBy: { date: "desc" },
  });

  if (!latest) return null;

  return prisma.habitLog.delete({ where: { id: latest.id } });
};

/**
 * Fetch paginated logs for a habit.
 * Returns logs + total count for pagination metadata.
 *
 * Why Promise.all:
 * Runs both queries concurrently instead of sequentially.
 * For large datasets this halves the DB round-trip time.
 */
export const getPaginatedHabitLogs = async (
  habitId: string,
  page: number,
  limit: number,
) => {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.habitLog.findMany({
      where: { habitId },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.habitLog.count({ where: { habitId } }),
  ]);

  return { logs, total };
};

/**
 * Count total completions for a habit.
 * count() is faster than fetching all rows just to call .length
 */
export const countHabitLogs = async (habitId: string): Promise<number> => {
  return prisma.habitLog.count({ where: { habitId } });
};
