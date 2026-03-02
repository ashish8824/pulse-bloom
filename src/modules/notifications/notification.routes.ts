// src/modules/notifications/notification.routes.ts

import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import {
  getNotificationsController,
  getUnreadCountController,
  markAsReadController,
  markAllAsReadController,
} from "./notification.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: In-app notification inbox — streaks, burnout alerts, weekly summaries
 */

/**
 * @swagger
 * components:
 *   schemas:
 *
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         userId:
 *           type: string
 *           format: uuid
 *         type:
 *           type: string
 *           enum:
 *             - STREAK_MILESTONE
 *             - BURNOUT_RISK_CHANGED
 *             - WEEKLY_SUMMARY
 *             - BADGE_EARNED
 *             - CHALLENGE_UPDATE
 *             - MOOD_REMINDER
 *             - HABIT_REMINDER
 *           example: STREAK_MILESTONE
 *         title:
 *           type: string
 *           example: "🔥 30-Day Streak!"
 *         message:
 *           type: string
 *           example: "You've completed \"Morning Meditation\" 30 days in a row. Keep it up!"
 *         isRead:
 *           type: boolean
 *           example: false
 *         relatedId:
 *           type: string
 *           nullable: true
 *           description: Optional ID of the related entity (habitId, badgeId, etc.) for deep-linking.
 *           example: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-02-26T08:30:00.000Z"
 *
 *     PaginatedNotificationsResponse:
 *       type: object
 *       properties:
 *         notifications:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Notification'
 *         pagination:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *               example: 47
 *             page:
 *               type: integer
 *               example: 1
 *             limit:
 *               type: integer
 *               example: 20
 *             totalPages:
 *               type: integer
 *               example: 3
 *
 *     UnreadCountResponse:
 *       type: object
 *       properties:
 *         unreadCount:
 *           type: integer
 *           example: 5
 *
 *     MarkReadResponse:
 *       type: object
 *       properties:
 *         notification:
 *           $ref: '#/components/schemas/Notification'
 *
 *     MarkAllReadResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "5 notifications marked as read."
 *         updated:
 *           type: integer
 *           example: 5
 */

// ─────────────────────────────────────────────────────────────────
// IMPORTANT: /read-all must be declared BEFORE /:id/read
//
// Express matches routes in registration order. If /:id/read were
// registered first, a request to /read-all would match it with
// id="read-all", which would then fail ownership check.
//
// Rule: always register specific paths before parameterised paths.
// ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     description: |
 *       Returns the number of unread notifications for the authenticated user.
 *       Poll this on page load to drive the notification bell badge.
 *       This is a lightweight query — no list data is returned.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnreadCountResponse'
 *       401:
 *         description: Missing or invalid access token
 */
router.get("/unread-count", protect, getUnreadCountController);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: |
 *       Bulk marks every unread notification as read for the authenticated user.
 *       Idempotent — calling when all are already read returns `{ updated: 0 }`.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarkAllReadResponse'
 *       401:
 *         description: Missing or invalid access token
 */
router.patch("/read-all", protect, markAllAsReadController);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get paginated notification list
 *     description: |
 *       Returns paginated notifications for the authenticated user.
 *       **Ordering:** unread notifications always appear first, then most
 *       recent read notifications. This ensures the top of the list always
 *       shows what needs attention.
 *
 *       **Notification types:**
 *       - `STREAK_MILESTONE` — habit streak reached 7, 14, 21, 30, 60, 90, 100, 180, or 365 days
 *       - `BURNOUT_RISK_CHANGED` — your burnout risk level shifted (e.g. Low → High)
 *       - `WEEKLY_SUMMARY` — weekly behavioral digest was generated
 *       - `BADGE_EARNED` — achievement badge unlocked (coming Phase 4)
 *       - `CHALLENGE_UPDATE` — challenge joined or completed (coming Phase 4)
 *       - `MOOD_REMINDER` — mood check-in reminder fired
 *       - `HABIT_REMINDER` — habit reminder fired
 *
 *       **`relatedId` usage:**
 *       For `STREAK_MILESTONE` and `HABIT_REMINDER`, `relatedId` is the `habitId`.
 *       Use it to deep-link the user to the specific habit screen.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (1-based)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Notifications per page (max 50)
 *     responses:
 *       200:
 *         description: Paginated notifications
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedNotificationsResponse'
 *       401:
 *         description: Missing or invalid access token
 */
router.get("/", protect, getNotificationsController);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a single notification as read
 *     description: |
 *       Marks one notification as read by its ID.
 *       **Ownership enforced:** You can only mark your own notifications.
 *       Attempting to mark another user's notification returns 404 (not 403)
 *       to avoid leaking that the notification ID exists.
 *       **Idempotent:** calling this on an already-read notification returns 200.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The notification ID to mark as read
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarkReadResponse'
 *       401:
 *         description: Missing or invalid access token
 *       404:
 *         description: Notification not found (or belongs to another user)
 */
router.patch("/:id/read", protect, markAsReadController);

export default router;
