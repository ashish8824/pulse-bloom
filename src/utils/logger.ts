/**
 * src/utils/logger.ts
 *
 * Simple structured logger with timestamps.
 * Every cron log line gets a timestamp so you can see exactly
 * when each tick fired and what happened.
 *
 * Usage:
 *   logger.info("Job started")
 *   logger.error("Failed", { reason: "timeout" })
 */

const timestamp = () => new Date().toISOString();

export const logger = {
  info: (message: string, meta?: object) => {
    console.log(
      `[${timestamp()}] [INFO]  ${message}`,
      meta ? JSON.stringify(meta) : "",
    );
  },

  warn: (message: string, meta?: object) => {
    console.warn(
      `[${timestamp()}] [WARN]  ${message}`,
      meta ? JSON.stringify(meta) : "",
    );
  },

  error: (message: string, meta?: object) => {
    console.error(
      `[${timestamp()}] [ERROR] ${message}`,
      meta ? JSON.stringify(meta) : "",
    );
  },

  debug: (message: string, meta?: object) => {
    // Only prints in development — stays silent in production
    if (process.env.NODE_ENV === "development") {
      console.debug(
        `[${timestamp()}] [DEBUG] ${message}`,
        meta ? JSON.stringify(meta) : "",
      );
    }
  },
};
