import {
  createHabitRecord,
  getHabitsByUser,
  getHabitWithLogs,
} from "./habit.repository";

import {
  createHabitLog,
  getHabitLogs,
  findHabitById,
} from "./habit.repository";

import {
  normalizeDailyDate,
  normalizeWeeklyDate,
} from "../../utils/date.utils";

/**
 * Business logic to create habit
 */
export const createHabit = async (
  title: string,
  description: string | undefined,
  frequency: "daily" | "weekly",
  userId: string,
) => {
  // Future business rules can go here
  // e.g., limit max habits per user

  return createHabitRecord({
    title,
    description,
    frequency,
    userId,
  });
};

/**
 * Fetch habits for authenticated user
 */
export const fetchUserHabits = async (userId: string) => {
  return getHabitsByUser(userId);
};

/**
 * Mark habit as completed
 */
export const completeHabit = async (habitId: string, userId: string) => {
  const habit = await findHabitById(habitId);

  if (!habit || habit.userId !== userId) {
    throw new Error("Habit not found");
  }

  const date =
    habit.frequency === "daily" ? normalizeDailyDate() : normalizeWeeklyDate();

  try {
    await createHabitLog(habitId, date);
  } catch (error: any) {
    if (error.code === "P2002") {
      throw new Error("Habit already completed for this period");
    }
    throw error;
  }

  return { message: "Habit marked as completed" };
};

/**
 * Calculate current streak
 */
export const calculateHabitStreak = async (habitId: string, userId: string) => {
  const habit = await findHabitById(habitId);

  if (!habit || habit.userId !== userId) {
    throw new Error("Habit not found");
  }

  const logs = await getHabitLogs(habitId);

  if (logs.length === 0) {
    return { streak: 0 };
  }

  let streak = 0;
  let expectedDate =
    habit.frequency === "daily" ? normalizeDailyDate() : normalizeWeeklyDate();

  for (const log of logs) {
    const logDate = new Date(log.date);
    logDate.setHours(0, 0, 0, 0);

    if (logDate.getTime() === expectedDate.getTime()) {
      streak++;

      if (habit.frequency === "daily") {
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        expectedDate.setDate(expectedDate.getDate() - 7);
      }
    } else {
      break;
    }
  }

  return { streak };
};

/**
 * Calculate full habit analytics
 */
export const calculateHabitAnalytics = async (
  habitId: string,
  userId: string,
) => {
  const habit = await getHabitWithLogs(habitId);

  if (!habit || habit.userId !== userId) {
    throw new Error("Habit not found");
  }

  const logs = habit.logs;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const created = new Date(habit.createdAt);
  created.setHours(0, 0, 0, 0);

  const diffTime = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const totalPossiblePeriods =
    habit.frequency === "daily" ? diffDays + 1 : Math.floor(diffDays / 7) + 1;

  const totalCompletions = logs.length;

  const completionRate =
    totalPossiblePeriods > 0
      ? (totalCompletions / totalPossiblePeriods) * 100
      : 0;

  // Calculate longest streak
  let longestStreak = 0;
  let currentStreak = 0;

  for (let i = 1; i < logs.length; i++) {
    const prev = new Date(logs[i - 1].date);
    const curr = new Date(logs[i].date);

    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    const expectedGap = habit.frequency === "daily" ? 1 : 7;

    if (diff === expectedGap) {
      currentStreak++;
    } else {
      currentStreak = 1;
    }

    longestStreak = Math.max(longestStreak, currentStreak);
  }

  const missedPeriods = totalPossiblePeriods - totalCompletions;

  return {
    totalCompletions,
    totalPossiblePeriods,
    completionRate: Number(completionRate.toFixed(2)),
    longestStreak,
    missedPeriods,
  };
};
