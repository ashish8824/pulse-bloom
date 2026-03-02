/**
 * src/jobs/weekly.digest.cron.ts
 *
 * Runs every Saturday at 8:00am UTC.
 *
 * For each opted-in verified user it:
 *   1. Fetches last 7 days of mood entries
 *   2. Fetches habit completion data for the week
 *   3. Calculates burnout risk level
 *   4. Sends a branded weekly digest email
 *
 * Error isolation: Promise.allSettled() — one failed email
 * never blocks other users' digests.
 */

import cron from "node-cron";
import { prisma } from "../config/db";
import { sendWeeklyDigestEmail, WeeklyDigestData } from "../utils/mailer";
import { logger } from "../utils/logger";
import { findUsersForWeeklyDigest } from "../modules/auth/auth.repository";

// ─────────────────────────────────────────────────────────────────
// HELPER: getWeekBoundaries
// ─────────────────────────────────────────────────────────────────
/**
 * Returns start (7 days ago midnight) and end (now) for the digest window.
 * Also formats a human-readable label: "Feb 24 – Mar 2, 2026"
 */
const getWeekBoundaries = (): { start: Date; end: Date; label: string } => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const year = end.getFullYear();
  const label = `${fmt(start)} – ${fmt(end)}, ${year}`;

  return { start, end, label };
};

// ─────────────────────────────────────────────────────────────────
// HELPER: buildBurnoutLevel
// ─────────────────────────────────────────────────────────────────
/**
 * Replicates the burnout scoring formula from mood.service.ts
 * using just the data we already have in memory from the digest query.
 * Avoids a separate DB call per user.
 */
const buildBurnoutLevel = (
  moodScores: number[],
): "Low" | "Moderate" | "High" | null => {
  if (moodScores.length < 3) return null;

  const avg = moodScores.reduce((a, b) => a + b, 0) / moodScores.length;
  const lowMoodDays = moodScores.filter((s) => s <= 2).length;
  const max = Math.max(...moodScores);
  const min = Math.min(...moodScores);
  const volatility = max - min;

  const riskScore =
    lowMoodDays * 2 + Math.max(0, 3.0 - avg) * 3 + volatility * 1.5;

  if (riskScore >= 10) return "High";
  if (riskScore >= 5) return "Moderate";
  return "Low";
};

// ─────────────────────────────────────────────────────────────────
// CORE: processDigestForUser
// ─────────────────────────────────────────────────────────────────
/**
 * Builds and sends the weekly digest for one user.
 * All DB queries for this user run in parallel.
 * Returns "sent" or throws on failure.
 */
const processDigestForUser = async (
  user: { id: string; email: string; name: string },
  weekStart: Date,
  weekEnd: Date,
  weekLabel: string,
): Promise<"sent"> => {
  // ── Parallel DB queries ───────────────────────────────────────
  const [moodEntries, habitLogs, activeHabits] = await Promise.all([
    // Mood entries for the past 7 days
    prisma.moodEntry.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: weekStart, lte: weekEnd },
      },
      select: { moodScore: true },
    }),

    // Habit logs for the past 7 days (with habit title for top-habit detection)
    prisma.habitLog.findMany({
      where: {
        habit: { userId: user.id },
        date: { gte: weekStart, lte: weekEnd },
        completed: true,
      },
      select: {
        habitId: true,
        habit: { select: { title: true, targetPerWeek: true } },
      },
    }),

    // Active habits — for targetPerWeek sum and streak data
    prisma.habit.findMany({
      where: { userId: user.id, isArchived: false },
      select: {
        id: true,
        title: true,
        targetPerWeek: true,
        logs: {
          where: { date: { gte: weekStart, lte: weekEnd }, completed: true },
          select: { id: true },
        },
      },
    }),
  ]);

  // ── Calculate stats ───────────────────────────────────────────
  const moodScores = moodEntries.map((e) => e.moodScore);

  const averageMood =
    moodScores.length > 0
      ? Math.round(
          (moodScores.reduce((a, b) => a + b, 0) / moodScores.length) * 10,
        ) / 10
      : null;

  const habitsCompleted = habitLogs.length;

  const totalHabitTargets = activeHabits.reduce(
    (sum, h) => sum + (h.targetPerWeek ?? 7), // default 7 if no target set
    0,
  );

  // Find the habit with the most completions this week
  const completionsByHabit = habitLogs.reduce<
    Record<string, { title: string; count: number }>
  >((acc, log) => {
    if (!acc[log.habitId]) {
      acc[log.habitId] = { title: log.habit.title, count: 0 };
    }
    acc[log.habitId].count++;
    return acc;
  }, {});

  const topHabit =
    Object.values(completionsByHabit).sort((a, b) => b.count - a.count)[0]
      ?.title ?? null;

  // Longest active streak across all habits (simple proxy: most logs this week)
  const longestActiveStreak = activeHabits.reduce(
    (max, h) => Math.max(max, h.logs.length),
    0,
  );

  const burnoutRiskLevel = buildBurnoutLevel(moodScores);

  const digestData: WeeklyDigestData = {
    userName: user.name,
    weekLabel,
    averageMood,
    moodEntries: moodScores.length,
    habitsCompleted,
    totalHabitTargets,
    longestActiveStreak,
    burnoutRiskLevel,
    topHabit,
  };

  // ── Send email ────────────────────────────────────────────────
  const sent = await sendWeeklyDigestEmail({
    to: user.email,
    data: digestData,
  });

  if (!sent) {
    throw new Error(`Weekly digest email failed for ${user.email}`);
  }

  return "sent";
};

// ─────────────────────────────────────────────────────────────────
// EXPORT: runWeeklyDigestJob
// ─────────────────────────────────────────────────────────────────
/**
 * Main job body — called by the cron schedule.
 * Exported so you can unit-test it or trigger it manually.
 */
export const runWeeklyDigestJob = async (): Promise<void> => {
  logger.info("[WeeklyDigest] 📬 Starting weekly digest run");

  const { start, end, label } = getWeekBoundaries();

  // ── Fetch all opted-in users ──────────────────────────────────
  let users: { id: string; email: string; name: string }[];

  try {
    users = await findUsersForWeeklyDigest();
  } catch (err) {
    logger.error("[WeeklyDigest] Failed to fetch users — aborting run", {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  if (users.length === 0) {
    logger.info("[WeeklyDigest] No opted-in users — done");
    return;
  }

  logger.info(`[WeeklyDigest] Processing ${users.length} user(s)`);

  // ── Process all users concurrently ───────────────────────────
  const results = await Promise.allSettled(
    users.map((user) => processDigestForUser(user, start, end, label)),
  );

  // ── Log summary ───────────────────────────────────────────────
  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  logger.info("[WeeklyDigest] ✅ Run complete", {
    sent,
    failed,
    total: users.length,
  });

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      logger.error("[WeeklyDigest] Digest failed", {
        user: users[i]?.email,
        reason: (result.reason as Error)?.message,
      });
    }
  });
};

// ─────────────────────────────────────────────────────────────────
// EXPORT: startWeeklyDigestCron
// ─────────────────────────────────────────────────────────────────
/**
 * Registers and starts the weekly digest cron.
 * Call once from server.ts alongside startReminderCron().
 *
 * Schedule: "0 8 * * 6" = 8:00am every Saturday UTC
 *
 *   ┌──── minute (0)        = at minute 0
 *   │ ┌── hour (8)          = at 8am
 *   │ │ ┌ day of month (*)  = any day
 *   │ │ │ ┌ month (*)       = any month
 *   │ │ │ │ ┌ day of week (6) = Saturday (0=Sun, 6=Sat)
 *   0 8 * * 6
 */
export const startWeeklyDigestCron = (): void => {
  const schedule = "0 8 * * 6";

  if (!cron.validate(schedule)) {
    logger.error("[WeeklyDigest] Invalid schedule — job NOT started");
    return;
  }

  cron.schedule(
    schedule,
    async () => {
      try {
        await runWeeklyDigestJob();
      } catch (err) {
        logger.error("[WeeklyDigest] ❌ Unhandled error", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    { timezone: "UTC" },
  );

  logger.info("[WeeklyDigest] 🚀 Started — fires every Saturday at 08:00 UTC");
};
