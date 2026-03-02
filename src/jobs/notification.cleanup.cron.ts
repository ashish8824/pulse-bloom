/**
 * src/jobs/notification.cleanup.cron.ts
 *
 * Runs once daily at 3:00am UTC.
 *
 * Deletes Notification rows older than 90 days.
 * Without this, the table grows indefinitely — a user who gets
 * daily streak notifications would accumulate 365+ rows per year.
 *
 * 90 days of history is more than enough for any reasonable use case.
 * This value can be adjusted via the NOTIFICATION_RETENTION_DAYS
 * environment variable without changing code.
 */

import cron from "node-cron";
import { cleanupOldNotifications } from "../modules/notifications/notification.service";
import { logger } from "../utils/logger";

// ─────────────────────────────────────────────────────────────────
// EXPORT: runNotificationCleanupJob
// ─────────────────────────────────────────────────────────────────
/**
 * Main cleanup job body.
 * Exported so it can be unit-tested or triggered manually via a
 * one-off script without touching the cron scheduler.
 */
export const runNotificationCleanupJob = async (): Promise<void> => {
  logger.info("[NotificationCleanup] 🗑  Starting cleanup run");

  // Read retention days from env — default 90 if not set.
  // This lets you adjust retention without a code deploy.
  const retentionDays = process.env.NOTIFICATION_RETENTION_DAYS
    ? parseInt(process.env.NOTIFICATION_RETENTION_DAYS, 10)
    : 90;

  try {
    const { deleted } = await cleanupOldNotifications(retentionDays);
    logger.info("[NotificationCleanup] ✅ Cleanup complete", {
      deleted,
      retentionDays,
    });
  } catch (err) {
    logger.error("[NotificationCleanup] ❌ Cleanup failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

// ─────────────────────────────────────────────────────────────────
// EXPORT: startNotificationCleanupCron
// ─────────────────────────────────────────────────────────────────
/**
 * Registers and starts the cleanup cron.
 * Call once from server.ts alongside startReminderCron() and
 * startWeeklyDigestCron().
 *
 * Schedule: "0 3 * * *" = 3:00am every day UTC
 *
 *   ┌──── minute (0)         = at minute 0
 *   │ ┌── hour (3)           = at 3am
 *   │ │ ┌ day of month (*)   = every day
 *   │ │ │ ┌ month (*)        = every month
 *   │ │ │ │ ┌ day of week (*) = every day
 *   0 3 * * *
 *
 * Why 3am?
 *   Low-traffic window. No user-facing operations compete for DB
 *   resources. The delete is a bulk operation and may briefly lock
 *   rows — doing it at 3am keeps any impact invisible.
 */
export const startNotificationCleanupCron = (): void => {
  const schedule = "0 3 * * *";

  if (!cron.validate(schedule)) {
    logger.error("[NotificationCleanup] Invalid schedule — job NOT started");
    return;
  }

  cron.schedule(
    schedule,
    async () => {
      try {
        await runNotificationCleanupJob();
      } catch (err) {
        logger.error("[NotificationCleanup] ❌ Unhandled error", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    { timezone: "UTC" },
  );

  logger.info("[NotificationCleanup] 🚀 Started — fires daily at 03:00 UTC");
};
