// src/modules/badges/badge.service.ts
//
// BUSINESS LOGIC LAYER — badge awarding and retrieval.
//
// ─────────────────────────────────────────────────────────────────
// KEY DESIGN PRINCIPLE: fire-and-forget safety
//
// Every award function wraps its entire body in try/catch and
// returns void. This means a badge DB failure can NEVER crash
// completeHabit(), addMood(), or any other primary operation.
//
// The pattern: call these functions with void (no await propagation):
//
//   // In completeHabit():
//   void checkAndAwardHabitBadges(userId, currentStreak, habitId);
//
//   // In addMood():
//   void checkAndAwardMoodBadges(userId, moodStreak, burnoutRiskLevel);
//
// ─────────────────────────────────────────────────────────────────

import { BadgeType } from "@prisma/client";
import { getBadgesByUser, hasBadge, createBadge } from "./badge.repository";
import { createNotification } from "../notifications/notification.service";

// ─────────────────────────────────────────────────────────────────
// BADGE METADATA
//
// Centralised config for display — icon, label, description, progress.
// The controller merges this with raw DB records for the API response.
// Adding a new badge = add the BadgeType enum in schema + add here.
// ─────────────────────────────────────────────────────────────────
export const BADGE_META: Record<
  BadgeType,
  {
    icon: string;
    label: string;
    description: string;
    category: "mood" | "habit" | "achievement";
    // hint shown to locked badges so users know how to unlock
    hint: string;
  }
> = {
  FIRST_STEP: {
    icon: "🌱",
    label: "First Step",
    description: "You logged your very first mood. The journey begins!",
    category: "mood",
    hint: "Log your first mood entry.",
  },
  WEEK_ONE: {
    icon: "🔥",
    label: "Week One",
    description: "7 days of consecutive mood logging. Building real awareness.",
    category: "mood",
    hint: "Log your mood 7 days in a row.",
  },
  IRON_WILL: {
    icon: "💪",
    label: "Iron Will",
    description: "30-day streak on a single habit. This is becoming identity.",
    category: "habit",
    hint: "Reach a 30-day streak on any habit.",
  },
  MINDFUL_MONTH: {
    icon: "🧘",
    label: "Mindful Month",
    description: "Mood logged every day of a calendar month. Remarkable.",
    category: "mood",
    hint: "Log your mood every day of any calendar month.",
  },
  RESILIENT: {
    icon: "🌸",
    label: "Resilient",
    description: "You recovered from High burnout risk. That's real strength.",
    category: "achievement",
    hint: "Drop your burnout risk from High to Low.",
  },
  CENTURION: {
    icon: "🏅",
    label: "Centurion",
    description: "100-day streak on a single habit. Legendary consistency.",
    category: "habit",
    hint: "Reach a 100-day streak on any habit.",
  },
};

// ─────────────────────────────────────────────────────────────────
// INTERNAL: award a single badge (idempotent)
//
// Called by every check function below.
// Returns true if newly awarded, false if already had it (or error).
// Fires a BADGE_EARNED notification on first award.
// ─────────────────────────────────────────────────────────────────
const awardBadge = async (
  userId: string,
  type: BadgeType,
  relatedId?: string,
): Promise<boolean> => {
  try {
    const already = await hasBadge(userId, type);
    if (already) return false;

    await createBadge(userId, type, relatedId);

    const meta = BADGE_META[type];

    // Fire BADGE_EARNED notification — fire-and-forget, never awaited
    void createNotification({
      userId,
      type: "BADGE_EARNED",
      title: `${meta.icon} Badge Unlocked: ${meta.label}`,
      message: meta.description,
      relatedId: type, // frontend can deep-link to badge shelf
    });

    return true;
  } catch {
    // Silent failure — badge award never crashes a primary operation
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────
// HABIT BADGE CHECKS
//
// Called inside completeHabit() after streak is calculated.
// Usage: void checkAndAwardHabitBadges(userId, currentStreak, habitId)
//
// currentStreak: the streak value just calculated post-completion
// habitId: stored as relatedId so badge detail screen can deep-link
// ─────────────────────────────────────────────────────────────────
export const checkAndAwardHabitBadges = async (
  userId: string,
  currentStreak: number,
  habitId: string,
): Promise<void> => {
  try {
    // IRON_WILL — 30 day streak on any habit
    if (currentStreak >= 30) {
      await awardBadge(userId, BadgeType.IRON_WILL, habitId);
    }

    // CENTURION — 100 day streak on any habit
    if (currentStreak >= 100) {
      await awardBadge(userId, BadgeType.CENTURION, habitId);
    }
  } catch {
    // Silent failure
  }
};

// ─────────────────────────────────────────────────────────────────
// MOOD BADGE CHECKS
//
// Called inside addMood() after mood entry is saved.
//
// totalMoodCount: pass prisma count of all user mood entries
//   → used to detect the very first entry (count === 1)
//
// currentMoodStreak: consecutive daily logging streak
//   → WEEK_ONE triggers at streak >= 7
//
// burnoutDroppedToLow: boolean — true when burnout risk was High
//   on the previous entry and is now Low
//   → computed by comparing previous burnout level (from a DB query
//      in addMood) with the newly-computed level after adding this entry
//
// loggedEveryDayThisMonth: boolean — true if the user has a mood
//   entry for every day in the current calendar month so far
//   → computed by getMoodMonthlyCompletionStatus() in mood.repository
// ─────────────────────────────────────────────────────────────────
export const checkAndAwardMoodBadges = async (
  userId: string,
  opts: {
    totalMoodCount: number;
    currentMoodStreak: number;
    burnoutDroppedToLow: boolean;
    loggedEveryDayThisMonth: boolean;
  },
): Promise<void> => {
  try {
    const {
      totalMoodCount,
      currentMoodStreak,
      burnoutDroppedToLow,
      loggedEveryDayThisMonth,
    } = opts;

    // FIRST_STEP — very first mood entry ever
    if (totalMoodCount === 1) {
      await awardBadge(userId, BadgeType.FIRST_STEP);
    }

    // WEEK_ONE — 7+ consecutive days of mood logging
    if (currentMoodStreak >= 7) {
      await awardBadge(userId, BadgeType.WEEK_ONE);
    }

    // RESILIENT — burnout risk fell from High → Low
    if (burnoutDroppedToLow) {
      await awardBadge(userId, BadgeType.RESILIENT);
    }

    // MINDFUL_MONTH — logged every day of current calendar month
    if (loggedEveryDayThisMonth) {
      await awardBadge(userId, BadgeType.MINDFUL_MONTH);
    }
  } catch {
    // Silent failure
  }
};

// ─────────────────────────────────────────────────────────────────
// GET BADGES — used by GET /api/badges controller
//
// Returns two lists:
//   earned: badges the user has unlocked (with earnedAt date)
//   locked: all remaining badges with hint text + progress info
//
// WHY return locked badges?
//   The "badge shelf" UX shows all possible badges — greyed out if
//   locked — so users know what they're working toward.
//   This is far better retention than only showing earned badges.
// ─────────────────────────────────────────────────────────────────
export const getBadges = async (userId: string) => {
  const earnedRecords = await getBadgesByUser(userId);
  const earnedTypes = new Set(earnedRecords.map((b) => b.type));

  const earned = earnedRecords.map((record) => ({
    ...record,
    ...BADGE_META[record.type],
  }));

  const locked = (Object.keys(BADGE_META) as BadgeType[])
    .filter((type) => !earnedTypes.has(type))
    .map((type) => ({
      type,
      ...BADGE_META[type],
      earnedAt: null,
      relatedId: null,
    }));

  return {
    earned,
    locked,
    summary: {
      total: Object.keys(BADGE_META).length,
      earned: earned.length,
      remaining: locked.length,
    },
  };
};
