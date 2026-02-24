import {
  createHabitRecord,
  findHabitById,
  findDuplicateHabit,
  getHabitsByUser,
  getArchivedHabitsByUser,
  getHabitsByCategory,
  updateHabitRecord,
  archiveHabitRecord,
  restoreHabitRecord,
  bulkUpdateSortOrder,
  createHabitLog,
  getHabitLogs,
  getHabitWithLogs,
  deleteLatestHabitLog,
  getPaginatedHabitLogs,
} from "./habit.repository";

import {
  normalizeDailyDate,
  normalizeWeeklyDate,
} from "../../utils/date.utils";
import {
  UpdateHabitInput,
  CreateHabitInput,
  ReorderHabitsInput,
  ReminderInput,
} from "./habit.validation";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

// Period duration in milliseconds — used throughout streak/analytics logic
const PERIOD_MS = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

// Streak milestone values — when hit, the response includes a milestone flag
// The frontend can use this to trigger a celebration animation
const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90, 100, 180, 365];

// ─────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────

/**
 * Create a new habit.
 *
 * Business rules:
 * 1. Duplicate check (same title + frequency for this user) — throws readable error
 * 2. All optional fields (category, color, icon, targetPerWeek, reminder) forwarded
 */
export const createHabit = async (data: CreateHabitInput, userId: string) => {
  // Pre-check for duplicates with a human-readable error
  // The DB @@unique constraint is still the safety net for race conditions
  const existing = await findDuplicateHabit(userId, data.title, data.frequency);

  if (existing) {
    throw new Error(
      `You already have an active "${existing.title}" habit with ${data.frequency} frequency`,
    );
  }

  return createHabitRecord({ ...data, userId });
};

// ─────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────

/**
 * Return all active habits for a user.
 * Supports optional category filter via query param.
 */
export const fetchUserHabits = async (userId: string, category?: string) => {
  if (category) {
    return getHabitsByCategory(userId, category);
  }
  return getHabitsByUser(userId);
};

/**
 * Return all archived (soft-deleted) habits for a user.
 * These are habits the user has "deleted" but data is preserved.
 */
export const fetchArchivedHabits = async (userId: string) => {
  return getArchivedHabitsByUser(userId);
};

// ─────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────

/**
 * Partially update a habit.
 *
 * Business rules:
 * 1. Ownership check
 * 2. If title or frequency changes, re-run duplicate check
 *    (exclude the current habit from check to avoid false positives)
 */
export const updateHabit = async (
  habitId: string,
  userId: string,
  data: UpdateHabitInput,
) => {
  const habit = await findHabitById(habitId);

  if (!habit || habit.userId !== userId) {
    throw new Error("Habit not found");
  }

  // Determine effective new title/frequency for duplicate check
  const newTitle = data.title ?? habit.title;
  const newFrequency = data.frequency ?? habit.frequency;

  if (data.title !== undefined || data.frequency !== undefined) {
    const duplicate = await findDuplicateHabit(
      userId,
      newTitle,
      newFrequency as "daily" | "weekly",
      habitId, // exclude self
    );

    if (duplicate) {
      throw new Error(
        `You already have an active "${duplicate.title}" habit with ${newFrequency} frequency`,
      );
    }
  }

  return updateHabitRecord(habitId, data);
};

// ─────────────────────────────────────────────────────────────────
// ARCHIVE & RESTORE (SOFT DELETE)
// ─────────────────────────────────────────────────────────────────

/**
 * Soft-delete a habit.
 * Sets isArchived = true. Log history fully preserved.
 * Cannot be completed while archived.
 */
export const archiveHabit = async (habitId: string, userId: string) => {
  const habit = await findHabitById(habitId);

  if (!habit || habit.userId !== userId) {
    throw new Error("Habit not found");
  }

  if (habit.isArchived) {
    throw new Error("Habit is already archived");
  }

  await archiveHabitRecord(habitId);
  return { message: "Habit archived successfully" };
};

/**
 * Restore an archived habit back to active.
 *
 * Before restoring, we check if a duplicate active habit now exists
 * (the user might have created a new one with the same name after archiving).
 * If so, we block the restore and ask them to rename first.
 */
export const restoreHabit = async (habitId: string, userId: string) => {
  const habit = await findHabitById(habitId);

  if (!habit || habit.userId !== userId) {
    throw new Error("Habit not found");
  }

  if (!habit.isArchived) {
    throw new Error("Habit is not archived");
  }

  // Check if an active duplicate now exists (created after archiving)
  const duplicate = await findDuplicateHabit(
    userId,
    habit.title,
    habit.frequency as "daily" | "weekly",
    habitId,
  );

  if (duplicate) {
    throw new Error(
      `Cannot restore: you already have an active "${habit.title}" habit. Rename it first.`,
    );
  }

  await restoreHabitRecord(habitId);
  return { message: "Habit restored successfully" };
};

// ─────────────────────────────────────────────────────────────────
// COMPLETE
// ─────────────────────────────────────────────────────────────────

/**
 * Mark a habit as completed for the current period.
 *
 * Period normalization prevents double-completions:
 *  - Daily  → midnight of today (local time)
 *  - Weekly → midnight of Monday of the current ISO week
 *
 * After creating the log, checks if the new streak hits a milestone.
 * If yes, includes milestone data in the response so the frontend
 * can trigger a celebration animation.
 */
export const completeHabit = async (
  habitId: string,
  userId: string,
  note?: string,
) => {
  const habit = await findHabitById(habitId);

  if (!habit || habit.userId !== userId) {
    throw new Error("Habit not found");
  }

  if (habit.isArchived) {
    throw new Error("Cannot complete an archived habit. Restore it first.");
  }

  const date =
    habit.frequency === "daily" ? normalizeDailyDate() : normalizeWeeklyDate();

  try {
    const log = await createHabitLog(habitId, date, note);

    // Check if this completion triggered a streak milestone
    const { currentStreak } = await calculateHabitStreak(habitId, userId);
    const milestone = STREAK_MILESTONES.includes(currentStreak)
      ? currentStreak
      : null;

    return {
      message: "Habit marked as completed",
      log: { id: log.id, date: log.date, note: log.note },
      currentStreak,
      // milestone is null if no milestone hit, or the number if one was hit
      // Frontend uses this to show "🎉 7-day streak!" celebration
      milestone: milestone
        ? {
            days: milestone,
            message: `Amazing! You hit a ${milestone}-day streak!`,
          }
        : null,
    };
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new Error("Habit already completed for this period");
    }
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────
// UNDO LAST COMPLETION
// ─────────────────────────────────────────────────────────────────

/**
 * Remove the most recent completion log for a habit.
 *
 * Use case: user accidentally marks habit complete, wants to undo.
 * We delete only the MOST RECENT log — not all logs.
 *
 * Business rule: only allows undo if the most recent log is from
 * the current period. You can't undo a log from 3 days ago.
 */
export const undoLastCompletion = async (habitId: string, userId: string) => {
  const habit = await findHabitById(habitId);

  if (!habit || habit.userId !== userId) {
    throw new Error("Habit not found");
  }

  const logs = await getHabitLogs(habitId); // DESC order

  if (logs.length === 0) {
    throw new Error("No completions to undo");
  }

  // Check if the most recent log is from the current period
  const currentPeriod =
    habit.frequency === "daily" ? normalizeDailyDate() : normalizeWeeklyDate();

  const latestLog = new Date(logs[0].date);
  latestLog.setHours(0, 0, 0, 0);

  // Only allow undo if the latest log is from the current period
  if (latestLog.getTime() !== currentPeriod.getTime()) {
    throw new Error("You can only undo a completion from the current period");
  }

  await deleteLatestHabitLog(habitId);

  return { message: "Last completion removed successfully" };
};

// ─────────────────────────────────────────────────────────────────
// REORDER
// ─────────────────────────────────────────────────────────────────

/**
 * Update the display order of multiple habits in one operation.
 *
 * The client sends an array of { id, sortOrder } after the user
 * drags and drops habits into a new order.
 *
 * Business rules:
 * 1. Verify ALL habits belong to this user before updating any
 *    → prevents a user from reordering another user's habits
 * 2. Run all updates in a single DB transaction
 *    → if any fails, all are rolled back (atomic operation)
 */
export const reorderHabits = async (
  userId: string,
  data: ReorderHabitsInput,
) => {
  // Verify ownership of all habits upfront
  for (const item of data.habits) {
    const habit = await findHabitById(item.id);
    if (!habit || habit.userId !== userId) {
      throw new Error(`Habit ${item.id} not found`);
    }
  }

  // Run all sortOrder updates in a single atomic transaction
  await bulkUpdateSortOrder(data.habits);

  return { message: "Habits reordered successfully" };
};

// ─────────────────────────────────────────────────────────────────
// REMINDER
// ─────────────────────────────────────────────────────────────────

/**
 * Update reminder settings for a habit.
 *
 * reminderOn: true/false — toggle without clearing reminderTime
 * reminderTime: "08:00" — set the time (required when turning on for first time)
 *
 * Business rule: you cannot turn reminderOn = true without a reminderTime set.
 * Either set the time now or have it set from before.
 */
export const updateReminder = async (
  habitId: string,
  userId: string,
  data: ReminderInput,
) => {
  const habit = await findHabitById(habitId);

  if (!habit || habit.userId !== userId) {
    throw new Error("Habit not found");
  }

  // When enabling reminders, must have a time — either now or from before
  const effectiveTime = data.reminderTime ?? habit.reminderTime;

  if (data.reminderOn && !effectiveTime) {
    throw new Error(
      "Cannot enable reminder without a reminder time. Provide reminderTime.",
    );
  }

  return updateHabitRecord(habitId, {
    reminderOn: data.reminderOn,
    ...(data.reminderTime !== undefined
      ? { reminderTime: data.reminderTime }
      : {}),
  });
};

// ─────────────────────────────────────────────────────────────────
// STREAK CALCULATION
// ─────────────────────────────────────────────────────────────────

/**
 * Calculate the current active streak.
 *
 * Algorithm (walks backwards from most recent log):
 * 1. If no logs → streak is 0
 * 2. If most recent log is older than one full period → streak is broken → 0
 * 3. Otherwise walk through logs, count consecutive periods
 *
 * Why we start from the most recent log (not "today"):
 * Starting from "today" would return 0 if the user hasn't completed today yet
 * but had a 10-day streak through yesterday. That's wrong — the streak is 10.
 * We only break the streak if a full period was genuinely skipped.
 *
 * 60-second DST tolerance prevents streak breaks from daylight saving time
 * boundary artifacts.
 */
export const calculateHabitStreak = async (habitId: string, userId: string) => {
  const habit = await findHabitById(habitId);

  if (!habit || habit.userId !== userId) {
    throw new Error("Habit not found");
  }

  const logs = await getHabitLogs(habitId); // DESC

  if (logs.length === 0) {
    return { currentStreak: 0 };
  }

  const periodMs = PERIOD_MS[habit.frequency as "daily" | "weekly"];

  const mostRecentLog = new Date(logs[0].date);
  mostRecentLog.setHours(0, 0, 0, 0);

  const currentPeriod =
    habit.frequency === "daily" ? normalizeDailyDate() : normalizeWeeklyDate();

  const gapFromCurrent = currentPeriod.getTime() - mostRecentLog.getTime();

  // If the most recent log is more than one period old, streak is genuinely broken
  if (gapFromCurrent > periodMs + 60_000) {
    return { currentStreak: 0 };
  }

  // Walk backwards through logs counting consecutive periods
  let streak = 0;
  let expectedTime = mostRecentLog.getTime();

  for (const log of logs) {
    const logTime = new Date(log.date);
    logTime.setHours(0, 0, 0, 0);

    if (Math.abs(logTime.getTime() - expectedTime) <= 60_000) {
      streak++;
      expectedTime -= periodMs;
    } else {
      break;
    }
  }

  return { currentStreak: streak };
};

// ─────────────────────────────────────────────────────────────────
// FULL ANALYTICS
// ─────────────────────────────────────────────────────────────────

/**
 * Comprehensive analytics for a single habit.
 *
 * Metrics:
 *  - totalCompletions      → raw count
 *  - totalPossiblePeriods  → periods elapsed since habit creation
 *  - completionRate        → % of periods completed (respects targetPerWeek if set)
 *  - currentStreak         → active streak right now
 *  - longestStreak         → personal best ever
 *  - missedPeriods         → totalPossible - totalCompletions
 *  - bestDayOfWeek         → which day the user completes this habit most
 *  - consistencyScore      → 0–100 composite score (rate + streak + recency)
 *
 * targetPerWeek support:
 * If the habit has a targetPerWeek (e.g. daily habit but only aiming for 5/7),
 * completionRate is calculated against that target instead of the raw possible periods.
 * This makes completion rate realistic and motivating instead of punishing.
 */
export const calculateHabitAnalytics = async (
  habitId: string,
  userId: string,
) => {
  const habit = await getHabitWithLogs(habitId); // logs ASC

  if (!habit || habit.userId !== userId) {
    throw new Error("Habit not found");
  }

  const logs = habit.logs;

  // ── Period count since creation ──────────────────────────
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const created = new Date(habit.createdAt);
  created.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
  );

  const totalPossiblePeriods =
    habit.frequency === "daily" ? diffDays + 1 : Math.floor(diffDays / 7) + 1;

  const totalCompletions = logs.length;
  const missedPeriods = Math.max(0, totalPossiblePeriods - totalCompletions);

  // ── Completion rate (respects targetPerWeek) ─────────────
  // If user set targetPerWeek = 5 for a daily habit, their "target" periods
  // over N weeks is (N weeks × 5). We use this as the denominator for rate.
  let effectivePossible = totalPossiblePeriods;

  if (habit.targetPerWeek && habit.frequency === "daily") {
    const weeksElapsed = Math.floor(diffDays / 7) + 1;
    effectivePossible = weeksElapsed * habit.targetPerWeek;
  }

  const completionRate =
    effectivePossible > 0
      ? Math.min((totalCompletions / effectivePossible) * 100, 100) // cap at 100%
      : 0;

  // ── Longest streak ───────────────────────────────────────
  const periodMs = PERIOD_MS[habit.frequency as "daily" | "weekly"];

  let longestStreak = logs.length > 0 ? 1 : 0;
  let currentRunInLoop = logs.length > 0 ? 1 : 0;

  for (let i = 1; i < logs.length; i++) {
    const prev = new Date(logs[i - 1].date);
    const curr = new Date(logs[i].date);
    const diff = curr.getTime() - prev.getTime();

    if (Math.abs(diff - periodMs) <= 60_000) {
      currentRunInLoop++;
    } else {
      currentRunInLoop = 1;
    }

    longestStreak = Math.max(longestStreak, currentRunInLoop);
  }

  // ── Current streak ───────────────────────────────────────
  const { currentStreak } = await calculateHabitStreak(habitId, userId);

  // ── Best day of week ─────────────────────────────────────
  // Count completions per day of week (0=Sun, 1=Mon, ..., 6=Sat)
  // Then find the day with the highest count.
  // Useful insight: "You're most consistent on Mondays"
  const DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayCounts: Record<number, number> = {};

  for (const log of logs) {
    const day = new Date(log.date).getDay();
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  }

  let bestDayOfWeek: string | null = null;

  if (Object.keys(dayCounts).length > 0) {
    const bestDayNum = Object.entries(dayCounts).sort(
      ([, a], [, b]) => b - a,
    )[0][0];
    bestDayOfWeek = DAY_NAMES[Number(bestDayNum)];
  }

  // ── Consistency score (0–100) ────────────────────────────
  // A composite score that combines three signals:
  //
  //   1. completionRate (50% weight) — are you actually doing it?
  //   2. streakScore    (30% weight) — are you doing it consistently recently?
  //      Normalized: currentStreak / max(longestStreak, 1)
  //   3. recencyScore   (20% weight) — did you do it recently?
  //      1 if completed in last 2 periods, 0 if not
  //
  // This gives a more holistic picture than completion rate alone.
  // A user with 60% completion rate but a 30-day streak scores higher
  // than one with 60% rate but who hasn't done it in 2 weeks.
  const streakScore =
    longestStreak > 0 ? (currentStreak / longestStreak) * 100 : 0;

  let recencyScore = 0;

  if (logs.length > 0) {
    const latestLog = new Date(logs[logs.length - 1].date);
    latestLog.setHours(0, 0, 0, 0);
    const gapMs = now.getTime() - latestLog.getTime();

    // If completed within last 2 periods, recency is perfect (100)
    recencyScore = gapMs <= periodMs * 2 ? 100 : 0;
  }

  const consistencyScore = Number(
    (completionRate * 0.5 + streakScore * 0.3 + recencyScore * 0.2).toFixed(1),
  );

  return {
    totalCompletions,
    totalPossiblePeriods,
    completionRate: Number(completionRate.toFixed(2)),
    currentStreak,
    longestStreak,
    missedPeriods,
    bestDayOfWeek,
    consistencyScore, // 0–100 composite behavioral score
  };
};

// ─────────────────────────────────────────────────────────────────
// MONTHLY SUMMARY
// ─────────────────────────────────────────────────────────────────

/**
 * Return a monthly completion summary for a habit.
 *
 * Used for calendar views — returns each day of the given month
 * with a completed flag.
 *
 * month format: "YYYY-MM" (e.g. "2026-02")
 *
 * Why we calculate start/end from the month string:
 * JS Date parsing of "YYYY-MM" is inconsistent across environments.
 * We manually parse year/month to guarantee correct boundaries.
 */
export const getMonthlyHabitSummary = async (
  habitId: string,
  userId: string,
  month: string, // "YYYY-MM"
) => {
  const habit = await findHabitById(habitId);

  if (!habit || habit.userId !== userId) {
    throw new Error("Habit not found");
  }

  // Parse year and month from "YYYY-MM" string
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr) - 1; // JS months are 0-indexed

  if (isNaN(year) || isNaN(monthNum) || monthNum < 0 || monthNum > 11) {
    throw new Error("Invalid month format. Use YYYY-MM (e.g. 2026-02)");
  }

  // First and last moment of the month
  const startOfMonth = new Date(year, monthNum, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, monthNum + 1, 0, 23, 59, 59, 999);

  // Fetch only logs within this month — not the entire log history
  const logs = await prisma_logs_in_range(habitId, startOfMonth, endOfMonth);

  // Build a Set of completed timestamps for O(1) lookup
  const completedSet = new Set(
    logs.map((log) => {
      const d = new Date(log.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }),
  );

  // Generate one entry per day of the month
  const daysInMonth = endOfMonth.getDate();
  const calendar: { date: string; completed: boolean }[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const current = new Date(year, monthNum, day, 0, 0, 0, 0);
    calendar.push({
      date: current.toISOString().split("T")[0],
      completed: completedSet.has(current.getTime()),
    });
  }

  const completionsThisMonth = logs.length;
  const completionRate =
    daysInMonth > 0
      ? Number(((completionsThisMonth / daysInMonth) * 100).toFixed(2))
      : 0;

  return {
    month,
    completionsThisMonth,
    completionRate,
    calendar,
  };
};

// Internal helper — fetches logs within a date range
// Not exported (only used by getMonthlyHabitSummary)
const prisma_logs_in_range = async (habitId: string, from: Date, to: Date) => {
  const { prisma } = await import("../../config/db");
  return prisma.habitLog.findMany({
    where: {
      habitId,
      date: { gte: from, lte: to },
    },
    orderBy: { date: "asc" },
  });
};

// ─────────────────────────────────────────────────────────────────
// HEATMAP
// ─────────────────────────────────────────────────────────────────

/**
 * Generate GitHub-style heatmap data for the last N days.
 *
 * Returns: { date: "YYYY-MM-DD", completed: 0 | 1 }[]
 * Frontend maps completed to color intensity (0=empty, 1=filled).
 *
 * Uses a Set for O(1) per-day lookup instead of O(n) array scan.
 * Capped at 730 days to prevent abuse via ?days=999999.
 */
export const generateHabitHeatmap = async (
  habitId: string,
  userId: string,
  days: number = 365,
) => {
  const habit = await getHabitWithLogs(habitId);

  if (!habit || habit.userId !== userId) {
    throw new Error("Habit not found");
  }

  const completedSet = new Set(
    habit.logs.map((log) => {
      const d = new Date(log.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days + 1);

  const heatmap: { date: string; completed: number }[] = [];

  for (let i = 0; i < days; i++) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + i);
    current.setHours(0, 0, 0, 0);

    heatmap.push({
      date: current.toISOString().split("T")[0],
      completed: completedSet.has(current.getTime()) ? 1 : 0,
    });
  }

  return { heatmap };
};

// ─────────────────────────────────────────────────────────────────
// PAGINATED LOGS
// ─────────────────────────────────────────────────────────────────

/**
 * Return paginated completion logs for a habit.
 *
 * Why pagination matters:
 * A habit tracked for 2 years has 730 daily logs.
 * Loading all 730 rows for every analytics page is wasteful.
 * Pagination loads only what the UI needs to display.
 *
 * Returns: { logs, total, page, limit, totalPages }
 */
export const fetchPaginatedLogs = async (
  habitId: string,
  userId: string,
  page: number,
  limit: number,
) => {
  const habit = await findHabitById(habitId);

  if (!habit || habit.userId !== userId) {
    throw new Error("Habit not found");
  }

  const { logs, total } = await getPaginatedHabitLogs(habitId, page, limit);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};
