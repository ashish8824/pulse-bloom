import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import {
  completeHabitController,
  createHabitController,
  getHabitAnalyticsController,
  getHabitsController,
  getHabitStreakController,
} from "./habit.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Habits
 *   description: Habit creation and management APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateHabitRequest:
 *       type: object
 *       required:
 *         - title
 *         - frequency
 *       properties:
 *         title:
 *           type: string
 *           example: Morning Meditation
 *         description:
 *           type: string
 *           example: 10 minutes mindfulness daily
 *         frequency:
 *           type: string
 *           enum: [daily, weekly]
 *           example: daily
 *
 *     HabitResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         frequency:
 *           type: string
 *         userId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/habits:
 *   post:
 *     summary: Create a new habit
 *     description: Creates a new habit for the authenticated user.
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
 *         description: Habit created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HabitResponse'
 *       400:
 *         description: Validation error
 */
router.post("/", protect, createHabitController);

/**
 * @swagger
 * /api/habits:
 *   get:
 *     summary: Get user habits
 *     description: Returns all habits belonging to the authenticated user.
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of habits
 */
router.get("/", protect, getHabitsController);

/**
 * @swagger
 * /api/habits/{id}/complete:
 *   post:
 *     summary: Mark habit as completed
 *     description: Marks a habit as completed for the current day or week.
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Habit ID
 *     responses:
 *       200:
 *         description: Habit marked completed
 *       400:
 *         description: Habit already completed or invalid
 */
router.post("/:id/complete", protect, completeHabitController);

/**
 * @swagger
 * /api/habits/{id}/streak:
 *   get:
 *     summary: Get current habit streak
 *     description: Returns the current streak count for the habit.
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
 *         description: Streak value
 */
router.get("/:id/streak", protect, getHabitStreakController);

/**
 * @swagger
 * components:
 *   schemas:
 *     HabitAnalyticsResponse:
 *       type: object
 *       properties:
 *         totalCompletions:
 *           type: integer
 *           example: 12
 *         totalPossiblePeriods:
 *           type: integer
 *           example: 20
 *         completionRate:
 *           type: number
 *           example: 60
 *         longestStreak:
 *           type: integer
 *           example: 5
 *         missedPeriods:
 *           type: integer
 *           example: 8
 */

/**
 * @swagger
 * /api/habits/{id}/analytics:
 *   get:
 *     summary: Get habit analytics
 *     description: Returns completion rate, longest streak, and missed periods.
 *     tags: [Habits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Habit UUID
 *         schema:
 *           type: string
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Habit analytics result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HabitAnalyticsResponse'
 *       400:
 *         description: Habit not found
 */
router.get("/:id/analytics", protect, getHabitAnalyticsController);

export default router;
