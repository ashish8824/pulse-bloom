// src/modules/ai/ai.routes.ts
//
// ─────────────────────────────────────────────────────────────────
// CHANGE FROM ORIGINAL:
//   1. Import checkPlanLimit from planLimiter
//   2. Add checkPlanLimit("ai_insights") to GET /insights
//      Free users receive a 403 with upgrade prompt — never reach the controller.
// ─────────────────────────────────────────────────────────────────

import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { checkPlanLimit } from "../../middlewares/planLimiter"; // ← NEW
import {
  getInsightsController,
  getSuggestionsController,
  getChatResponseController,
} from "./ai.controller"; // ← PHASE 5 additions

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
 *       **Plan restriction:** Available on Pro and Enterprise plans only.
 *       Free plan users receive a 403 with an upgrade prompt.
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
 *       403:
 *         description: Plan limit — AI insights require Pro or Enterprise plan
 *       500:
 *         description: OpenAI API error or server error
 */
// ↓ protect → checkPlanLimit("ai_insights") → controller
//   Free users are hard-blocked with a 403 upgrade prompt before the controller runs.
router.get(
  "/insights",
  protect,
  checkPlanLimit("ai_insights"),
  getInsightsController,
);

// ─────────────────────────────────────────────────────────────────
// PHASE 5 ROUTES
// ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/ai/suggestions:
 *   get:
 *     summary: Get smart habit suggestions
 *     description: |
 *       Generates 3 personalized habit suggestions based on:
 *       - Current burnout risk level
 *       - Day-of-week mood patterns (best/worst days)
 *       - Existing active habits (never suggests duplicates)
 *       - Overall mood average
 *
 *       Results are cached by a hash of the context data.
 *       If your habits and mood haven't changed, cache is served.
 *       Use ?refresh=true to force regeneration.
 *
 *       **Plan restriction:** Pro and Enterprise only.
 *     tags: [AI Insights]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: refresh
 *         schema:
 *           type: boolean
 *         description: Force regenerate even if cache is valid
 *     responses:
 *       200:
 *         description: 3 habit suggestions (or insufficient data message)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                         example: "10-Minute Morning Walk"
 *                       frequency:
 *                         type: string
 *                         enum: [daily, weekly]
 *                       category:
 *                         type: string
 *                         example: fitness
 *                       rationale:
 *                         type: string
 *                         example: "Your mood is consistently lowest on Mondays. A morning walk could help ease into the week."
 *                       expectedMoodImpact:
 *                         type: string
 *                         example: "Physical activity in the morning is linked to sustained mood improvement throughout the day."
 *                 cached:
 *                   type: boolean
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Pro or Enterprise plan required
 */
router.get(
  "/suggestions",
  protect,
  checkPlanLimit("ai_insights"),
  getSuggestionsController,
);

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Chat with AI wellness coach
 *     description: |
 *       Sends a message to the personalized AI wellness coach.
 *
 *       The coach has full access to the user's 90-day behavioral summary
 *       (mood averages, burnout risk, habit streaks, completion rates)
 *       injected into every call — so it can reference your actual data.
 *
 *       Conversation history is maintained in MongoDB. Pass the returned
 *        in subsequent requests to continue the same conversation.
 *       Omit it (or send null) to start a new conversation.
 *
 *       Max 10 messages sent to the AI per call (context window management).
 *       Max 50 messages stored per conversation. Max 20 conversations per user.
 *
 *       **Plan restriction:** Pro and Enterprise only.
 *     tags: [AI Insights]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Why do I always feel worse on Fridays?"
 *               conversationId:
 *                 type: string
 *                 nullable: true
 *                 example: "65d4fa21bc92b3bcd23e4567"
 *                 description: MongoDB _id of existing conversation. Omit to start a new one.
 *     responses:
 *       200:
 *         description: AI coach reply
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reply:
 *                   type: string
 *                   example: "Looking at your data, your mood does tend to dip on Fridays — averaging about 2.6 compared to your 3.4 weekly average. This could be end-of-week fatigue accumulating..."
 *                 conversationId:
 *                   type: string
 *                   example: "65d4fa21bc92b3bcd23e4567"
 *                   description: Pass this back in your next request to continue the conversation.
 *                 messageCount:
 *                   type: integer
 *                   example: 4
 *                   description: Total messages in this conversation (user + assistant combined)
 *       400:
 *         description: message is required or too long
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Pro or Enterprise plan required
 */
router.post(
  "/chat",
  protect,
  checkPlanLimit("ai_insights"),
  getChatResponseController,
);

export default router;
