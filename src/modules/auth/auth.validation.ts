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
// UPDATE PREFERENCES
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
//   If moodReminderOn is being set to true AND moodReminderTime is
//   explicitly null in the same request, that is a contradiction —
//   reject immediately. The service handles the case where
//   moodReminderOn=true but no time is in the request body (checks DB).
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
      // Contradiction: turning ON reminders while simultaneously clearing the time
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
// CHANGE PASSWORD  ← NEW
//
// Used by PATCH /api/auth/me/password.
//
// Requires the user to supply their CURRENT password before accepting
// a new one. Even though the user is already authenticated via Bearer
// token, we re-verify identity here to protect against:
//   • Unattended unlocked devices
//   • Stolen short-lived access tokens (14-min window)
//   • XSS-harvested tokens in browser environments
//
// Rules enforced at schema level:
//   1. currentPassword  — any non-empty string (strength not re-validated;
//                         the user may have an older password that predates
//                         the current strength policy — we only compare hash)
//   2. newPassword      — same strength rules as registration
//   3. confirmPassword  — must match newPassword exactly
//   4. newPassword ≠ currentPassword — prevents silent no-op changes and
//                         saves an unnecessary bcrypt round in the service
//
// Business rules enforced at service level (not here):
//   • bcrypt.compare(currentPassword, stored hash) must pass
//   • All existing refresh tokens are revoked on success (force re-login
//     on all other devices/sessions)
// ─────────────────────────────────────────────────────────────────
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),

    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        "New password must contain uppercase, lowercase, number, and special character (@$!%*?&)",
      ),

    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    // Checked after match so the user only ever sees one error at a time
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

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
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>; // ← NEW
