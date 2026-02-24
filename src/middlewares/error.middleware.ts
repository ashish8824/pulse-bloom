import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

// ─────────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER
//
// Must be registered AFTER all routes in app.ts:
//   app.use(errorHandler);
//
// Express identifies this as an error handler because it has exactly
// 4 parameters (err, req, res, next). Without all 4, Express ignores
// it as an error handler and treats it as a regular middleware.
//
// Why centralize errors here instead of try/catch in every controller:
//   - Single place to control error formatting
//   - Consistent JSON shape across all error types
//   - No duplicate status code logic scattered across controllers
//   - Controllers just call next(error) and stop
// ─────────────────────────────────────────────────────────────────

// Maps known error message strings to the correct HTTP status code.
// Extend this as the app grows to keep status codes consistent.
const HTTP_STATUS_MAP: Record<string, number> = {
  "Habit not found": 404,
  "Habit already completed for this period": 409, // 409 Conflict is semantically correct for duplicate actions
  "Habit is already archived": 409,
  "Cannot complete an archived habit. Restore it first.": 400,
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction, // required by Express even if unused — do NOT remove
) => {
  // ── 1. Zod validation errors ──────────────────────────────
  // ZodError is thrown by .parse() calls in controllers.
  // It contains an `errors` array with per-field failure details.
  // We map it into a clean structure the frontend can use to highlight
  // specific form fields without parsing a raw error string.
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

  // ── 2. Known application errors ──────────────────────────
  // These are thrown intentionally via `throw new Error("...")` in services.
  // We look up the message in our status map to return the correct HTTP code.
  // Defaults to 400 (Bad Request) if not found in the map.
  if (err instanceof Error) {
    const status = HTTP_STATUS_MAP[err.message] ?? 400;
    res.status(status).json({ error: err.message });
    return;
  }

  // ── 3. Unknown / unexpected errors ───────────────────────
  // Something truly unexpected happened (DB connection lost, null pointer, etc.)
  // Log the full error server-side for debugging but NEVER expose
  // raw error details to the client — it leaks internal implementation.
  console.error("[Unhandled Error]", err);

  res.status(500).json({
    error: "Internal Server Error",
  });
};
