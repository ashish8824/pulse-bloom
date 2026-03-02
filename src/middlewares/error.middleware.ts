// src/middlewares/error.middleware.ts

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

// ─────────────────────────────────────────────────────────────────
// HTTP STATUS MAP
// ─────────────────────────────────────────────────────────────────
const HTTP_STATUS_MAP: Record<string, number> = {
  // ── Auth — Register ──────────────────────────────────────────
  "User already exists": 409,

  // ── Auth — Email Verification ────────────────────────────────
  "Invalid verification attempt": 400,
  "Email is already verified": 409,
  "No pending verification found. Please request a new code.": 404,
  "Invalid verification code": 400,
  "Verification code has expired. Please request a new one.": 410,

  // ── Auth — Login ─────────────────────────────────────────────
  "Invalid credentials": 401,
  "Please verify your email before logging in": 403,

  // ── Auth — Refresh Token ─────────────────────────────────────
  "Invalid refresh token": 401,
  "Refresh token has been revoked. Please log in again.": 401,
  "Refresh token has expired. Please log in again.": 401,

  // ── Auth — Forgot/Reset Password ─────────────────────────────
  "Invalid or expired reset token": 400,

  // ── Auth — Preferences ───────────────────────────────────────
  "Cannot enable mood reminder without a reminder time. Please provide moodReminderTime (e.g. '08:30').": 400,

  // ── Auth — General ───────────────────────────────────────────
  "User not found": 404,

  // ── Habits ───────────────────────────────────────────────────
  "Habit not found": 404,
  "Habit already completed for this period": 409,
  "Habit is already archived": 409,
  "Cannot complete an archived habit. Restore it first.": 400,

  // ── Notifications  ← NEW ─────────────────────────────────────
  // "Notification not found" covers both genuinely missing notifications
  // AND notifications that belong to a different user — we return 404
  // in both cases to avoid leaking that a notification ID exists at all.
  "Notification not found": 404,
};

// ─────────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────────────────────────
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // ── 1. Zod validation errors ──────────────────────────────────
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      issues: err.issues.map((e) => ({
        field: e.path.join(".") || "unknown",
        message: e.message,
      })),
    });
    return;
  }

  // ── 2. Known application errors ───────────────────────────────
  if (err instanceof Error) {
    const status = HTTP_STATUS_MAP[err.message] ?? 400;
    res.status(status).json({ error: err.message });
    return;
  }

  // ── 3. Unknown / unexpected errors ────────────────────────────
  console.error("[Unhandled Error]", err);
  res.status(500).json({ error: "Internal Server Error" });
};
