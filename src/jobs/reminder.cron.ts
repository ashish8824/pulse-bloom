/**
 * src/jobs/reminder.cron.ts
 *
 * Runs every minute. For each minute tick:
 *
 *   1. Format current time as "HH:MM"
 *   2. Find habits where reminderOn=true AND reminderTime="HH:MM"
 *   3. For each → check if already completed this period
 *   4. Not completed → send reminder email
 *   5. Already completed → skip silently
 */

import cron from "node-cron";
import { prisma } from "../config/db";
import { sendReminderEmail } from "../utils/mailer";
import { normalizeDailyDate, normalizeWeeklyDate } from "../utils/date.utils";
import { logger } from "../utils/logger";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: getCurrentHHMM
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns the current time as "HH:MM" — zero-padded, 24-hour format.
 *
 * This matches EXACTLY how reminderTime is stored in the Habit table.
 *
 * Examples:
 *   8:05 AM  → "08:05"
 *   2:30 PM  → "14:30"
 *   11:59 PM → "23:59"
 */
const getCurrentHHMM = (): string => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: getPeriodStart
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns the normalized period-start timestamp for a habit.
 *
 * WHY?
 *   Your habit.service.ts normalizes HabitLog.date when completing a habit:
 *     daily  → normalizeDailyDate()   = midnight today
 *     weekly → normalizeWeeklyDate()  = Monday midnight this ISO week
 *
 *   We use the SAME functions here so our DB lookup finds the same
 *   row that completeHabit() wrote. If we didn't, the check would
 *   always return "not completed" and send emails even when done.
 */
const getPeriodStart = (frequency: "daily" | "weekly"): Date => {
  return frequency === "daily" ? normalizeDailyDate() : normalizeWeeklyDate();
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPE
// ─────────────────────────────────────────────────────────────────────────────

type HabitWithUser = {
  id: string;
  title: string;
  frequency: string;
  userId: string;
  user: {
    email: string;
    name: string;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// CORE: processHabitReminder
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Handles one habit per tick:
 *   → checks completion → sends email if needed
 *
 * Returns "sent" or "skipped".
 * Throws on failure so Promise.allSettled can track it.
 */
const processHabitReminder = async (
  habit: HabitWithUser,
  currentTime: string,
): Promise<"sent" | "skipped"> => {
  const freq = habit.frequency as "daily" | "weekly";
  const periodStart = getPeriodStart(freq);

  // ── Check completion ──────────────────────────────────────────────────────
  //
  // HabitLog has @@unique([habitId, date]) — findUnique is the
  // fastest possible lookup (single indexed row read, no scan).
  // We select only `id` because we just need to know if it EXISTS.

  const existingLog = await prisma.habitLog.findUnique({
    where: {
      habitId_date: {
        habitId: habit.id,
        date: periodStart,
      },
    },
    select: { id: true },
  });

  if (existingLog) {
    logger.debug("[ReminderCron] Already completed — skipping", {
      habit: habit.title,
      user: habit.user.email,
    });
    return "skipped";
  }

  // ── Send email ────────────────────────────────────────────────────────────

  const emailSent = await sendReminderEmail({
    to: habit.user.email,
    userName: habit.user.name,
    habitTitle: habit.title,
    reminderTime: currentTime,
  });

  if (!emailSent) {
    // sendReminderEmail returns false and logs internally on SMTP failure.
    // Throwing here lets Promise.allSettled count this as "failed".
    throw new Error(`Email failed for "${habit.title}" → ${habit.user.email}`);
  }

  return "sent";
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT: runReminderJob
// ─────────────────────────────────────────────────────────────────────────────
/**
 * The main job function — called every minute.
 * Exported so you can unit-test it directly without triggering cron.
 */
export const runReminderJob = async (): Promise<void> => {
  const currentTime = getCurrentHHMM();

  logger.info(`[ReminderCron] ⏱  Tick — ${currentTime}`);

  // ── Step 1: Query habits scheduled for right now ──────────────────────────
  //
  // Prisma translates this to:
  //   SELECT h.*, u.email, u.name
  //   FROM "Habit" h
  //   JOIN "User" u ON h."userId" = u.id
  //   WHERE h."reminderOn"   = true
  //     AND h."reminderTime" = '08:30'   ← currentTime
  //     AND h."isArchived"   = false
  //
  // The @@index([reminderOn, reminderTime]) makes this O(1) regardless
  // of how many total habits exist in the database.

  let habits: HabitWithUser[];

  try {
    habits = await prisma.habit.findMany({
      where: {
        reminderOn: true,
        reminderTime: currentTime,
        isArchived: false,
      },
      select: {
        id: true,
        title: true,
        frequency: true,
        userId: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });
  } catch (err) {
    // DB failure — log and return. node-cron retries automatically next minute.
    logger.error("[ReminderCron] DB query failed — will retry next tick", {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  if (habits.length === 0) {
    logger.debug(`[ReminderCron] No habits scheduled for ${currentTime}`);
    return;
  }

  logger.info(`[ReminderCron] Found ${habits.length} habit(s) to process`);

  // ── Step 2: Process all habits concurrently ───────────────────────────────
  //
  // Promise.allSettled() vs Promise.all():
  //   Promise.all()        → 1 failure cancels ALL remaining ❌
  //   Promise.allSettled() → every habit runs independently  ✅
  //
  // This guarantees that a failed email for user A
  // never blocks the reminder for users B, C, D.

  const results = await Promise.allSettled(
    habits.map((habit) => processHabitReminder(habit, currentTime)),
  );

  // ── Step 3: Log tick summary ──────────────────────────────────────────────

  const sent = results.filter(
    (r) => r.status === "fulfilled" && r.value === "sent",
  ).length;
  const skipped = results.filter(
    (r) => r.status === "fulfilled" && r.value === "skipped",
  ).length;
  const failed = results.filter((r) => r.status === "rejected").length;

  logger.info("[ReminderCron] ✅ Tick complete", { sent, skipped, failed });

  // Log each individual failure for debugging
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      logger.error("[ReminderCron] Habit failed", {
        habit: habits[i]?.title,
        reason: (result.reason as Error)?.message,
      });
    }
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT: startReminderCron
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Registers and starts the cron job.
 * Call once from server.ts after DB connections are ready.
 *
 * Schedule: "* * * * *" = every minute
 *
 *   ┌──── minute (0-59)       * = every minute
 *   │ ┌── hour (0-23)         * = every hour
 *   │ │ ┌ day of month (1-31) * = every day
 *   │ │ │ ┌ month (1-12)      * = every month
 *   │ │ │ │ ┌ day of week     * = every weekday
 *   * * * * *
 */
export const startReminderCron = (): void => {
  const schedule = "* * * * *";

  if (!cron.validate(schedule)) {
    logger.error("[ReminderCron] Invalid schedule — job NOT started");
    return;
  }

  cron.schedule(
    schedule,
    async () => {
      try {
        await runReminderJob();
      } catch (err) {
        // Safety net — prevents any edge-case unhandled rejection
        // from crashing the Node.js process entirely.
        logger.error("[ReminderCron] ❌ Unhandled error", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    {
      timezone: "UTC", // change to "Asia/Kolkata" for IST if needed
    },
  );

  logger.info("[ReminderCron] 🚀 Started — fires every minute");
};
