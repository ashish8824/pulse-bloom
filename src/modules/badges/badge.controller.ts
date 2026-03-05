// src/modules/badges/badge.controller.ts
//
// HTTP LAYER — translates HTTP requests into service calls.
//
// Only one endpoint here: GET /api/badges
// All badge awarding happens as side effects in habit/mood services.

import { Request, Response, NextFunction } from "express";
import { getBadges } from "./badge.service";

/**
 * GET /api/badges
 *
 * Returns earned + locked badges for the authenticated user.
 * The "badge shelf" — shows full progress, not just earned.
 */
export const getBadgesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getBadges(req.userId!);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
