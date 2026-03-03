import { Request, Response, NextFunction } from "express";
import { getMilestoneTimeline } from "./milestone.service";

// ─────────────────────────────────────────────────────────────────
// MILESTONE CONTROLLER — thin HTTP adapter layer
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/milestones
 * Returns the full enriched milestone timeline for the authenticated user.
 */
export const getMilestonesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getMilestoneTimeline(req.userId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
