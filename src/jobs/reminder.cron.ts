/**
 * src/jobs/reminder.cron.ts
 *
 * Runs every minute. For each tick it processes TWO types of reminders:
 *
 *   ── HABIT REMINDERS ─────────────────────────────────────────────
 *   1. Find habits WHERE reminderOn=true AND reminderTime=HH:MM
 *   2. For each → check if already completed this period
 *   3. Not completed → send habit reminder email
 *   4. Already completed → skip silently
 *
 *   ── MOOD REMINDERS  (NEW) ────────────────────────────────────────
 *   1. Find users WHERE moodReminderOn=true AND moodReminderTime=HH:MM
 *   2. For each → check if a MoodEntry exists for today
 *   3. No entry → send mood check-in email
 *   4. Already logged → skip silently
 *
 * Both loops run concurrently inside the same tick via Promise.allSettled(),
 * so a single email failure in one loop never blocks the other.
 */

import cron from "node-cron";
import { prisma } from "../config/db";
import { sendReminderEmail, sendMoodReminderEmail } from "../utils/mailer";
import { normalizeDailyDate, normalizeWeeklyDate } from "../utils/date.utils";
import { logger } from "../utils/logger";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: getCurrentHHMM
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns the current time as "HH:MM" in 24-hour format.
 * This matches EXACTLY how reminderTime / moodReminderTime are stored in DB.
 *
 * Examples:  8:05 AM → "08:05"  |  2:30 PM → "14:30"  |  11:59 PM → "23:59"
 */
const getCurrentHHMM = (): string => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: getStartOfToday
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns midnight UTC for today — used to check if a MoodEntry
 * exists for the current calendar day.
 *
 * We reuse normalizeDailyDate() for consistency with how mood entries
 * are timestamped elsewhere in the codebase.
 */
const getStartOfToday = (): Date => normalizeDailyDate();

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: getPeriodStart
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns the normalised period-start timestamp for a habit.
 * Mirrors the normalisation done in habit.service.ts completeHabit().
 */
const getPeriodStart = (frequency: "daily" | "weekly"): Date =>
  frequency === "daily" ? normalizeDailyDate() : normalizeWeeklyDate();

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type HabitWithUser = {
  id: string;
  title: string;
  frequency: string;
  userId: string;
  user: { email: string; name: string };
};

type UserWithMoodReminder = {
  id: string;
  email: string;
  name: string;
  moodReminderTime: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// HABIT REMINDER — processHabitReminder
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Handles a single habit reminder for one tick:
 *   • Checks whether the habit has already been completed this period
 *   • Sends a reminder email if it hasn't
 *
 * Returns "sent" or "skipped".
 * Throws on failure so Promise.allSettled tracks it as rejected.
 */
const processHabitReminder = async (
  habit: HabitWithUser,
  currentTime: string,
): Promise<"sent" | "skipped"> => {
  const freq = habit.frequency as "daily" | "weekly";
  const periodStart = getPeriodStart(freq);

  // HabitLog has @@unique([habitId, date]) — findUnique is an O(1) indexed lookup
  const existingLog = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId: habit.id, date: periodStart } },
    select: { id: true },
  });

  if (existingLog) {
    logger.debug("[ReminderCron] Habit already completed — skipping", {
      habit: habit.title,
      user: habit.user.email,
    });
    return "skipped";
  }

  const emailSent = await sendReminderEmail({
    to: habit.user.email,
    userName: habit.user.name,
    habitTitle: habit.title,
    reminderTime: currentTime,
  });

  if (!emailSent) {
    throw new Error(
      `Habit email failed for "${habit.title}" → ${habit.user.email}`,
    );
  }

  logger.info("[ReminderCron] ✅ Habit reminder sent", {
    to: habit.user.email,
    habit: habit.title,
  });

  return "sent";
};

// ─────────────────────────────────────────────────────────────────────────────
// MOOD REMINDER — processMoodReminder  ← NEW
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Handles a single mood reminder for one tick:
 *   • Checks whether the user has already logged a MoodEntry today
 *   • Sends a check-in nudge email if they haven't
 *
 * Returns "sent" or "skipped".
 * Throws on failure so Promise.allSettled tracks it as rejected.
 */
const processMoodReminder = async (
  user: UserWithMoodReminder,
  currentTime: string,
): Promise<"sent" | "skipped"> => {
  const todayStart = getStartOfToday();

  // Check if ANY mood entry exists for this user today.
  // We only need to know it exists — select: { id: true } is the lightest possible read.
  const todayEntry = await prisma.moodEntry.findFirst({
    where: {
      userId: user.id,
      createdAt: { gte: todayStart },
    },
    select: { id: true },
  });

  if (todayEntry) {
    logger.debug("[ReminderCron] Mood already logged today — skipping", {
      user: user.email,
    });
    return "skipped";
  }

  const emailSent = await sendMoodReminderEmail({
    to: user.email,
    userName: user.name,
    reminderTime: currentTime,
  });

  if (!emailSent) {
    throw new Error(`Mood email failed for ${user.email}`);
  }

  logger.info("[ReminderCron] ✅ Mood reminder sent", { to: user.email });
  return "sent";
};

// ─────────────────────────────────────────────────────────────────────────────
// CORE: runReminderJob
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Main job body — called every minute by the cron schedule.
 * Exported so you can unit-test it directly without triggering cron.
 *
 * Execution order per tick:
 *   1. Format current time as "HH:MM"
 *   2. Query habits due now (habit reminders)          ← parallel DB calls
 *   3. Query users with mood reminders due now
 *   4. Process all habit reminders concurrently        ← Promise.allSettled
 *   5. Process all mood reminders concurrently         ← Promise.allSettled
 *   6. Log tick summary (sent / skipped / failed)
 *
 * Why two separate Promise.allSettled calls instead of mixing them?
 *   • Cleaner summary logging (habit stats vs mood stats are reported separately)
 *   • Easier to add per-category error handling later
 *   • DB queries are still fully parallel (both run before any emails fire)
 */
export const runReminderJob = async (): Promise<void> => {
  const currentTime = getCurrentHHMM();

  logger.info(`[ReminderCron] ⏱  Tick — ${currentTime}`);

  // ── Step 1: Fetch habits and mood-reminder users in parallel ──────────────
  //
  // Both DB queries fire simultaneously — total wait time = max(queryA, queryB)
  // instead of queryA + queryB if we awaited them sequentially.

  let habits: HabitWithUser[];
  let moodReminderUsers: UserWithMoodReminder[];

  try {
    [habits, moodReminderUsers] = await Promise.all([
      // ── Habit query ────────────────────────────────────────────────────────
      // Uses @@index([reminderOn, reminderTime]) — O(1) regardless of total habits
      prisma.habit.findMany({
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
          user: { select: { email: true, name: true } },
        },
      }),

      // ── Mood reminder query  (NEW) ─────────────────────────────────────────
      // Uses @@index([moodReminderOn, moodReminderTime]) — same O(1) pattern
      prisma.user.findMany({
        where: {
          moodReminderOn: true,
          moodReminderTime: currentTime,
        },
        select: {
          id: true,
          email: true,
          name: true,
          moodReminderTime: true,
        },
      }),
    ]);
  } catch (err) {
    logger.error("[ReminderCron] DB query failed — will retry next tick", {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  const totalWork = habits.length + moodReminderUsers.length;

  if (totalWork === 0) {
    logger.debug(`[ReminderCron] Nothing scheduled for ${currentTime}`);
    return;
  }

  logger.info(
    `[ReminderCron] Found ${habits.length} habit(s), ${moodReminderUsers.length} mood reminder(s)`,
  );

  // ── Step 2: Process habit reminders ──────────────────────────────────────
  const habitResults =
    habits.length > 0
      ? await Promise.allSettled(
          habits.map((habit) => processHabitReminder(habit, currentTime)),
        )
      : [];

  // ── Step 3: Process mood reminders ───────────────────────────────────────
  const moodResults =
    moodReminderUsers.length > 0
      ? await Promise.allSettled(
          moodReminderUsers.map((user) =>
            processMoodReminder(user, currentTime),
          ),
        )
      : [];

  // ── Step 4: Log tick summary ──────────────────────────────────────────────

  const summarise = (results: PromiseSettledResult<"sent" | "skipped">[]) => ({
    sent: results.filter((r) => r.status === "fulfilled" && r.value === "sent")
      .length,
    skipped: results.filter(
      (r) => r.status === "fulfilled" && r.value === "skipped",
    ).length,
    failed: results.filter((r) => r.status === "rejected").length,
  });

  const habitSummary = summarise(habitResults);
  const moodSummary = summarise(moodResults);

  logger.info("[ReminderCron] ✅ Tick complete", {
    habits: habitSummary,
    mood: moodSummary,
  });

  // Log individual failures for debugging
  [...habitResults, ...moodResults].forEach((result, i) => {
    if (result.status === "rejected") {
      const label =
        i < habitResults.length
          ? `habit[${habits[i]?.title}]`
          : `mood[${moodReminderUsers[i - habitResults.length]?.email}]`;

      logger.error("[ReminderCron] Reminder failed", {
        item: label,
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
 * Call once from server.ts AFTER DB connections are ready.
 *
 * Schedule: "* * * * *" = every minute
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
        logger.error("[ReminderCron] ❌ Unhandled error", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    { timezone: "UTC" }, // change to "Asia/Kolkata" for IST if needed
  );

  logger.info("[ReminderCron] 🚀 Started — fires every minute (habits + mood)");
};
