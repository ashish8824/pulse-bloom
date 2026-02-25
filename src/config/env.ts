import dotenv from "dotenv";

/**
 * Load environment variables from .env file
 */
dotenv.config();

export const env = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL as string,
  MONGO_URI: process.env.MONGO_URI as string,
  JWT_SECRET: process.env.JWT_SECRET as string,

  // ── Gmail SMTP (reminder emails) ──────────────────────────────────────────
  // SMTP_USER → your Gmail address          e.g. ashish@gmail.com
  // SMTP_PASS → 16-char App Password        e.g. abcdefghijklmnop
  // EMAIL_FROM → "From" field in the email  e.g. PulseBloom 🌸 <ashish@gmail.com>
  SMTP_USER: process.env.SMTP_USER as string,
  SMTP_PASS: process.env.SMTP_PASS as string,
  EMAIL_FROM: process.env.EMAIL_FROM as string,
};
