import { z } from "zod";

/**
 * Schema for creating a habit
 * Enforces enum-based frequency
 */
export const createHabitSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  frequency: z.enum(["daily", "weekly"]),
});
