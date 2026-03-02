// src/modules/notifications/notification.service.ts

import { NotificationType } from "@prisma/client";
import {
  createNotificationRecord,
  getNotificationsByUser,
  countUnreadNotifications,
  findNotificationById,
  markNotificationRead,
  markAllNotificationsRead,
  deleteOldNotifications,
} from "./notification.repository";

// ─────────────────────────────────────────────────────────────────
// SHARED UTILITY — createNotification
//
// This is the ONLY function other modules should call to create
// notifications. It is intentionally kept fire-and-forget safe:
//
//   • It NEVER throws — any DB failure is caught and logged.
//   • It returns void — callers don't need to await it for correctness.
//   • It can be called with await (to guarantee ordering) or without
//     (to avoid adding latency to the calling request).
//
// WHY fire-and-forget?
//   A streak milestone notification failure must NEVER cause
//   the habit completion response to fail. The notification
//   is a secondary side-effect, not the primary operation.
//
// HOW to call it from other modules:
//
//   // Fire-and-forget (don't await — no latency added)
//   createNotification({ userId, type: "STREAK_MILESTONE", ... }).catch(() => {});
//
//   // Or await if you need to guarantee it's written before responding
//   await createNotification({ userId, type: "STREAK_MILESTONE", ... });
//
// ─────────────────────────────────────────────────────────────────
export const createNotification = async (data: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
}): Promise<void> => {
  try {
    await createNotificationRecord(data);
  } catch (err) {
    // Log silently — never propagate. Notification failure must not
    // break habit completion, mood logging, or any other primary operation.
    console.error("[Notifications] Failed to create notification", {
      type: data.type,
      userId: data.userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

// ─────────────────────────────────────────────────────────────────
// NOTIFICATION CONTENT BUILDERS
//
// Centralises the wording for every notification type.
// Having the copy here (not in habit.service.ts or mood.service.ts)
// means we can update notification text in one place.
//
// Each builder returns { title, message } — pass these directly
// to createNotification().
// ─────────────────────────────────────────────────────────────────

/**
 * Streak milestone notification copy.
 * Called from habit.service.ts when completeHabit() detects a milestone.
 *
 * Usage:
 *   const { title, message } = buildStreakMilestoneNotification(habitTitle, 30);
 *   createNotification({ userId, type: "STREAK_MILESTONE", title, message, relatedId: habitId });
 */
export const buildStreakMilestoneNotification = (
  habitTitle: string,
  streakDays: number,
): { title: string; message: string } => {
  const emoji =
    streakDays >= 365
      ? "🏆"
      : streakDays >= 100
        ? "💎"
        : streakDays >= 60
          ? "🔥"
          : streakDays >= 30
            ? "⭐"
            : "🎯";

  return {
    title: `${emoji} ${streakDays}-Day Streak!`,
    message: `You've completed "${habitTitle}" ${streakDays} days in a row. Keep it up!`,
  };
};

/**
 * Burnout risk change notification copy.
 * Called when burnout risk level shifts (e.g. Low → High).
 *
 * Usage:
 *   const { title, message } = buildBurnoutRiskNotification("High", "Moderate");
 *   createNotification({ userId, type: "BURNOUT_RISK_CHANGED", title, message });
 */
export const buildBurnoutRiskNotification = (
  newLevel: "Low" | "Moderate" | "High",
  previousLevel: "Low" | "Moderate" | "High" | null,
): { title: string; message: string } => {
  const emoji =
    newLevel === "High" ? "⚠️" : newLevel === "Moderate" ? "📊" : "✅";

  const direction =
    previousLevel === null
      ? ""
      : newLevel === "High" ||
          (newLevel === "Moderate" && previousLevel === "Low")
        ? " (increasing)"
        : " (improving)";

  return {
    title: `${emoji} Burnout Risk: ${newLevel}${direction}`,
    message:
      newLevel === "High"
        ? "Your recent mood patterns suggest elevated burnout risk. Consider taking a break or adjusting your habits."
        : newLevel === "Moderate"
          ? "Your burnout risk has moved to Moderate. Keep an eye on your mood and habit consistency."
          : "Great news — your burnout risk is now Low. Your consistency is paying off!",
  };
};

/**
 * Weekly digest notification copy.
 * Called from weekly.digest.cron.ts after the digest email is sent.
 *
 * Usage:
 *   const { title, message } = buildWeeklySummaryNotification("Feb 24 – Mar 2, 2026", 3.8);
 *   createNotification({ userId, type: "WEEKLY_SUMMARY", title, message });
 */
export const buildWeeklySummaryNotification = (
  weekLabel: string,
  averageMood: number | null,
): { title: string; message: string } => {
  const moodText =
    averageMood !== null
      ? `Your average mood was ${averageMood.toFixed(1)}/5.`
      : "No mood entries were logged this week.";

  return {
    title: `📬 Weekly Summary — ${weekLabel}`,
    message: `Your behavioral summary for ${weekLabel} is ready. ${moodText}`,
  };
};

// ─────────────────────────────────────────────────────────────────
// SERVICE FUNCTIONS — called by controllers
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// GET NOTIFICATIONS (paginated)
//
// Returns paginated notification list + pagination metadata.
// Unread notifications always appear first.
// ─────────────────────────────────────────────────────────────────
export const getNotifications = async (
  userId: string,
  page: number,
  limit: number,
) => {
  const { notifications, total } = await getNotificationsByUser(
    userId,
    page,
    limit,
  );

  const totalPages = Math.ceil(total / limit);

  return {
    notifications,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
};

// ─────────────────────────────────────────────────────────────────
// GET UNREAD COUNT
//
// Lightweight count used by the notification badge in the UI.
// Returns { unreadCount: number } — nothing else.
// ─────────────────────────────────────────────────────────────────
export const getUnreadCount = async (userId: string) => {
  const unreadCount = await countUnreadNotifications(userId);
  return { unreadCount };
};

// ─────────────────────────────────────────────────────────────────
// MARK ONE AS READ
//
// Business rules:
//   1. The notification must exist.
//   2. The notification must belong to the requesting user.
//      → We expose the same "Notification not found" error whether
//        the notification doesn't exist OR belongs to another user.
//        This prevents leaking that a notification ID exists at all.
//   3. If already read, we return success silently (idempotent).
// ─────────────────────────────────────────────────────────────────
export const markOneAsRead = async (notificationId: string, userId: string) => {
  // Step 1: Fetch by id (not userId) — check existence first
  const notification = await findNotificationById(notificationId);

  // Step 2: Ownership check — same error message for not-found and wrong-owner
  if (!notification || notification.userId !== userId) {
    throw new Error("Notification not found");
  }

  // Step 3: Idempotent — already read, return it as-is
  if (notification.isRead) {
    return { notification };
  }

  // Step 4: Mark as read
  const updated = await markNotificationRead(notificationId);
  return { notification: updated };
};

// ─────────────────────────────────────────────────────────────────
// MARK ALL AS READ
//
// Bulk marks all of the user's unread notifications as read.
// Returns the count of updated rows.
// ─────────────────────────────────────────────────────────────────
export const markAllAsRead = async (userId: string) => {
  const updated = await markAllNotificationsRead(userId);
  return {
    message: `${updated} notification${updated !== 1 ? "s" : ""} marked as read.`,
    updated,
  };
};

// ─────────────────────────────────────────────────────────────────
// CLEANUP OLD NOTIFICATIONS
//
// Not exposed as an HTTP endpoint — called internally by the
// notification cleanup cron job (runs daily at 3am UTC).
// Keeps the table lean by deleting rows older than 90 days.
// ─────────────────────────────────────────────────────────────────
export const cleanupOldNotifications = async (
  olderThanDays: number = 90,
): Promise<{ deleted: number }> => {
  const deleted = await deleteOldNotifications(olderThanDays);
  return { deleted };
};
