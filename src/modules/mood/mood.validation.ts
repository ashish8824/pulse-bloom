import { z } from "zod";

/**
 * Validation schema for creating mood entry
 */
export const createMoodSchema = z.object({
  moodScore: z.number().min(1).max(5),
  emoji: z.string().min(1),
  journalText: z.string().min(1),
});

/**
 * Pagination + Date filtering validation
 */
export const moodQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),

  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
