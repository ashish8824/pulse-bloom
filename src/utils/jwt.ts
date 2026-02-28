// src/utils/jwt.ts

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";

// ─────────────────────────────────────────────────────────────────
// ACCESS TOKEN
//
// Short-lived (15 minutes). Sent in every API request via
// Authorization: Bearer <accessToken>
//
// Payload only contains userId — keep it minimal.
// Do NOT put sensitive data (email, role) in the JWT payload
// because it's not encrypted, only signed — anyone can base64 decode it.
//
// 15-minute expiry means:
//   • A stolen access token is only valid for a short window
//   • Client must use the refresh token to get a new one silently
// ─────────────────────────────────────────────────────────────────
export const generateAccessToken = (payload: { userId: string }): string => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "15m" });
};

/**
 * Verify an access token.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 * Both are caught in auth.middleware.ts.
 */
export const verifyAccessToken = (token: string): { userId: string } => {
  return jwt.verify(token, env.JWT_SECRET) as { userId: string };
};

// ─────────────────────────────────────────────────────────────────
// REFRESH TOKEN
//
// Long-lived (7 days). Stored in the database as RefreshToken row.
// NOT a JWT — it's a 256-bit random hex string.
//
// Why not a JWT for refresh tokens?
//   • JWTs can't be revoked without a denylist
//   • DB-backed tokens can be revoked instantly (logout, password reset)
//   • We need to support "logout from all devices" → updateMany({ isRevoked: true })
//
// The token is just a secure random string. All validation (expiry, revocation)
// happens by querying the DB row — not by decoding the token itself.
// ─────────────────────────────────────────────────────────────────
export const generateRefreshToken = (): string => {
  // crypto.randomBytes(32) = 256 bits of cryptographic randomness
  // .toString('hex') = 64-character hex string
  return crypto.randomBytes(32).toString("hex");
};

// ─────────────────────────────────────────────────────────────────
// LEGACY — kept for backward compatibility with any existing callers
// (mood/habit modules may use generateToken from this file)
// Delegates to generateAccessToken internally.
// ─────────────────────────────────────────────────────────────────
export const generateToken = (payload: { userId: string }): string => {
  return generateAccessToken(payload);
};

export const verifyToken = (token: string): { userId: string } => {
  return verifyAccessToken(token);
};
