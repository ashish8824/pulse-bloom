import jwt from "jsonwebtoken";
import { env } from "../config/env";

/**
 * Generate JWT Access Token
 */
export const generateToken = (payload: object) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "15m",
  });
};

/**
 * Verify JWT Token
 */
export const verifyToken = (token: string) => {
  return jwt.verify(token, env.JWT_SECRET);
};
