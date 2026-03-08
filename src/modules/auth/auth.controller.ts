// src/modules/auth/auth.controller.ts

import { Request, Response, NextFunction } from "express";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  refreshTokenSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePreferencesSchema,
  changePasswordSchema,
} from "./auth.validation";
import {
  registerUser,
  verifyEmail,
  resendVerification,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getMe,
  forgotPassword,
  resetPassword,
  updatePreferences,
  changePassword,
} from "./auth.service";

// POST /api/auth/register
export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    const result = await registerUser(email, password, name);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/verify-email
export const verifyEmailController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, otp } = verifyEmailSchema.parse(req.body);
    const result = await verifyEmail(email, otp);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/resend-verification
export const resendVerificationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = resendVerificationSchema.parse(req.body);
    const result = await resendVerification(email);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await loginUser(email, password);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/refresh-token
export const refreshTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken: token } = refreshTokenSchema.parse(req.body);
    const result = await refreshAccessToken(token);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken: token } = logoutSchema.parse(req.body);
    const result = await logoutUser(token);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
export const meController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getMe(req.userId!);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/forgot-password
export const forgotPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await forgotPassword(email);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password
export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const result = await resetPassword(token, password);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/auth/me/preferences
//
// Updates notification and reminder preferences for the authenticated user.
// Requires: Authorization: Bearer <accessToken>
// All body fields are optional — send only what you want to change.
//
// Example bodies:
//   { "weeklyDigestOn": false }
//   { "moodReminderOn": true, "moodReminderTime": "08:30" }
//   { "moodReminderTime": null }  ← clears the time and disables reminder
export const updatePreferencesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = updatePreferencesSchema.parse(req.body);
    const result = await updatePreferences(req.userId!, data);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/auth/me/password  ← NEW
//
// Changes the password for the currently authenticated user.
// Requires: Authorization: Bearer <accessToken>
//
// The user must supply their CURRENT password to prove identity
// even though they are already authenticated. This protects against:
//   • Unattended unlocked devices
//   • Stolen short-lived access tokens (14-min window)
//
// On success:
//   • New bcrypt hash is stored
//   • ALL refresh tokens are revoked (forces re-login on all devices)
//   • 200 response with message — client should redirect to login
//
// On failure:
//   • 400 — validation error (weak new password, passwords don't match, etc.)
//   • 401 — missing/invalid Bearer token (middleware rejects before reaching here)
//   • 400 — "Current password is incorrect" (wrong current password)
//
// Note: we intentionally do NOT issue new tokens in the response.
// The client must perform a fresh login with the new password.
export const changePasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(
      req.body,
    );
    const result = await changePassword(
      req.userId!,
      currentPassword,
      newPassword,
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
