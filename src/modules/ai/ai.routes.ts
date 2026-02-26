// src/modules/ai/ai.routes.ts
//
// ─────────────────────────────────────────────────────────────────
// ROUTES — maps HTTP endpoints to controller functions.
//
// All routes here are protected — require a valid JWT.
// The `protect` middleware verifies the token and attaches req.userId.
// ─────────────────────────────────────────────────────────────────

import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { getInsightsController } from "./ai.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: AI Insights
 *   description: AI-powered behavioral analysis combining mood + habit data
 */

/**
 * @swagger
 * /api/ai/insights:
 *   get:
 *     summary: Get AI-powered behavioral insights
 *     description: |
 *       Analyzes the last 90 days of mood scores and habit completion data
 *       to generate personalized behavioral insights.
 *
 *       Results are cached by data hash — if your data hasn't changed,
 *       the cached insights are returned instantly (no OpenAI call).
 *
 *       Use ?refresh=true to force regeneration regardless of cache.
 *
 *       Minimum data requirements to generate insights:
 *       - At least 7 mood entries, OR
 *       - At least 1 habit with 5+ completions
 *
 *     tags: [AI Insights]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: refresh
 *         schema:
 *           type: boolean
 *           example: true
 *         description: Force regenerate insights even if cached data is still valid
 *     responses:
 *       200:
 *         description: AI insights generated or returned from cache
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 insights:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [correlation, streak, warning, positive, suggestion]
 *                       title:
 *                         type: string
 *                         example: "Meditation skips align with your low mood weeks"
 *                       description:
 *                         type: string
 *                         example: "In 3 weeks where mood averaged below 3.0, you completed Morning Meditation 0 times."
 *                       severity:
 *                         type: string
 *                         enum: [info, warning, success]
 *                 cached:
 *                   type: boolean
 *                   example: true
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 *                 message:
 *                   type: string
 *                   example: "Insights served from cache"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: OpenAI API error or server error
 */
router.get("/insights", protect, getInsightsController);

export default router;
