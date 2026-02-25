import app from "./app";
import { env } from "./config/env";
import { connectMongo } from "./config/mongo";
import { startReminderCron } from "./jobs/reminder.cron"; // ← NEW

/**
 * Start Server
 */
const startServer = async () => {
  await connectMongo();

  // Start reminder cron job AFTER DB is connected.
  // The cron could fire within 60 seconds of startup —
  // the DB must be ready before the first tick.
  // startReminderCron(); // ← NEW

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
};

startServer();
