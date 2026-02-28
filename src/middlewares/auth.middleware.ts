// src/middlewares/auth.middleware.ts

import { Request, Response, NextFunction } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { verifyAccessToken } from "../utils/jwt";

// ─────────────────────────────────────────────────────────────────
// PROTECT MIDDLEWARE
//
// Guards all routes that require authentication.
// Validates the access token from the Authorization header.
//
// After this middleware runs, req.userId is guaranteed to be set.
// All downstream controllers can safely use req.userId without null checks.
//
// Token flow:
//   Client → Authorization: Bearer <accessToken>
//   Middleware → verifyAccessToken(token) → { userId }
//   Middleware → req.userId = userId
//   Controller → req.userId (always present)
//
// Error handling:
//   • TokenExpiredError → 401 with specific message (client should refresh)
//   • JsonWebTokenError → 401 with generic message (malformed/invalid token)
//   • Missing header     → 401 (no token provided)
//
// Why distinguish TokenExpiredError from other JWT errors?
//   The client needs to know the difference:
//   - TokenExpiredError → call POST /api/auth/refresh-token silently
//   - Other JWT errors  → token is invalid, force re-login
// ─────────────────────────────────────────────────────────────────
export const protect = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    // ── Check header format ───────────────────────────────────────
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Not authorized. Access token missing.",
      });
    }

    const token = authHeader.split(" ")[1];

    // ── Verify token ─────────────────────────────────────────────
    // verifyAccessToken throws:
    //   TokenExpiredError  — if exp < now
    //   JsonWebTokenError  — if signature invalid, malformed, wrong algorithm
    const decoded = verifyAccessToken(token);

    // ── Attach userId to request ─────────────────────────────────
    req.userId = decoded.userId;

    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      // Client should automatically call /refresh-token then retry the request
      return res.status(401).json({
        error: "Access token expired.",
        code: "TOKEN_EXPIRED", // client-readable code for programmatic handling
        hint: "Call POST /api/auth/refresh-token to get a new access token.",
      });
    }

    if (error instanceof JsonWebTokenError) {
      return res.status(401).json({
        error: "Invalid access token.",
        code: "TOKEN_INVALID",
      });
    }

    // Unknown error (should not happen in practice)
    return res.status(401).json({
      error: "Authentication failed.",
    });
  }
};
