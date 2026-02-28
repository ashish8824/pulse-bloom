// src/modules/auth/auth.validation.ts

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────
// REGISTER
//
// password regex enforces at least:
//   • 1 uppercase letter
//   • 1 lowercase letter
//   • 1 digit
//   • 1 special character
//   • Minimum 8 characters
//
// This is intentionally stricter than the old min(6) rule.
// Frontend should show a live password-strength indicator matching these rules.
// ─────────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      "Password must contain uppercase, lowercase, number, and special character (@$!%*?&)",
    ),

  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name must be under 60 characters")
    .trim(),
});

// ─────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// ─────────────────────────────────────────────────────────────────
// VERIFY EMAIL
//
// otp: 6-digit string. Validated as exactly 6 digits.
// email: needed to look up the user (no auth header at this stage)
// ─────────────────────────────────────────────────────────────────
export const verifyEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});

// ─────────────────────────────────────────────────────────────────
// RESEND VERIFICATION
// ─────────────────────────────────────────────────────────────────
export const resendVerificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// ─────────────────────────────────────────────────────────────────
// REFRESH TOKEN
//
// Client sends the refresh token in the request body.
// We validate it's a non-empty string here; deeper validation
// (expiry, revocation) happens in the service layer.
// ─────────────────────────────────────────────────────────────────
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// ─────────────────────────────────────────────────────────────────
// LOGOUT
//
// Client sends the refresh token so we can revoke the specific session.
// If token is missing, we still return 200 — no harm in a no-op logout.
// ─────────────────────────────────────────────────────────────────
export const logoutSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// ─────────────────────────────────────────────────────────────────
// FORGOT PASSWORD
//
// Only requires email. We never reveal whether the email exists
// (prevents user enumeration attacks).
// ─────────────────────────────────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// ─────────────────────────────────────────────────────────────────
// RESET PASSWORD
//
// token: the 64-char hex token sent in the reset email link
// password: same strong-password rules as register
// confirmPassword: must match password (checked with .refine)
// ─────────────────────────────────────────────────────────────────
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        "Password must contain uppercase, lowercase, number, and special character",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], // error attached to confirmPassword field on the frontend
  });

// ─────────────────────────────────────────────────────────────────
// UPDATE PROFILE (GET /me only reads, but PATCH /me would use this)
// Included here for completeness — wire it up when you add PATCH /me
// ─────────────────────────────────────────────────────────────────
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(60)
    .trim()
    .optional(),
});

// ─── Inferred TypeScript types (use in service/controller layers) ─
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
