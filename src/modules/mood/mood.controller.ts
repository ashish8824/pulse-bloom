import { Request, Response } from "express";
import { createMoodSchema, moodQuerySchema } from "./mood.validation";
import {
  addMood,
  calculateBurnoutRisk,
  calculateMoodAnalytics,
  calculateRollingAverage,
  calculateWeeklyTrend,
  fetchMoods,
} from "./mood.service";

/**
 * Create new mood entry
 */
export const createMood = async (req: Request, res: Response) => {
  try {
    const validated = createMoodSchema.parse(req.body);

    const mood = await addMood(
      validated.moodScore,
      validated.emoji,
      validated.journalText,
      req.userId!,
    );

    res.status(201).json(mood);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get paginated moods
 */
export const getMoods = async (req: Request, res: Response) => {
  try {
    const { page, limit, startDate, endDate } = moodQuerySchema.parse(
      req.query,
    );

    const result = await fetchMoods(
      req.userId!,
      page,
      limit,
      startDate,
      endDate,
    );

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get mood analytics
 */
export const getMoodAnalyticsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { startDate, endDate } = moodQuerySchema.parse(req.query);

    const analytics = await calculateMoodAnalytics(
      req.userId!,
      startDate,
      endDate,
    );

    res.json(analytics);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Weekly trend controller
 */
export const getWeeklyTrend = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = moodQuerySchema.parse(req.query);

    const result = await calculateWeeklyTrend(req.userId!, startDate, endDate);

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Rolling average controller
 */
export const getRollingAverage = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = moodQuerySchema.parse(req.query);

    const result = await calculateRollingAverage(
      req.userId!,
      startDate,
      endDate,
    );

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Burnout risk controller
 */
export const getBurnoutRisk = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = moodQuerySchema.parse(req.query);

    const result = await calculateBurnoutRisk(req.userId!, startDate, endDate);

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
