import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import {
  createHabitController,
  getHabitsController,
  getArchivedHabitsController,
  updateHabitController,
  archiveHabitController,
  restoreHabitController,
  completeHabitController,
  undoCompletionController,
  reorderHabitsController,
  updateReminderController,
  getHabitStreakController,
  getHabitAnalyticsController,
  getMonthlyHabitSummaryController,
  getHabitHeatmapController,
  getPaginatedLogsController,
} from "./habit.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Habits
 *   description: Habit tracking, analytics, streaks, and behavioral insights
 */

// ─────────────────────────────────────────────────────────────────
// SCHEMA DEFINITIONS
// ─────────────────────────────────────────────────────────────────
/**
 * @swagger
 * components:
 *   schemas:
 *
 *     CreateHabitRequest:
 *       type: object
 *       required: [title, frequency]
 *       properties:
 *         title:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           example: Morning Meditation
 *         description:
 *           type: string
 *           maxLength: 500
 *           example: 10 minutes mindfulness before work
 *         frequency:
 *           type: string
 *           enum: [daily, weekly]
 *           example: daily
 *         category:
 *           type: string
 *           enum: [health, fitness, learning, mindfulness, productivity, custom]
 *           example: mindfulness
 *         color:
 *           type: string
 *           example: "#7C3AED"
 *           description: Hex color code for UI differentiation
 *         icon:
 *           type: string
 *           example: "🧘"
 *           description: Emoji icon for visual identification
 *         targetPerWeek:
 *           type: integer
 *           minimum: 1
 *           maximum: 7
 *           example: 5
 *           description: Optional weekly goal (e.g. 5/7 days instead of every day)
 *         reminderTime:
 *           type: string
 *           example: "08:00"
 *           description: HH:MM time to send reminder notification
 *         reminderOn:
 *           type: boolean
 *           example: true
 *
 *     HabitResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         frequency:
 *           type: string
 *           enum: [daily, weekly]
 *         category:
 *           type: string
 *         color:
 *           type: string
 *           nullable: true
 *         icon:
 *           type: string
 *           nullable: true
 *         targetPerWeek:
 *           type: integer
 *           nullable: true
 *         sortOrder:
 *           type: integer
 *         isArchived:
 *           type: boolean
 *         reminderTime:
 *           type: string
 *           nullable: true
 *         reminderOn:
 *           type: boolean
 *         userId:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     CompleteHabitResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         log:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             date:
 *               type: string
 *               format: date-time
 *             note:
 *               type: string
 *               nullable: true
 *         currentStreak:
 *           type: integer
 *         milestone:
 *           type: object
 *           nullable: true
 *           properties:
 *             days:
 *               type: integer
 *             message:
 *               type: string
 *
 *     HabitAnalyticsResponse:
 *       type: object
 *       properties:
 *         totalCompletions:
 *           type: integer
 *           example: 18
 *         totalPossiblePeriods:
 *           type: integer
 *           example: 30
 *         completionRate:
 *           type: number
 *           example: 60.00
 *         currentStreak:
 *           type: integer
 *           example: 5
 *         longestStreak:
 *           type: integer
 *           example: 12
 *         missedPeriods:
 *           type: integer
 *           example: 12
 *         bestDayOfWeek:
 *           type: string
 *           example: Monday
 *           nullable: true
 *         consistencyScore:
 *           type: number
 *           example: 72.5
 *           description: 0–100 composite behavioral score
 *
 *     MonthlySummaryResponse:
 *       type: object
 *       properties:
 *         month:
 *           type: string
 *           example: "2026-02"
 *         completionsThisMonth:
 *           type: integer
 *         completionRate:
 *           type: number
 *         calendar:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               completed:
 *                 type: boolean
 *
 *     ReorderRequest:
 *       type: object
 *       required: [habits]
 *       properties:
 *         habits:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               sortOrder:
 *                 type: integer
 *
 *     ReminderRequest:
 *       type: object
 *       required: [reminderOn]
 *       properties:
 *         reminderOn:
 *           type: boolean
 *         reminderTime:
 *           type: string
 *           example: "08:00"
 *
 *     PaginatedLogsResponse:
 *       type: object
 *       properties:
 *         logs:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               note:
 *                 type: string
 *                 nullable: true
 *               completed:
 *                 type: boolean
 *         total:
 *           type: integer
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         totalPages:
 *           type: integer
 */

// ─────────────────────────────────────────────────────────────────
// HABIT CRUD
// ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/habits:
 *   post:
 *     summary: Create a new habit
 *     description: >
 *       Creates a habit with optional category, color, icon, targetPerWeek, and reminder.
 *       Duplicate habits (same title + frequency, case-insensitive) are rejected.
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateHabitRequest'
 *     responses:
 *       201:
 *         description: Habit created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HabitResponse'
 *       400:
 *         description: Validation error or duplicate
 *       401:
 *         description: Unauthorized
 */
router.post("/", protect, createHabitController);

/**
 * @swagger
 * /api/habits:
 *   get:
 *     summary: Get all active habits
 *     description: Returns active habits ordered by sortOrder. Filter by category using query param.
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *           enum: [health, fitness, learning, mindfulness, productivity, custom]
 *         description: Filter habits by category
 *     responses:
 *       200:
 *         description: List of habits
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/HabitResponse'
 */
router.get("/", protect, getHabitsController);

/**
 * @swagger
 * /api/habits/archived:
 *   get:
 *     summary: Get all archived habits
 *     description: >
 *       Returns soft-deleted habits. These have all log history preserved
 *       and can be restored at any time.
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of archived habits
 */
// NOTE: /archived must be registered BEFORE /:id
// Otherwise Express matches "archived" as the :id param
router.get("/archived", protect, getArchivedHabitsController);

/**
 * @swagger
 * /api/habits/reorder:
 *   patch:
 *     summary: Reorder habits
 *     description: >
 *       Updates sortOrder for multiple habits in one atomic transaction.
 *       Send the full new order after a drag-and-drop operation.
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReorderRequest'
 *     responses:
 *       200:
 *         description: Habits reordered
 *       400:
 *         description: Validation error or habit not found
 */
// NOTE: /reorder must also be before /:id
router.patch("/reorder", protect, reorderHabitsController);

/**
 * @swagger
 * /api/habits/{id}:
 *   patch:
 *     summary: Partially update a habit
 *     description: Only provided fields are changed. Omitted fields remain unchanged.
 *     tags: [Habits]
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
 *             $ref: '#/components/schemas/CreateHabitRequest'
 *     responses:
 *       200:
 *         description: Updated habit
 *       400:
 *         description: Validation or duplicate error
 *       404:
 *         description: Habit not found
 */
router.patch("/:id", protect, updateHabitController);

/**
 * @swagger
 * /api/habits/{id}:
 *   delete:
 *     summary: Archive (soft-delete) a habit
 *     description: >
 *       Hides habit from lists. All log history is preserved.
 *       Habit can be restored via PATCH /api/habits/:id/restore.
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Habit archived
 *       404:
 *         description: Habit not found
 */
router.delete("/:id", protect, archiveHabitController);

/**
 * @swagger
 * /api/habits/{id}/restore:
 *   patch:
 *     summary: Restore an archived habit
 *     description: >
 *       Brings an archived habit back to the active list with all history intact.
 *       Blocked if a duplicate active habit now exists (created after archiving).
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Habit restored
 *       400:
 *         description: Habit not archived or duplicate conflict
 *       404:
 *         description: Habit not found
 */
router.patch("/:id/restore", protect, restoreHabitController);

// ─────────────────────────────────────────────────────────────────
// HABIT ACTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/habits/{id}/complete:
 *   post:
 *     summary: Mark habit as completed for the current period
 *     description: >
 *       Daily habits: one completion per calendar day (midnight normalized).
 *       Weekly habits: one completion per ISO week (Monday normalized).
 *       Returns the log entry and current streak.
 *       If a streak milestone (7, 14, 30, etc.) is hit, includes milestone data.
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *                 maxLength: 300
 *                 example: Felt really focused today
 *     responses:
 *       200:
 *         description: Completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompleteHabitResponse'
 *       400:
 *         description: Already completed or archived
 *       404:
 *         description: Habit not found
 */
router.post("/:id/complete", protect, completeHabitController);

/**
 * @swagger
 * /api/habits/{id}/complete:
 *   delete:
 *     summary: Undo last completion
 *     description: >
 *       Removes the most recent completion log.
 *       Only allowed if the most recent log is from the current period.
 *       You cannot undo a log from a previous day/week.
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Completion removed
 *       400:
 *         description: No completions to undo or not current period
 *       404:
 *         description: Habit not found
 */
router.delete("/:id/complete", protect, undoCompletionController);

/**
 * @swagger
 * /api/habits/{id}/reminder:
 *   patch:
 *     summary: Update reminder settings
 *     description: >
 *       Enable or disable reminders for a habit.
 *       reminderTime is required when enabling for the first time.
 *       Disabling does not clear the reminderTime — re-enabling uses the saved time.
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReminderRequest'
 *     responses:
 *       200:
 *         description: Reminder updated
 *       400:
 *         description: Missing reminderTime when enabling
 *       404:
 *         description: Habit not found
 */
router.patch("/:id/reminder", protect, updateReminderController);

// ─────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/habits/{id}/streak:
 *   get:
 *     summary: Get current active streak
 *     description: >
 *       Streak is maintained even if today's period isn't completed yet —
 *       only breaks if a full period was genuinely skipped.
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Current streak
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentStreak:
 *                   type: integer
 *                   example: 7
 */
router.get("/:id/streak", protect, getHabitStreakController);

/**
 * @swagger
 * /api/habits/{id}/analytics:
 *   get:
 *     summary: Get comprehensive habit analytics
 *     description: >
 *       Returns: completion rate, current and longest streaks, missed periods,
 *       best day of week, and a 0–100 consistency score.
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Full analytics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HabitAnalyticsResponse'
 */
router.get("/:id/analytics", protect, getHabitAnalyticsController);

/**
 * @swagger
 * /api/habits/{id}/summary:
 *   get:
 *     summary: Get monthly completion summary
 *     description: >
 *       Returns one entry per day of the given month with a completed flag.
 *       Used for calendar views. Defaults to the current month.
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: month
 *         required: false
 *         schema:
 *           type: string
 *           example: "2026-02"
 *         description: Month in YYYY-MM format (defaults to current month)
 *     responses:
 *       200:
 *         description: Monthly summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MonthlySummaryResponse'
 */
router.get("/:id/summary", protect, getMonthlyHabitSummaryController);

/**
 * @swagger
 * /api/habits/{id}/heatmap:
 *   get:
 *     summary: Get heatmap data
 *     description: >
 *       Returns one entry per day for the last N days with 0/1 completion flag.
 *       Max 730 days (2 years). Use for GitHub-style contribution heatmap.
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         required: false
 *         schema:
 *           type: integer
 *           example: 90
 *     responses:
 *       200:
 *         description: Heatmap data
 */
router.get("/:id/heatmap", protect, getHabitHeatmapController);

/**
 * @swagger
 * /api/habits/{id}/logs:
 *   get:
 *     summary: Get paginated completion logs
 *     description: >
 *       Returns completion log history with pagination.
 *       Default: page 1, limit 20.
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 20
 *     responses:
 *       200:
 *         description: Paginated logs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedLogsResponse'
 */
router.get("/:id/logs", protect, getPaginatedLogsController);

export default router;
