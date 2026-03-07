// src/modules/auth/auth.routes.ts

import { Router } from "express";
import {
  registerController,
  verifyEmailController,
  resendVerificationController,
  loginController,
  refreshTokenController,
  logoutController,
  meController,
  forgotPasswordController,
  resetPasswordController,
  updatePreferencesController,
} from "./auth.controller";
import { protect } from "../../middlewares/auth.middleware";
import {
  authLimiter,
  resendVerificationLimiter,
  forgotPasswordLimiter,
} from "../../middlewares/rateLimiter";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication, email verification, and password management
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required: [email, password, name]
 *       properties:
 *         email:    { type: string, example: "ashish@example.com" }
 *         password: { type: string, example: "MyPass@123" }
 *         name:     { type: string, example: "Ashish Anand" }
 *
 *     LoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:    { type: string, example: "7461ashishanand@gmail.com" }
 *         password: { type: string, example: "Ritesh@1234" }
 *
 *     VerifyEmailRequest:
 *       type: object
 *       required: [email, otp]
 *       properties:
 *         email: { type: string, example: "ashish@example.com" }
 *         otp:   { type: string, example: "482931" }
 *
 *     ResendVerificationRequest:
 *       type: object
 *       required: [email]
 *       properties:
 *         email: { type: string, example: "ashish@example.com" }
 *
 *     RefreshTokenRequest:
 *       type: object
 *       required: [refreshToken]
 *       properties:
 *         refreshToken: { type: string, example: "a1b2c3...64hexchars" }
 *
 *     LogoutRequest:
 *       type: object
 *       required: [refreshToken]
 *       properties:
 *         refreshToken: { type: string, example: "a1b2c3...64hexchars" }
 *
 *     ForgotPasswordRequest:
 *       type: object
 *       required: [email]
 *       properties:
 *         email: { type: string, example: "ashish@example.com" }
 *
 *     ResetPasswordRequest:
 *       type: object
 *       required: [token, password, confirmPassword]
 *       properties:
 *         token:           { type: string, example: "c9f3a2...64hexchars" }
 *         password:        { type: string, example: "NewPass@456" }
 *         confirmPassword: { type: string, example: "NewPass@456" }
 *
 *     UpdatePreferencesRequest:
 *       type: object
 *       description: All fields optional — send only what you want to change.
 *       properties:
 *         weeklyDigestOn:
 *           type: boolean
 *           example: true
 *           description: Opt in/out of the Saturday 8am weekly email summary.
 *         moodReminderOn:
 *           type: boolean
 *           example: true
 *           description: Toggle mood check-in reminder. Requires moodReminderTime to be set.
 *         moodReminderTime:
 *           type: string
 *           nullable: true
 *           example: "08:30"
 *           description: |
 *             24-hour HH:MM format. Send null to clear and auto-disable the reminder.
 *
 *     PreferencesResponse:
 *       type: object
 *       properties:
 *         message: { type: string, example: "Preferences updated successfully." }
 *         preferences:
 *           type: object
 *           properties:
 *             id:               { type: string }
 *             weeklyDigestOn:   { type: boolean }
 *             moodReminderOn:   { type: boolean }
 *             moodReminderTime: { type: string, nullable: true, example: "08:30" }
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           properties:
 *             id:         { type: string }
 *             email:      { type: string }
 *             name:       { type: string }
 *             isVerified: { type: boolean }
 *         accessToken:                 { type: string }
 *         refreshToken:                { type: string }
 *         accessTokenExpiresInSeconds: { type: integer, example: 840 }
 *
 *     RegisterResponse:
 *       type: object
 *       properties:
 *         message:  { type: string }
 *         user:
 *           type: object
 *           properties:
 *             id:         { type: string }
 *             email:      { type: string }
 *             name:       { type: string }
 *             isVerified: { type: boolean, example: false }
 *
 *     UserProfile:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           properties:
 *             id:               { type: string }
 *             email:            { type: string }
 *             name:             { type: string }
 *             isVerified:       { type: boolean }
 *             createdAt:        { type: string, format: date-time }
 *             updatedAt:        { type: string, format: date-time }
 *             weeklyDigestOn:   { type: boolean }
 *             moodReminderOn:   { type: boolean }
 *             moodReminderTime: { type: string, nullable: true }
 *
 *     MessageResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error: { type: string }
 *
 *     ValidationErrorResponse:
 *       type: object
 *       properties:
 *         error: { type: string, example: "Validation failed" }
 *         issues:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:   { type: string }
 *               message: { type: string }
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates account and sends 6-digit OTP to email. No tokens until email is verified.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegisterRequest' }
 *     responses:
 *       201:
 *         description: Registered. Verification email sent.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RegisterResponse' }
 *       400: { description: Validation error }
 *       409: { description: Email already registered }
 *       429: { description: Too many attempts }
 */
router.post("/register", authLimiter, registerController);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email with OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/VerifyEmailRequest' }
 *     responses:
 *       200:
 *         description: Verified. Tokens issued.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { description: Invalid or expired OTP }
 *       409: { description: Already verified }
 */
router.post("/verify-email", verifyEmailController);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend verification OTP
 *     description: Rate limited to 3 per 15 min. Always returns 200.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ResendVerificationRequest' }
 *     responses:
 *       200: { description: Always 200 }
 *       429: { description: Too many requests }
 */
router.post(
  "/resend-verification",
  resendVerificationLimiter,
  resendVerificationController,
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginRequest' }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       401: { description: Invalid credentials }
 *       403: { description: Email not verified }
 *       429: { description: Too many attempts }
 */
router.post("/login", authLimiter, loginController);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Rotate access + refresh tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RefreshTokenRequest' }
 *     responses:
 *       200:
 *         description: New tokens issued
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       401: { description: Invalid, revoked, or expired refresh token }
 */
router.post("/refresh-token", refreshTokenController);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LogoutRequest' }
 *     responses:
 *       200: { description: Logged out }
 *       401: { description: Missing or invalid access token }
 */
router.post("/logout", protect, logoutController);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get authenticated user profile
 *     description: |
 *       Returns the user profile including engagement preferences
 *       (weeklyDigestOn, moodReminderOn, moodReminderTime).
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UserProfile' }
 *       401: { description: Missing or invalid access token }
 *       404: { description: User not found }
 */
router.get("/me", protect, meController);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     description: Always returns 200 (prevents user enumeration).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ForgotPasswordRequest' }
 *     responses:
 *       200: { description: Always 200 }
 *       429: { description: Too many requests }
 */
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPasswordController,
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using token from email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ResetPasswordRequest' }
 *     responses:
 *       200: { description: Password reset successful }
 *       400: { description: Invalid/expired token or passwords don't match }
 */
router.post("/reset-password", resetPasswordController);

/**
 * @swagger
 * /api/auth/me/preferences:
 *   patch:
 *     summary: Update notification and reminder preferences
 *     description: |
 *       All fields are optional — send only the ones you want to change.
 *
 *       **weeklyDigestOn** — opt in/out of the Saturday 8am weekly email summary.
 *
 *       **moodReminderOn + moodReminderTime** — enable/disable a daily mood check-in
 *       nudge email. Setting `moodReminderOn: true` requires a `moodReminderTime`
 *       to be set (either in this request or already stored). Send `moodReminderTime: null`
 *       to clear the time and auto-disable the reminder.
 *
 *       Example — enable mood reminder at 8:30am:
 *       ```json
 *       { "moodReminderOn": true, "moodReminderTime": "08:30" }
 *       ```
 *
 *       Example — disable weekly digest only:
 *       ```json
 *       { "weeklyDigestOn": false }
 *       ```
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdatePreferencesRequest' }
 *     responses:
 *       200:
 *         description: Preferences updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PreferencesResponse' }
 *       400:
 *         description: |
 *           Validation error — e.g. moodReminderTime is not HH:MM format,
 *           or tried to enable reminder without a time.
 *       401:
 *         description: Missing or invalid access token
 */
router.patch("/me/preferences", protect, updatePreferencesController);

export default router;
