import { Request, Response, NextFunction } from "express";
import {
  calculateMoodHabitCorrelation,
  calculateHabitMatrix,
} from "./analytics.service";

// ─────────────────────────────────────────────────────────────────
// ANALYTICS CONTROLLER — thin HTTP adapter layer
// Responsibilities: parse input → call service → send response
// No business logic. All errors forwarded to next() for the
// global error handler to format and return.
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/analytics/correlation
 *
 * Returns mood ↔ habit correlation for all active habits,
 * sorted by mood impact (lift) descending.
 */
export const getCorrelationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await calculateMoodHabitCorrelation(req.userId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/habit-matrix
 *
 * Returns co-completion rate for every pair of active habits,
 * sorted by rate descending.
 */
export const getHabitMatrixController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await calculateHabitMatrix(req.userId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
