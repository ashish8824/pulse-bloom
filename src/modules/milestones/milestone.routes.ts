// src/modules/milestones/milestone.routes.ts

import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { getMilestonesController } from "./milestone.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Milestones
 *   description: Personal records and achievement timeline
 */

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     MilestoneItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         type:
 *           type: string
 *           enum:
 *             - FIRST_MOOD_ENTRY
 *             - HABIT_STREAK_7
 *             - HABIT_STREAK_14
 *             - HABIT_STREAK_21
 *             - HABIT_STREAK_30
 *             - HABIT_STREAK_60
 *             - HABIT_STREAK_90
 *             - HABIT_STREAK_100
 *             - HABIT_STREAK_180
 *             - HABIT_STREAK_365
 *             - MOOD_STREAK_7
 *             - MOOD_STREAK_14
 *             - MOOD_STREAK_30
 *             - BEST_WEEK_MOOD
 *             - BURNOUT_RECOVERY
 *         icon:
 *           type: string
 *           example: "🔥"
 *         title:
 *           type: string
 *           example: "30-Day Habit Streak"
 *         description:
 *           type: string
 *           example: "30-Day Habit Streak on \"Morning Meditation\""
 *         habitId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: Set for habit-specific milestones, null for mood/account milestones
 *         habitTitle:
 *           type: string
 *           nullable: true
 *           example: "Morning Meditation"
 *         value:
 *           type: number
 *           nullable: true
 *           description: Optional numeric context (e.g. best week avg score for BEST_WEEK_MOOD)
 *           example: 4.8
 *         achievedAt:
 *           type: string
 *           format: date-time
 *           example: "2026-02-26T08:30:00.000Z"
 *
 *     MilestoneTimeline:
 *       type: object
 *       properties:
 *         milestones:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MilestoneItem'
 *         total:
 *           type: integer
 *           example: 7
 */

/**
 * @swagger
 * /api/milestones:
 *   get:
 *     summary: Get personal milestone timeline
 *     description: >
 *       Returns the user's full achievement timeline, sorted newest first.
 *
 *       Milestones are awarded automatically — no manual claiming needed.
 *       They are triggered inside `completeHabit()` and `addMood()` as
 *       fire-and-forget side effects, so they never block the primary operation.
 *
 *       **Milestone types and triggers:**
 *
 *       | Type | Trigger |
 *       |------|---------|
 *       | `FIRST_MOOD_ENTRY` | First ever mood log |
 *       | `HABIT_STREAK_7/14/21/30/60/90/100/180/365` | Habit streak hits that count |
 *       | `MOOD_STREAK_7/14/30` | Consecutive mood logging streak |
 *       | `BEST_WEEK_MOOD` | Current ISO week avg mood beats all previous weeks |
 *       | `BURNOUT_RECOVERY` | Burnout risk drops from High → Low |
 *
 *       **Idempotency:** the same milestone is never awarded twice for the
 *       same habit. The DB enforces this via a unique constraint on
 *       `(userId, type, habitId)`.
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Timeline returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MilestoneTimeline'
 *             examples:
 *               withMilestones:
 *                 summary: User with several milestones
 *                 value:
 *                   milestones:
 *                     - id: "uuid-1"
 *                       type: "HABIT_STREAK_30"
 *                       icon: "💪"
 *                       title: "30-Day Habit Streak"
 *                       description: "30-Day Habit Streak on \"Morning Meditation\""
 *                       habitId: "habit-uuid"
 *                       habitTitle: "Morning Meditation"
 *                       value: null
 *                       achievedAt: "2026-02-26T08:30:00.000Z"
 *                     - id: "uuid-2"
 *                       type: "BEST_WEEK_MOOD"
 *                       icon: "✨"
 *                       title: "Personal Best Week"
 *                       description: "Achieved your highest ever weekly mood average: 4.8"
 *                       habitId: null
 *                       habitTitle: null
 *                       value: 4.8
 *                       achievedAt: "2026-02-10T00:00:00.000Z"
 *                     - id: "uuid-3"
 *                       type: "FIRST_MOOD_ENTRY"
 *                       icon: "🌱"
 *                       title: "First Mood Logged"
 *                       description: "You logged your very first mood entry. Welcome to PulseBloom!"
 *                       habitId: null
 *                       habitTitle: null
 *                       value: null
 *                       achievedAt: "2026-01-15T09:00:00.000Z"
 *                   total: 3
 *               empty:
 *                 summary: No milestones yet
 *                 value:
 *                   milestones: []
 *                   total: 0
 *       401:
 *         description: Missing or invalid access token
 */
router.get("/", protect, getMilestonesController);

export default router;
