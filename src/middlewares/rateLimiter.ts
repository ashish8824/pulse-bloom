// src/middlewares/rateLimiter.ts

import rateLimit from "express-rate-limit";

// ─────────────────────────────────────────────────────────────────
// GLOBAL RATE LIMITER
//
// Applied in app.ts to ALL routes as a first line of defense.
// 100 requests per 15 minutes per IP — loose enough for normal use,
// tight enough to slow down automated scanners.
// ─────────────────────────────────────────────────────────────────
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true, // Returns RateLimit-* headers (RFC 6585)
  legacyHeaders: false, // Disable X-RateLimit-* legacy headers
  message: {
    error: "Too many requests from this IP. Please try again in 15 minutes.",
  },
});

// ─────────────────────────────────────────────────────────────────
// AUTH RATE LIMITER — LOGIN + REGISTER
//
// Applied directly to POST /api/auth/login and POST /api/auth/register.
//
// Why stricter here?
//   • Login: prevent brute-force password attacks
//   • Register: prevent account spam / OTP email flooding
//
// 10 requests per 15 minutes per IP allows legitimate users
// (e.g., someone who forgot their password and retries a few times)
// while making brute-force attacks impractical.
//
// skipSuccessfulRequests: true
//   → Successful logins don't count toward the limit.
//   → Only failed attempts (wrong password, validation errors) accumulate.
//   → A legitimate user who logs in successfully doesn't burn through their quota.
// ─────────────────────────────────────────────────────────────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error:
      "Too many login attempts from this IP. Please try again in 15 minutes.",
  },
});

// ─────────────────────────────────────────────────────────────────
// RESEND VERIFICATION RATE LIMITER
//
// Stricter than login limiter because each request fires an email.
// Prevents OTP email flooding abuse.
//
// 3 requests per 15 minutes — if a legitimate user needs more than
// 3 resends, something else is wrong (wrong email, email provider issue).
// ─────────────────────────────────────────────────────────────────
export const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Too many verification email requests. Please wait 15 minutes before requesting again.",
  },
});

// ─────────────────────────────────────────────────────────────────
// FORGOT PASSWORD RATE LIMITER
//
// Same reasoning as resend verification — each request fires an email.
// 3 per 15 minutes is generous for legitimate use while blocking spam.
// ─────────────────────────────────────────────────────────────────
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Too many password reset requests. Please wait 15 minutes before trying again.",
  },
});
