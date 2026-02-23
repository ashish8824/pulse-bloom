import { Request, Response } from "express";
import { createHabitSchema } from "./habit.validation";
import {
  calculateHabitAnalytics,
  calculateHabitStreak,
  completeHabit,
  createHabit,
  fetchUserHabits,
} from "./habit.service";

/**
 * Create Habit Controller
 */
export const createHabitController = async (req: Request, res: Response) => {
  try {
    const validated = createHabitSchema.parse(req.body);

    const habit = await createHabit(
      validated.title,
      validated.description,
      validated.frequency,
      req.userId!,
    );

    res.status(201).json(habit);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get Habits Controller
 */
export const getHabitsController = async (req: Request, res: Response) => {
  const habits = await fetchUserHabits(req.userId!);
  res.json(habits);
};

/**
 * Mark habit completed
 */
export const completeHabitController = async (req: Request, res: Response) => {
  try {
    const result = await completeHabit(req.params.id, req.userId!);

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get habit streak
 */
export const getHabitStreakController = async (req: Request, res: Response) => {
  try {
    const result = await calculateHabitStreak(req.params.id, req.userId!);

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get full habit analytics
 */
export const getHabitAnalyticsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const result = await calculateHabitAnalytics(req.params.id, req.userId!);

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
