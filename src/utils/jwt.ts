import jwt from "jsonwebtoken";
import { env } from "../config/env";

/**
 * Generate JWT Access Token
 */
export const generateToken = (payload: object) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

export interface JwtPayload {
  userId: string;
}

/**
 * Verify JWT Token
 */
export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};
