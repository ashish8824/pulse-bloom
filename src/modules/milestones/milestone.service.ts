import { MilestoneType } from "@prisma/client";
import {
  findMilestone,
  awardMilestone,
  getMilestonesByUser,
  getHabitIdsFromMilestones,
  getHabitTitlesByIds,
  countMoodEntries,
  getWeeklyMoodAverages,
} from "./milestone.repository";

// ─────────────────────────────────────────────────────────────────
// MILESTONE SERVICE — Business Logic Layer
//
// Feature #9: Personal Records & Milestones Timeline
//
// Public API surface:
//
//   checkAndAwardHabitStreakMilestone()  → called from habit.service completeHabit()
//   checkAndAwardMoodMilestones()        → called from mood.service addMood()
//   checkAndAwardBurnoutRecovery()       → called from mood.service (future burnout check)
//   getMilestoneTimeline()               → called from milestone.controller GET /api/milestones
//
// All check-and-award functions are:
//   • fire-and-forget safe — they catch all errors internally
//   • idempotent — awarding the same milestone twice is a no-op
//   • non-blocking — callers don't await, so a DB failure here
//     can never cause a habit completion or mood log to fail
// ─────────────────────────────────────────────────────────────────

// Maps streak day counts → MilestoneType enum values
const HABIT_STREAK_MILESTONE_MAP: Record<number, MilestoneType> = {
  7: MilestoneType.HABIT_STREAK_7,
  14: MilestoneType.HABIT_STREAK_14,
  21: MilestoneType.HABIT_STREAK_21,
  30: MilestoneType.HABIT_STREAK_30,
  60: MilestoneType.HABIT_STREAK_60,
  90: MilestoneType.HABIT_STREAK_90,
  100: MilestoneType.HABIT_STREAK_100,
  180: MilestoneType.HABIT_STREAK_180,
  365: MilestoneType.HABIT_STREAK_365,
};

const MOOD_STREAK_MILESTONE_MAP: Record<number, MilestoneType> = {
  7: MilestoneType.MOOD_STREAK_7,
  14: MilestoneType.MOOD_STREAK_14,
  30: MilestoneType.MOOD_STREAK_30,
};

// Minimum entries in a week before considering BEST_WEEK_MOOD
// Prevents a single lucky entry from claiming "best week"
const MIN_ENTRIES_FOR_BEST_WEEK = 3;

// ─────────────────────────────────────────────────────────────────
// INTERNAL HELPER
// ─────────────────────────────────────────────────────────────────

/**
 * Core idempotent award function.
 * Checks if the milestone already exists before inserting.
 * Returns true if newly awarded, false if already existed.
 *
 * This is the only place that writes to the Milestone table.
 */
const tryAward = async (data: {
  userId: string;
  type: MilestoneType;
  habitId?: string | null;
  value?: number | null;
}): Promise<boolean> => {
  const existing = await findMilestone(data.userId, data.type, data.habitId);
  if (existing) return false; // already awarded — idempotent no-op

  await awardMilestone(data);
  return true;
};

// ─────────────────────────────────────────────────────────────────
// PUBLIC: HABIT STREAK MILESTONE CHECK
// Called fire-and-forget from habit.service.ts → completeHabit()
// ─────────────────────────────────────────────────────────────────

/**
 * Check if the current habit streak hits a milestone and award it.
 *
 * Called after completeHabit() computes currentStreak.
 * This runs in addition to the existing STREAK_MILESTONE notification —
 * the notification tells the user in-app, the Milestone row is the
 * permanent historical record on the timeline.
 *
 * Safe to call without await — catches all errors internally.
 */
export const checkAndAwardHabitStreakMilestone = async (
  userId: string,
  habitId: string,
  currentStreak: number,
): Promise<void> => {
  try {
    const milestoneType = HABIT_STREAK_MILESTONE_MAP[currentStreak];
    if (!milestoneType) return; // not a milestone streak count

    await tryAward({ userId, type: milestoneType, habitId });
  } catch (err) {
    // Fire-and-forget: log but never propagate
    console.error(
      "[MilestoneService] checkAndAwardHabitStreakMilestone error:",
      err,
    );
  }
};

// ─────────────────────────────────────────────────────────────────
// PUBLIC: MOOD MILESTONE CHECKS
// Called fire-and-forget from mood.service.ts → addMood()
// ─────────────────────────────────────────────────────────────────

/**
 * Run all mood-related milestone checks after a mood entry is saved.
 *
 * Checks (in order):
 *   1. FIRST_MOOD_ENTRY — if this is their first ever mood log
 *   2. MOOD_STREAK_7/14/30 — if their logging streak hit a milestone
 *   3. BEST_WEEK_MOOD — if the current week's average is an all-time best
 *
 * currentStreak and weeklyAvg are passed in by the caller (mood.service)
 * so this function doesn't need to re-compute them — mood.service already
 * has that data after addMood() runs.
 *
 * Safe to call without await — catches all errors internally.
 */
export const checkAndAwardMoodMilestones = async (
  userId: string,
  currentMoodStreak: number,
): Promise<void> => {
  try {
    await Promise.allSettled([
      _checkFirstMoodEntry(userId),
      _checkMoodStreakMilestones(userId, currentMoodStreak),
      _checkBestWeekMood(userId),
    ]);
  } catch (err) {
    console.error("[MilestoneService] checkAndAwardMoodMilestones error:", err);
  }
};

/**
 * Award FIRST_MOOD_ENTRY if this is the user's first mood log.
 * Checks total count — if it's 1, this is the first.
 */
const _checkFirstMoodEntry = async (userId: string): Promise<void> => {
  const count = await countMoodEntries(userId);
  if (count === 1) {
    await tryAward({ userId, type: MilestoneType.FIRST_MOOD_ENTRY });
  }
};

/**
 * Award MOOD_STREAK_7 / _14 / _30 based on the current streak.
 * Streak is computed in mood.service and passed in to avoid a re-query.
 */
const _checkMoodStreakMilestones = async (
  userId: string,
  currentStreak: number,
): Promise<void> => {
  const milestoneType = MOOD_STREAK_MILESTONE_MAP[currentStreak];
  if (!milestoneType) return;
  await tryAward({ userId, type: milestoneType });
};

/**
 * Award BEST_WEEK_MOOD if the current ISO week's average mood is
 * the highest weekly average the user has ever achieved.
 *
 * Requires MIN_ENTRIES_FOR_BEST_WEEK entries in the current week
 * to prevent a single-entry week claiming the record.
 *
 * Why BEST_WEEK_MOOD can be re-awarded:
 * The @@unique([userId, type, habitId]) constraint means once
 * BEST_WEEK_MOOD is awarded, it will never be awarded again (same
 * userId + type + null = one row). This is intentional — the timeline
 * shows the first time you ever hit your personal best week,
 * which is the most meaningful version of this milestone.
 */
const _checkBestWeekMood = async (userId: string): Promise<void> => {
  const weeklyData = await getWeeklyMoodAverages(userId);
  if (weeklyData.length < 2) return; // need at least 2 weeks for "best ever"

  const currentWeek = weeklyData[weeklyData.length - 1];
  if (currentWeek.count < MIN_ENTRIES_FOR_BEST_WEEK) return;

  // Previous weeks only (exclude current week from the "previous best" calc)
  const previousBest = Math.max(...weeklyData.slice(0, -1).map((w) => w.avg));

  if (currentWeek.avg > previousBest) {
    await tryAward({
      userId,
      type: MilestoneType.BEST_WEEK_MOOD,
      value: currentWeek.avg, // store the actual score for display
    });
  }
};

// ─────────────────────────────────────────────────────────────────
// PUBLIC: BURNOUT RECOVERY CHECK
// Called fire-and-forget when burnout risk is re-evaluated
// ─────────────────────────────────────────────────────────────────

/**
 * Award BURNOUT_RECOVERY when the user's burnout risk level drops
 * from High to Low.
 *
 * Call this from wherever burnout risk is computed and the previous
 * level is known (e.g. after adding a mood entry if you cache the
 * previous risk level). This is a stub — Phase 3 will wire it fully
 * when burnout risk change notifications are implemented.
 *
 * Safe to call without await — catches all errors internally.
 */
export const checkAndAwardBurnoutRecovery = async (
  userId: string,
  previousLevel: string,
  currentLevel: string,
): Promise<void> => {
  try {
    if (previousLevel === "High" && currentLevel === "Low") {
      await tryAward({ userId, type: MilestoneType.BURNOUT_RECOVERY });
    }
  } catch (err) {
    console.error(
      "[MilestoneService] checkAndAwardBurnoutRecovery error:",
      err,
    );
  }
};

// ─────────────────────────────────────────────────────────────────
// PUBLIC: GET TIMELINE
// Called from milestone.controller → GET /api/milestones
// ─────────────────────────────────────────────────────────────────

// Human-readable labels for each milestone type
const MILESTONE_LABELS: Record<MilestoneType, string> = {
  FIRST_MOOD_ENTRY: "First Mood Logged",
  HABIT_STREAK_7: "7-Day Habit Streak",
  HABIT_STREAK_14: "14-Day Habit Streak",
  HABIT_STREAK_21: "21-Day Habit Streak",
  HABIT_STREAK_30: "30-Day Habit Streak",
  HABIT_STREAK_60: "60-Day Habit Streak",
  HABIT_STREAK_90: "90-Day Habit Streak",
  HABIT_STREAK_100: "100-Day Habit Streak",
  HABIT_STREAK_180: "180-Day Habit Streak",
  HABIT_STREAK_365: "365-Day Habit Streak",
  MOOD_STREAK_7: "7-Day Mood Logging Streak",
  MOOD_STREAK_14: "14-Day Mood Logging Streak",
  MOOD_STREAK_30: "30-Day Mood Logging Streak",
  BEST_WEEK_MOOD: "Personal Best Week",
  BURNOUT_RECOVERY: "Burnout Recovery",
};

// Emojis to display alongside each milestone type in the timeline
const MILESTONE_ICONS: Record<MilestoneType, string> = {
  FIRST_MOOD_ENTRY: "🌱",
  HABIT_STREAK_7: "🔥",
  HABIT_STREAK_14: "🔥",
  HABIT_STREAK_21: "⚡",
  HABIT_STREAK_30: "💪",
  HABIT_STREAK_60: "🏆",
  HABIT_STREAK_90: "🏆",
  HABIT_STREAK_100: "💯",
  HABIT_STREAK_180: "🌟",
  HABIT_STREAK_365: "🎯",
  MOOD_STREAK_7: "📅",
  MOOD_STREAK_14: "📅",
  MOOD_STREAK_30: "🗓️",
  BEST_WEEK_MOOD: "✨",
  BURNOUT_RECOVERY: "🌿",
};

export interface MilestoneTimelineItem {
  id: string;
  type: MilestoneType;
  icon: string;
  title: string;
  description: string;
  habitId: string | null;
  habitTitle: string | null;
  value: number | null;
  achievedAt: string; // ISO date string
}

/**
 * Build the enriched milestone timeline for a user.
 *
 * Enrichment steps:
 *   1. Fetch all milestones (newest first)
 *   2. Collect unique habitIds referenced → batch-load their titles in one query
 *   3. Map each milestone to a display-ready object with icon, title, description
 *
 * Two DB queries total regardless of how many milestones exist.
 */
export const getMilestoneTimeline = async (
  userId: string,
): Promise<{ milestones: MilestoneTimelineItem[]; total: number }> => {
  // Parallel: fetch milestones + the habitIds we'll need for enrichment
  const [milestones, habitIds] = await Promise.all([
    getMilestonesByUser(userId),
    getHabitIdsFromMilestones(userId),
  ]);

  // Single batch query to get all habit titles needed
  const habitTitleMap = await getHabitTitlesByIds(habitIds);

  const timeline: MilestoneTimelineItem[] = milestones.map((m) => {
    const habitTitle = m.habitId ? (habitTitleMap[m.habitId] ?? null) : null;
    const label = MILESTONE_LABELS[m.type];
    const icon = MILESTONE_ICONS[m.type];

    // Build a contextual description for each milestone type
    let description = label;
    if (habitTitle && m.type.startsWith("HABIT_STREAK_")) {
      description = `${label} on "${habitTitle}"`;
    } else if (m.type === "BEST_WEEK_MOOD" && m.value !== null) {
      description = `Achieved your highest ever weekly mood average: ${m.value}`;
    } else if (m.type === "FIRST_MOOD_ENTRY") {
      description =
        "You logged your very first mood entry. Welcome to PulseBloom!";
    } else if (m.type === "BURNOUT_RECOVERY") {
      description = "Your burnout risk dropped from High to Low. Great work!";
    } else if (m.type.startsWith("MOOD_STREAK_")) {
      description = `${label} — you logged your mood ${m.type.split("_")[2]} days in a row`;
    }

    return {
      id: m.id,
      type: m.type,
      icon,
      title: label,
      description,
      habitId: m.habitId,
      habitTitle,
      value: m.value,
      achievedAt: m.achievedAt.toISOString(),
    };
  });

  return { milestones: timeline, total: timeline.length };
};
