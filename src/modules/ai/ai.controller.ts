// src/modules/ai/ai.controller.ts
//
// ─────────────────────────────────────────────────────────────────
// CONTROLLER LAYER — thin HTTP adapter.
//
// This file is deliberately minimal. All logic lives in ai.service.ts.
// The controller's only jobs are:
//   1. Extract parameters from req (userId, query params)
//   2. Call the service
//   3. Send the HTTP response
//   4. Forward errors to the global error handler via next()
// ─────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from "express";
import { getAiInsights } from "./ai.service";

/**
 * GET /api/ai/insights
 * GET /api/ai/insights?refresh=true
 *
 * Returns AI-generated behavioral insights for the authenticated user.
 *
 * Query params:
 *   refresh=true  — bypass cache and regenerate fresh insights
 *                   Use this when user explicitly requests "Refresh"
 *
 * Response shape:
 * {
 *   insights: AiInsightItem[],   // array of 0–8 insights
 *   cached: boolean,             // true if served from cache
 *   generatedAt: Date | null,    // when these insights were generated
 *   message: string              // human-readable status
 * }
 */
export const getInsightsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // ?refresh=true bypasses the cache
    // This lets the frontend offer a "Refresh Insights" button
    // without needing a separate endpoint
    const forceRefresh = req.query.refresh === "true";

    const result = await getAiInsights(req.userId!, forceRefresh);

    res.json(result);
  } catch (error) {
    // Forward to global error handler (middlewares/error.middleware.ts)
    // This means OpenAI failures, DB errors, etc. all get handled uniformly
    next(error);
  }
};
