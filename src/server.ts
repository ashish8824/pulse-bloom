// src/server.ts

import app from "./app";
import { env } from "./config/env";
import { connectMongo } from "./config/mongo";
import { startReminderCron } from "./jobs/reminder.cron";
import { startWeeklyDigestCron } from "./jobs/weekly.digest.cron";
import { startNotificationCleanupCron } from "./jobs/notification.cleanup.cron"; // ← NEW

/**
 * Start Server
 *
 * Boot order:
 *   1. Connect MongoDB
 *   2. Start cron jobs (all after DB is ready)
 *   3. Start Express
 */
const startServer = async () => {
  // ── 1. Connect MongoDB ──────────────────────────────────────────
  await connectMongo();

  // ── 2. Start cron jobs ──────────────────────────────────────────
  startReminderCron(); // every minute:   habit + mood reminders
  startWeeklyDigestCron(); // Saturday 8am:   weekly behavioral summary
  startNotificationCleanupCron(); // daily 3am:      delete notifications > 90 days ← NEW

  // ── 3. Start Express ────────────────────────────────────────────
  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
};

startServer();
