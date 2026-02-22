import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import {
  createMood,
  getMoodAnalyticsController,
  getMoodAnalyticsController,
  getMoods,
  getWeeklyTrend,
} from "./mood.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Mood
 *   description: Mood tracking and journaling APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateMoodRequest:
 *       type: object
 *       required:
 *         - moodScore
 *         - emoji
 *         - journalText
 *       properties:
 *         moodScore:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 4
 *           description: Mood score on a scale of 1 (low) to 5 (excellent)
 *         emoji:
 *           type: string
 *           example: 😊
 *           description: Emoji representation of mood
 *         journalText:
 *           type: string
 *           example: Had a productive day at work.
 *           description: User journal entry for the day
 *
 *     MoodResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: 5c9fbb48-11a0-4e89-b2f5-7f66e4f3b2a2
 *         moodScore:
 *           type: integer
 *           example: 4
 *         emoji:
 *           type: string
 *           example: 😊
 *         journalId:
 *           type: string
 *           example: 65d4fa21bc92b3bcd23e4567
 *         userId:
 *           type: string
 *           example: 8e4f1a23-1111-2222-3333-abcdef123456
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     MoodListResponse:
 *       type: array
 *       items:
 *         $ref: '#/components/schemas/MoodResponse'
 *
 *     UnauthorizedError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: Not authorized. Token missing.
 */

/**
 * @swagger
 * /api/mood:
 *   post:
 *     summary: Create a new mood entry
 *     description: |
 *       Creates a mood entry for the authenticated user.
 *       Stores structured mood data in PostgreSQL and journal text in MongoDB.
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMoodRequest'
 *     responses:
 *       201:
 *         description: Mood entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MoodResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.post("/", protect, createMood);

/**
 * @swagger
 * /api/mood:
 *   get:
 *     summary: Get paginated mood history with optional date filtering
 *     description: |
 *       Retrieves paginated mood entries.
 *       You can filter results by date range using startDate and endDate.
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number (default 1)
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Records per page (max 100)
 *
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: 2026-02-01
 *         description: Filter moods from this date (inclusive)
 *
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: 2026-02-20
 *         description: Filter moods until this date (inclusive)
 *
 *     responses:
 *       200:
 *         description: Filtered paginated mood list
 */
router.get("/", protect, getMoods);

/**
 * @swagger
 * /api/mood/analytics:
 *   get:
 *     summary: Get mood analytics
 *     description: |
 *       Returns mood statistics including average score,
 *       distribution, most frequent mood, and extremes.
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: 2026-02-01
 *         description: Filter analytics from this date
 *
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: 2026-02-20
 *         description: Filter analytics until this date
 *
 *     responses:
 *       200:
 *         description: Mood analytics data
 */
router.get("/analytics", protect, getMoodAnalyticsController);

/**
 * @swagger
 * /api/mood/trends/weekly:
 *   get:
 *     summary: Get weekly mood trends
 *     description: Returns weekly grouped average mood scores.
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: 2026-01-01
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: 2026-02-28
 *     responses:
 *       200:
 *         description: Weekly trend data
 */
router.get("/trends/weekly", protect, getWeeklyTrend);

export default router;
