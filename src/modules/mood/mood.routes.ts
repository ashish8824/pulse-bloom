import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import {
  createMood,
  getMoodByIdController,
  updateMoodController,
  deleteMoodController,
  getMoods,
  getMoodAnalyticsController,
  getWeeklyTrend,
  getRollingAverage,
  getBurnoutRisk,
  getMoodStreakController,
  getMoodHeatmapController,
  getMoodMonthlySummaryController,
  getMoodDailyInsightsController,
} from "./mood.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Mood
 *   description: Mood tracking, journaling, and analytics APIs
 */

// ─────────────────────────────────────────────────────────────────
// SHARED COMPONENT SCHEMAS
// Defined once here, referenced by $ref throughout the file.
// ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     CreateMoodRequest:
 *       type: object
 *       required:
 *         - moodScore
 *         - emoji
 *       properties:
 *         moodScore:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 4
 *         emoji:
 *           type: string
 *           example: "😊"
 *         journalText:
 *           type: string
 *           maxLength: 5000
 *           example: "Had a productive deep work session today."
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["work", "exercise"]
 *           description: Lowercase alphanumeric context slugs (max 10)
 *
 *     UpdateMoodRequest:
 *       type: object
 *       description: All fields optional. At least one must be provided.
 *       properties:
 *         moodScore:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 3
 *         emoji:
 *           type: string
 *           example: "😐"
 *         journalText:
 *           type: string
 *           nullable: true
 *           example: "Updated reflection."
 *           description: Send null to delete the journal entry.
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["sleep"]
 *
 *     MoodEntry:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         moodScore:
 *           type: integer
 *         emoji:
 *           type: string
 *         journalId:
 *           type: string
 *           nullable: true
 *           description: MongoDB ObjectId of the linked journal (null if none)
 *         userId:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     MoodEntryHydrated:
 *       allOf:
 *         - $ref: '#/components/schemas/MoodEntry'
 *         - type: object
 *           properties:
 *             journal:
 *               nullable: true
 *               type: object
 *               properties:
 *                 text:
 *                   type: string
 *                 tags:
 *                   type: array
 *                   items:
 *                     type: string
 *
 *     PaginatedMoodResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MoodEntry'
 *         pagination:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             totalPages:
 *               type: integer
 *
 *     MoodStreakResponse:
 *       type: object
 *       properties:
 *         currentStreak:
 *           type: integer
 *           example: 12
 *           description: Consecutive days with at least one mood logged (today or yesterday as anchor)
 *         longestStreak:
 *           type: integer
 *           example: 30
 *         lastLoggedDate:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2026-02-26"
 *
 *     HeatmapEntry:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           example: "2026-02-15"
 *         averageScore:
 *           type: number
 *           example: 3.5
 *           description: Average mood for this day (0 = no entry logged)
 *         count:
 *           type: integer
 *           example: 2
 *           description: Number of entries logged on this day
 *
 *     MoodHeatmapResponse:
 *       type: object
 *       properties:
 *         heatmap:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/HeatmapEntry'
 *         totalDays:
 *           type: integer
 *           example: 365
 *         loggedDays:
 *           type: integer
 *           example: 87
 *
 *     CalendarDay:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           example: "2026-02-14"
 *         day:
 *           type: integer
 *           example: 14
 *         averageScore:
 *           type: number
 *           nullable: true
 *           example: 4.0
 *           description: Average mood for this day, null if nothing logged
 *         count:
 *           type: integer
 *           example: 1
 *
 *     MoodMonthlySummaryResponse:
 *       type: object
 *       properties:
 *         month:
 *           type: string
 *           example: "2026-02"
 *         totalEntries:
 *           type: integer
 *           example: 35
 *         loggedDays:
 *           type: integer
 *           example: 22
 *         averageMood:
 *           type: number
 *           nullable: true
 *           example: 3.7
 *         bestDay:
 *           nullable: true
 *           type: object
 *           properties:
 *             date:
 *               type: string
 *             averageScore:
 *               type: number
 *         worstDay:
 *           nullable: true
 *           type: object
 *           properties:
 *             date:
 *               type: string
 *             averageScore:
 *               type: number
 *         calendar:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CalendarDay'
 *
 *     BurnoutRiskResponse:
 *       type: object
 *       properties:
 *         riskScore:
 *           type: number
 *           example: 8.5
 *         riskLevel:
 *           type: string
 *           enum: [Low, Moderate, High, Insufficient Data]
 *         message:
 *           type: string
 *           nullable: true
 *         metrics:
 *           nullable: true
 *           type: object
 *           properties:
 *             totalEntries:
 *               type: integer
 *             averageMood:
 *               type: number
 *             lowMoodDays:
 *               type: integer
 *             volatility:
 *               type: number
 */

// ─────────────────────────────────────────────────────────────────
// IMPORTANT — ROUTE ORDER
//
// Express matches routes top-to-bottom.
// All static paths (/streak, /heatmap, /analytics, etc.) MUST be
// registered BEFORE the dynamic /:id route.
// If /:id comes first, "streak" would be treated as an id param.
// ─────────────────────────────────────────────────────────────────

// ─── STATIC / ANALYTICS ROUTES (must come before /:id) ────────────

/**
 * @swagger
 * /api/mood/streak:
 *   get:
 *     summary: Get mood logging streak
 *     description: |
 *       Returns the current consecutive-day logging streak.
 *       Streak stays alive through end of today — if you haven't
 *       logged today yet but logged yesterday, streak is still active.
 *       Also returns the all-time longest streak and the last logged date.
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Streak data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MoodStreakResponse'
 *       401:
 *         description: Unauthorized
 */
router.get("/streak", protect, getMoodStreakController);

/**
 * @swagger
 * /api/mood/heatmap:
 *   get:
 *     summary: Get GitHub-style mood heatmap
 *     description: |
 *       Returns one entry per calendar day for the requested window.
 *       `averageScore` is 0 when no entry was logged that day,
 *       or the average mood score (1–5) when entries exist.
 *       `count` is the number of entries logged on that day.
 *       Frontend maps averageScore → colour intensity.
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 365
 *           maximum: 730
 *         description: Number of past days to include (max 730 = 2 years)
 *     responses:
 *       200:
 *         description: Heatmap data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MoodHeatmapResponse'
 *       400:
 *         description: Invalid days parameter
 *       401:
 *         description: Unauthorized
 */
router.get("/heatmap", protect, getMoodHeatmapController);

/**
 * @swagger
 * /api/mood/summary/monthly:
 *   get:
 *     summary: Get monthly calendar summary
 *     description: |
 *       Returns per-day mood data for a calendar month, plus month-level
 *       aggregates: total entries, logged days, average mood, best/worst day.
 *       Days with no entries have averageScore: null.
 *       Defaults to the current month if `month` is not provided.
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           example: "2026-02"
 *         description: Target month in YYYY-MM format. Defaults to current month.
 *     responses:
 *       200:
 *         description: Monthly summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MoodMonthlySummaryResponse'
 *       400:
 *         description: Invalid month format
 *       401:
 *         description: Unauthorized
 */
router.get("/summary/monthly", protect, getMoodMonthlySummaryController);

/**
 * @swagger
 * /api/mood/insights/daily:
 *   get:
 *     summary: Get day-of-week and time-of-day mood patterns
 *     description: |
 *       Analyses mood entries to surface two behavioural patterns:
 *
 *       **Day-of-week pattern** — which weekday has your best/worst average mood,
 *       and which day you log most consistently.
 *
 *       **Time-of-day pattern** — breaks logging into four buckets
 *       (Morning 5am–12pm / Afternoon 12pm–5pm / Evening 5pm–9pm / Night 9pm–5am)
 *       and shows which time of day you feel best.
 *
 *       Requires at least 5 entries. Defaults to all-time data;
 *       use startDate/endDate to scope to a specific period.
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-02-28"
 *     responses:
 *       200:
 *         description: Day-of-week and time-of-day insight data
 *       401:
 *         description: Unauthorized
 */
router.get("/insights/daily", protect, getMoodDailyInsightsController);

/**
 * @swagger
 * /api/mood/analytics:
 *   get:
 *     summary: Get mood analytics
 *     description: |
 *       Returns summary statistics: total entries, average score,
 *       highest/lowest score, most frequent mood, and distribution
 *       across all 5 score values.
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Mood analytics
 *       401:
 *         description: Unauthorized
 */
router.get("/analytics", protect, getMoodAnalyticsController);

/**
 * @swagger
 * /api/mood/trends/weekly:
 *   get:
 *     summary: Get weekly mood trends
 *     description: |
 *       Groups mood entries by ISO 8601 week and returns the average score
 *       and entry count per week. Weeks are labeled YYYY-WNN (e.g. 2026-W08).
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Weekly trend data
 *       401:
 *         description: Unauthorized
 */
router.get("/trends/weekly", protect, getWeeklyTrend);

/**
 * @swagger
 * /api/mood/trends/rolling:
 *   get:
 *     summary: Get rolling 7-day mood average
 *     description: |
 *       For each date with an entry, calculates the average mood score
 *       across the 7-day window ending on that date.
 *       Multiple entries on the same day are averaged before the window calculation.
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Rolling average array
 *       401:
 *         description: Unauthorized
 */
router.get("/trends/rolling", protect, getRollingAverage);

/**
 * @swagger
 * /api/mood/burnout-risk:
 *   get:
 *     summary: Calculate burnout risk score
 *     description: |
 *       Combines three signals into a risk score:
 *       low mood frequency (≤2) × 2 | mood deficit below 3.0 × 3 | volatility × 1.5
 *       Risk levels — 0–5: Low | 5–10: Moderate | 10+: High
 *       Requires at least 3 entries.
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Burnout risk result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BurnoutRiskResponse'
 *       401:
 *         description: Unauthorized
 */
router.get("/burnout-risk", protect, getBurnoutRisk);

// ─── LIST ─────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/mood:
 *   get:
 *     summary: Get paginated mood history
 *     description: Returns mood entries in reverse-chronological order with optional date filtering.
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-02-01"
 *         description: Inclusive start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-02-28"
 *         description: Inclusive end date — includes all entries up to 23:59:59 on this day
 *     responses:
 *       200:
 *         description: Paginated mood list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedMoodResponse'
 *       400:
 *         description: Invalid date format or range
 *       401:
 *         description: Unauthorized
 */
router.get("/", protect, getMoods);

// ─── CREATE ───────────────────────────────────────────────────────

/**
 * @swagger
 * /api/mood:
 *   post:
 *     summary: Create a new mood entry
 *     description: |
 *       Logs a mood score and emoji to PostgreSQL.
 *       If `journalText` is provided, it is saved in MongoDB and linked
 *       to the mood entry via `journalId`.
 *       Optional `tags` provide context for analytics and AI insights.
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
 *         description: Mood entry created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MoodEntry'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/", protect, createMood);

// ─── SINGLE ENTRY (/:id must come last) ───────────────────────────

/**
 * @swagger
 * /api/mood/{id}:
 *   get:
 *     summary: Get a single mood entry (with journal text)
 *     description: |
 *       Fetches a mood entry by id, hydrated with its linked journal text and tags.
 *       Returns 404 if the entry doesn't exist, 403 if it belongs to another user.
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Mood entry with journal
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MoodEntryHydrated'
 *       403:
 *         description: Forbidden — entry belongs to another user
 *       404:
 *         description: Entry not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", protect, getMoodByIdController);

/**
 * @swagger
 * /api/mood/{id}:
 *   patch:
 *     summary: Update a mood entry
 *     description: |
 *       Partially updates a mood entry. Only provided fields are changed.
 *       **Journal handling:**
 *       - Provide `journalText` string → update (or create) the journal entry
 *       - Send `journalText: null` → delete the linked journal entry
 *       - Omit `journalText` → journal is untouched
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMoodRequest'
 *     responses:
 *       200:
 *         description: Updated mood entry
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MoodEntry'
 *       400:
 *         description: Validation error or empty update body
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Entry not found
 *       401:
 *         description: Unauthorized
 */
router.patch("/:id", protect, updateMoodController);

/**
 * @swagger
 * /api/mood/{id}:
 *   delete:
 *     summary: Delete a mood entry
 *     description: |
 *       Permanently deletes the mood entry from PostgreSQL and its
 *       linked journal document from MongoDB (if one exists).
 *       This action is irreversible.
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Entry deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Mood entry deleted successfully"
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Entry not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/:id", protect, deleteMoodController);

export default router;
