import { Request } from "express";

/**
 * Extend Express Request to include userId
 */
declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}
