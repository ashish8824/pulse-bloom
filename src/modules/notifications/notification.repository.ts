// src/modules/notifications/notification.repository.ts

import { prisma } from "../../config/db";
import { NotificationType } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────
// NOTIFICATION REPOSITORY
//
// The only layer that directly queries the Notification table.
// No business logic here — only typed, efficient DB operations.
//
// All queries are scoped to userId — a user can never read or
// modify another user's notifications.
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────

/**
 * Insert a new notification row.
 *
 * Called from:
 *   • habit.service.ts  → completeHabit() when a streak milestone is hit
 *   • mood.service.ts   → addMood() when burnout risk level changes (Phase 3)
 *   • weekly.digest.cron.ts → after sending the digest email
 *   • reminder.cron.ts  → after sending a habit or mood reminder
 *   • badge engine      → when a badge is earned (Phase 4)
 *   • challenge engine  → on challenge completion (Phase 4)
 *
 * relatedId is optional — pass the habitId, badgeId, or challengeId
 * so the frontend can deep-link to the relevant screen.
 */
export const createNotificationRecord = async (data: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
}) => {
  return prisma.notification.create({ data });
};

// ─────────────────────────────────────────────────────────────────
// READ — PAGINATED LIST
// ─────────────────────────────────────────────────────────────────

/**
 * Fetch paginated notifications for a user.
 *
 * Ordering: unread first (isRead ASC), then most recent (createdAt DESC).
 * This means the top of the list always shows what needs attention,
 * then falls back to chronological history.
 *
 * Why Promise.all:
 *   Both queries run concurrently — total wait = max(count, findMany)
 *   instead of count + findMany sequentially.
 *
 * Indexes used:
 *   @@index([userId])            → WHERE userId = X
 *   @@index([userId, createdAt]) → ORDER BY userId, createdAt DESC
 */
export const getNotificationsByUser = async (
  userId: string,
  page: number,
  limit: number,
) => {
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: [
        { isRead: "asc" }, // unread (false) sorts before read (true)
        { createdAt: "desc" }, // newest first within each group
      ],
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  return { notifications, total };
};

// ─────────────────────────────────────────────────────────────────
// READ — UNREAD COUNT
// ─────────────────────────────────────────────────────────────────

/**
 * Count unread notifications for a user.
 *
 * This is the lightest possible query — returns a single integer.
 * Used by GET /api/notifications/unread-count, which the frontend
 * polls on every page load to drive the notification badge.
 *
 * Index used: @@index([userId, isRead])
 * The compound index makes this O(1) regardless of total rows.
 */
export const countUnreadNotifications = async (
  userId: string,
): Promise<number> => {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
};

// ─────────────────────────────────────────────────────────────────
// UPDATE — MARK ONE AS READ
// ─────────────────────────────────────────────────────────────────

/**
 * Mark a single notification as read.
 *
 * Returns the updated row so the controller can confirm the change.
 * The service layer verifies ownership before calling this —
 * we never directly filter by userId here because the id is
 * already unique enough for a Prisma update.
 *
 * Ownership verification pattern (in service):
 *   1. findUnique(id) → check notification.userId === req.userId
 *   2. If mismatch → throw "Notification not found" (same as missing — no leakage)
 *   3. If match → call markNotificationRead(id)
 */
export const markNotificationRead = async (id: string) => {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
};

// ─────────────────────────────────────────────────────────────────
// UPDATE — MARK ALL AS READ
// ─────────────────────────────────────────────────────────────────

/**
 * Mark ALL unread notifications as read for a user.
 *
 * Uses updateMany — bulk update in a single DB statement.
 * WHERE isRead: false avoids writing rows that don't need changing.
 *
 * Returns the count of updated rows so the controller can
 * include it in the response: { updated: 5 }
 */
export const markAllNotificationsRead = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return result.count; // number of rows updated
};

// ─────────────────────────────────────────────────────────────────
// READ — FIND BY ID (for ownership check)
// ─────────────────────────────────────────────────────────────────

/**
 * Fetch a single notification by its primary key.
 * Used by the service layer to verify ownership before marking read.
 * Returns null if not found.
 */
export const findNotificationById = async (id: string) => {
  return prisma.notification.findUnique({ where: { id } });
};

// ─────────────────────────────────────────────────────────────────
// DELETE — CLEANUP OLD NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Delete notifications older than `olderThanDays` days.
 *
 * Called by the cleanup cron job (runs daily at 3am UTC).
 * Keeps the Notification table lean — 90 days of history is plenty
 * for any reasonable use case.
 *
 * Index used: @@index([createdAt])
 * Without this index, every cleanup run would be a full table scan.
 *
 * Returns the count of deleted rows for logging.
 */
export const deleteOldNotifications = async (
  olderThanDays: number = 90,
): Promise<number> => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const result = await prisma.notification.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return result.count;
};
