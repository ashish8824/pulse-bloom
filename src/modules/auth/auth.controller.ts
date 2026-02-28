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
