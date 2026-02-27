import { Request, Response, NextFunction } from "express";
import {
  createMoodSchema,
  updateMoodSchema,
  moodQuerySchema,
  heatmapQuerySchema,
  monthlySummaryQuerySchema,
} from "./mood.validation";
import {
  addMood,
  getMoodById,
  updateMood,
  deleteMood,
  fetchMoods,
  calculateMoodAnalytics,
  calculateWeeklyTrend,
  calculateRollingAverage,
  calculateBurnoutRisk,
  calculateMoodStreak,
  generateMoodHeatmap,
  getMoodMonthlySummary,
  getMoodDailyInsights,
} from "./mood.service";

// ─────────────────────────────────────────────────────────────────
// MOOD CONTROLLERS — thin HTTP adapter layer
//
// Responsibilities (ONLY these):
//   1. Parse and validate input via Zod schemas
//   2. Call the service layer
//   3. Send the HTTP response
//   4. Forward ALL errors to next() — never swallow them
//
// No business logic. No DB calls. No try-catch that hides errors.
// next(error) routes ZodErrors → 400, AppErrors → correct status,
// unknown errors → 500, all through the global error handler.
// ─────────────────────────────────────────────────────────────────

// ─── CRUD ─────────────────────────────────────────────────────────

/** POST /api/mood */
export const createMood = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validated = createMoodSchema.parse(req.body);
    const mood = await addMood(validated, req.userId!);
    res.status(201).json(mood);
  } catch (error) {
    next(error);
  }
};

/** GET /api/mood/:id — single entry hydrated with journal text */
export const getMoodByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getMoodById(req.params.id, req.userId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/mood/:id — partial update */
export const updateMoodController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const validated = updateMoodSchema.parse(req.body);
    const updated = await updateMood(req.params.id, req.userId!, validated);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/mood/:id — hard delete entry + journal */
export const deleteMoodController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await deleteMood(req.params.id, req.userId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ─── LIST ─────────────────────────────────────────────────────────

/** GET /api/mood — paginated list with optional date range */
export const getMoods = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
  } catch (error) {
    next(error);
  }
};

// ─── ANALYTICS ────────────────────────────────────────────────────

/** GET /api/mood/analytics */
export const getMoodAnalyticsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { startDate, endDate } = moodQuerySchema.parse(req.query);
    const result = await calculateMoodAnalytics(
      req.userId!,
      startDate,
      endDate,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/** GET /api/mood/trends/weekly */
export const getWeeklyTrend = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { startDate, endDate } = moodQuerySchema.parse(req.query);
    const result = await calculateWeeklyTrend(req.userId!, startDate, endDate);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/** GET /api/mood/trends/rolling */
export const getRollingAverage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { startDate, endDate } = moodQuerySchema.parse(req.query);
    const result = await calculateRollingAverage(
      req.userId!,
      startDate,
      endDate,
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/** GET /api/mood/burnout-risk */
export const getBurnoutRisk = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { startDate, endDate } = moodQuerySchema.parse(req.query);
    const result = await calculateBurnoutRisk(req.userId!, startDate, endDate);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ─── NEW FEATURES ─────────────────────────────────────────────────

/** GET /api/mood/streak — consecutive logging streak */
export const getMoodStreakController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await calculateMoodStreak(req.userId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/** GET /api/mood/heatmap?days=365 — GitHub-style daily mood heatmap */
export const getMoodHeatmapController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { days } = heatmapQuerySchema.parse(req.query);
    const result = await generateMoodHeatmap(req.userId!, days);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/** GET /api/mood/summary/monthly?month=2026-02 — calendar view for a month */
export const getMoodMonthlySummaryController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { month } = monthlySummaryQuerySchema.parse(req.query);
    // Default to current month if not provided
    const targetMonth = month ?? new Date().toISOString().slice(0, 7);
    const result = await getMoodMonthlySummary(req.userId!, targetMonth);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/** GET /api/mood/insights/daily — day-of-week + time-of-day patterns */
export const getMoodDailyInsightsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { startDate, endDate } = moodQuerySchema.parse(req.query);
    const result = await getMoodDailyInsights(req.userId!, startDate, endDate);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
