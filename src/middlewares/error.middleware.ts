// src/middlewares/error.middleware.ts

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

// ─────────────────────────────────────────────────────────────────
// HTTP STATUS MAP
//
// Maps known error message strings to the correct HTTP status code.
// Every intentional `throw new Error("...")` in any service layer
// must have an entry here, otherwise it defaults to 400.
//
// Organized by module for readability.
// ─────────────────────────────────────────────────────────────────
const HTTP_STATUS_MAP: Record<string, number> = {
  // ── Auth — Register ──────────────────────────────────────────
  "User already exists": 409, // 409 Conflict — duplicate resource

  // ── Auth — Email Verification ────────────────────────────────
  "Invalid verification attempt": 400,
  "Email is already verified": 409,
  "No pending verification found. Please request a new code.": 404,
  "Invalid verification code": 400,
  "Verification code has expired. Please request a new one.": 410, // 410 Gone — timed out

  // ── Auth — Login ─────────────────────────────────────────────
  "Invalid credentials": 401, // 401 Unauthorized — not authenticated
  "Please verify your email before logging in": 403, // 403 Forbidden — authenticated but blocked

  // ── Auth — Refresh Token ─────────────────────────────────────
  "Invalid refresh token": 401,
  "Refresh token has been revoked. Please log in again.": 401,
  "Refresh token has expired. Please log in again.": 401,

  // ── Auth — Forgot/Reset Password ─────────────────────────────
  "Invalid or expired reset token": 400,

  // ── Auth — General ───────────────────────────────────────────
  "User not found": 404,

  // ── Habits ───────────────────────────────────────────────────
  "Habit not found": 404,
  "Habit already completed for this period": 409,
  "Habit is already archived": 409,
  "Cannot complete an archived habit. Restore it first.": 400,
};

// ─────────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER
//
// Must be registered AFTER all routes in app.ts:
//   app.use(errorHandler);
//
// Express identifies this as an error handler because it has exactly
// 4 parameters. Without all 4, Express ignores it as an error handler.
// ─────────────────────────────────────────────────────────────────
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction, // required by Express even if unused — do NOT remove
) => {
  // ── 1. Zod validation errors ──────────────────────────────────
  // ZodError is thrown by schema.parse() calls in controllers.
  // Maps to 400 with per-field error details the frontend can use
  // to highlight specific invalid form fields.
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
  // Thrown intentionally via `throw new Error("...")` in service files.
  // Look up the message in HTTP_STATUS_MAP for the correct status code.
  // Default to 400 (Bad Request) if not explicitly mapped.
  if (err instanceof Error) {
    const status = HTTP_STATUS_MAP[err.message] ?? 400;
    res.status(status).json({ error: err.message });
    return;
  }

  // ── 3. Unknown / unexpected errors ────────────────────────────
  // DB connection lost, null pointer dereference, third-party SDK crash, etc.
  // Log full error server-side for debugging.
  // NEVER expose raw error details to the client — leaks internal implementation.
  console.error("[Unhandled Error]", err);

  res.status(500).json({
    error: "Internal Server Error",
  });
};
