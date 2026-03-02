// src/modules/auth/auth.validation.ts

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────
// REGISTER
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
// ─────────────────────────────────────────────────────────────────
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// ─────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────
export const logoutSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// ─────────────────────────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// ─────────────────────────────────────────────────────────────────
// RESET PASSWORD
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
    path: ["confirmPassword"],
  });

// ─────────────────────────────────────────────────────────────────
// UPDATE PREFERENCES  ← NEW
//
// Used by PATCH /api/auth/me/preferences.
//
// All fields are optional — send only the ones you want to change.
//
// moodReminderTime rules:
//   • Must be "HH:MM" in 24-hour format (e.g. "08:30", "21:00")
//   • Send null explicitly to clear the stored time
//   • Omit entirely to leave it unchanged
//
// Business rule enforced here via .refine():
//   If moodReminderOn is being set to true, a moodReminderTime
//   must already be set OR be provided in this same request.
//   This prevents the cron from trying to match a null reminderTime.
// ─────────────────────────────────────────────────────────────────
export const updatePreferencesSchema = z
  .object({
    weeklyDigestOn: z.boolean().optional(),

    moodReminderOn: z.boolean().optional(),

    moodReminderTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):[0-5]\d$/,
        "moodReminderTime must be in HH:MM 24-hour format (e.g. 08:30)",
      )
      .nullable() // null = clear the stored time
      .optional(), // omit = leave unchanged
  })
  .refine(
    (data) => {
      // If explicitly turning ON mood reminders without providing a time,
      // we need to check at the service level whether a time is already stored.
      // The schema can only validate what's in the request body, so we allow
      // moodReminderOn: true without moodReminderTime here — the service will
      // reject it if no time is stored yet.
      //
      // However: if they send moodReminderOn: true AND moodReminderTime: null
      // in the SAME request, that's a contradiction we can catch here.
      if (data.moodReminderOn === true && data.moodReminderTime === null) {
        return false;
      }
      return true;
    },
    {
      message:
        "Cannot enable mood reminder while clearing the reminder time. Provide a valid moodReminderTime.",
      path: ["moodReminderTime"],
    },
  );

// ─────────────────────────────────────────────────────────────────
// INFERRED TYPES
// ─────────────────────────────────────────────────────────────────
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
