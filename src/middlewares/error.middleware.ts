import { Request, Response, NextFunction } from "express";

/**
 * Global error handler
 * Catches unhandled errors
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error("ERROR:", err);

  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
};
