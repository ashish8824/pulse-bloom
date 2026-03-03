// src/modules/analytics/analytics.routes.ts

import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import {
  getCorrelationController,
  getHabitMatrixController,
} from "./analytics.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Cross-module behavioral analytics (mood ↔ habit correlations, habit pair matrix)
 */

// ─────────────────────────────────────────────────────────────────
// SHARED SCHEMA DEFINITIONS
// ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     CorrelationResult:
 *       type: object
 *       properties:
 *         habitId:
 *           type: string
 *           format: uuid
 *         habitTitle:
 *           type: string
 *           example: "Morning Meditation"
 *         frequency:
 *           type: string
 *           enum: [daily, weekly]
 *         completionDayAvg:
 *           type: number
 *           format: float
 *           description: Average mood score on days the habit was completed
 *           example: 4.2
 *         skipDayAvg:
 *           type: number
 *           format: float
 *           description: Average mood score on days the habit was skipped
 *           example: 2.8
 *         lift:
 *           type: number
 *           format: float
 *           description: completionDayAvg - skipDayAvg. Positive = habit correlates with better mood.
 *           example: 1.4
 *         completionDaysAnalyzed:
 *           type: integer
 *           example: 18
 *         skipDaysAnalyzed:
 *           type: integer
 *           example: 12
 *
 *     CorrelationResponse:
 *       type: object
 *       properties:
 *         correlations:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CorrelationResult'
 *         analyzedDays:
 *           type: integer
 *           example: 90
 *         moodLoggedDays:
 *           type: integer
 *           example: 47
 *         message:
 *           type: string
 *
 *     HabitPairResult:
 *       type: object
 *       properties:
 *         habitA:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             title:
 *               type: string
 *               example: "Morning Meditation"
 *         habitB:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             title:
 *               type: string
 *               example: "Exercise"
 *         coCompletionRate:
 *           type: number
 *           format: float
 *           description: >
 *             Percentage of days where BOTH habits were completed,
 *             out of days where AT LEAST ONE was completed.
 *             Formula: (intersection / union) × 100
 *           example: 78.5
 *         coCompletedDays:
 *           type: integer
 *           description: Number of days both habits were completed
 *           example: 22
 *         eitherCompletedDays:
 *           type: integer
 *           description: Number of days at least one habit was completed (the denominator)
 *           example: 28
 *         suggestion:
 *           type: string
 *           description: Plain-English habit stacking recommendation based on the rate
 *           example: "Strong habit stack — these habits are almost always done together."
 *
 *     HabitMatrixResponse:
 *       type: object
 *       properties:
 *         matrix:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/HabitPairResult'
 *         analyzedDays:
 *           type: integer
 *           example: 90
 *         totalHabits:
 *           type: integer
 *           example: 4
 *         message:
 *           type: string
 */

// ─────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/analytics/correlation:
 *   get:
 *     summary: Mood ↔ Habit Correlation Engine
 *     description: >
 *       For each active habit, computes the average mood score on days it was
 *       completed vs days it was skipped over the last 90 days.
 *
 *       **lift** = completionDayAvg − skipDayAvg
 *       - Positive lift → completing this habit correlates with better mood
 *       - Negative lift → completing this habit correlates with worse mood
 *
 *       Results sorted by lift descending. Habits with fewer than 3 data
 *       points in either group are excluded.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Correlation data returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CorrelationResponse'
 *             examples:
 *               withData:
 *                 summary: User with sufficient data
 *                 value:
 *                   correlations:
 *                     - habitId: "uuid-1"
 *                       habitTitle: "Morning Meditation"
 *                       frequency: "daily"
 *                       completionDayAvg: 4.2
 *                       skipDayAvg: 2.8
 *                       lift: 1.4
 *                       completionDaysAnalyzed: 18
 *                       skipDaysAnalyzed: 12
 *                   analyzedDays: 90
 *                   moodLoggedDays: 47
 *                   message: "Sorted by mood impact. Positive lift = habit days have higher average mood than skip days."
 *       401:
 *         description: Missing or invalid access token
 */
router.get("/correlation", protect, getCorrelationController);

/**
 * @swagger
 * /api/analytics/habit-matrix:
 *   get:
 *     summary: Habit Correlation Matrix
 *     description: >
 *       For every pair of active habits, computes the **co-completion rate**:
 *       the percentage of days where both were completed, out of days where
 *       at least one was completed.
 *
 *       **Formula:** `coCompletionRate = (bothDays / eitherDays) × 100`
 *
 *       **Why union-based denominator?**
 *       Using total calendar days would unfairly penalise recently-created habits
 *       that have ~83 "missed" days before they even existed. The union denominator
 *       only counts days where at least one habit was active, giving a fair rate.
 *
 *       **Suggestion thresholds:**
 *       | Rate | Label |
 *       |------|-------|
 *       | ≥ 80% | Strong habit stack — consider combining into one routine |
 *       | ≥ 60% | Often paired — try intentionally stacking |
 *       | ≥ 40% | Occasional overlap — possible stack opportunity |
 *       | < 40% | Rarely together — independent habits |
 *
 *       Results sorted by co-completion rate descending. Pairs with fewer than
 *       3 combined days are excluded. Requires at least 2 active habits.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Habit matrix returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HabitMatrixResponse'
 *             examples:
 *               withData:
 *                 summary: User with 3 habits and sufficient data
 *                 value:
 *                   matrix:
 *                     - habitA:
 *                         id: "uuid-1"
 *                         title: "Morning Meditation"
 *                       habitB:
 *                         id: "uuid-2"
 *                         title: "Exercise"
 *                       coCompletionRate: 78.57
 *                       coCompletedDays: 22
 *                       eitherCompletedDays: 28
 *                       suggestion: "\"Morning Meditation\" and \"Exercise\" are often completed on the same day. Try intentionally pairing them."
 *                     - habitA:
 *                         id: "uuid-1"
 *                         title: "Morning Meditation"
 *                       habitB:
 *                         id: "uuid-3"
 *                         title: "Reading"
 *                       coCompletionRate: 34.48
 *                       coCompletedDays: 10
 *                       eitherCompletedDays: 29
 *                       suggestion: "\"Morning Meditation\" and \"Reading\" are rarely completed on the same day — they appear to be independent habits."
 *                   analyzedDays: 90
 *                   totalHabits: 3
 *                   message: "Sorted by co-completion rate. High rate = strong habit stack candidate."
 *               notEnoughHabits:
 *                 summary: User with only 1 active habit
 *                 value:
 *                   matrix: []
 *                   analyzedDays: 90
 *                   totalHabits: 1
 *                   message: "You need at least 2 active habits to see correlation data. Create more habits to unlock this feature."
 *       401:
 *         description: Missing or invalid access token
 */
router.get("/habit-matrix", protect, getHabitMatrixController);

export default router;
