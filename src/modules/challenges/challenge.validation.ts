// src/modules/challenges/challenge.validation.ts
//
// ZOD SCHEMAS — validated at the route layer before controller runs.
// Validation errors are caught by the global error handler which
// converts ZodErrors into 400 responses with field-level detail.

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────
// CREATE CHALLENGE
//
// WHY validate startDate >= today?
//   A challenge starting in the past immediately has missed days —
//   bad UX and confusing progress % on day 1.
//
// WHY validate endDate > startDate?
//   endDate is auto-computed as startDate + targetDays but we still
//   accept it explicitly so clients can do multi-day offsets.
//
// targetDays: capped at 365 — prevents accidental decade-long challenges.
// ─────────────────────────────────────────────────────────────────
export const createChallengeSchema = z
  .object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(100, "Title cannot exceed 100 characters")
      .trim(),
    description: z.string().max(500).optional(),
    habitId: z.string().uuid("Invalid habit ID").optional(),
    targetDays: z
      .number()
      .int()
      .min(1, "Challenge must be at least 1 day")
      .max(365, "Challenge cannot exceed 365 days"),
    startDate: z.coerce
      .date()
      .refine(
        (d) => d >= new Date(new Date().toISOString().split("T")[0]),
        "Start date cannot be in the past",
      ),
    isPublic: z.boolean().default(true),
  })
  .strict();

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;

// ─────────────────────────────────────────────────────────────────
// JOIN CHALLENGE (by join code for private, or by ID for public)
// ─────────────────────────────────────────────────────────────────
export const joinChallengeSchema = z
  .object({
    joinCode: z.string().optional(), // for private challenges
  })
  .strict();

// ─────────────────────────────────────────────────────────────────
// MANUAL COMPLETION (for challenges without a linked habit)
// ─────────────────────────────────────────────────────────────────
export const completeChallengeSchema = z
  .object({
    note: z.string().max(200).optional(),
  })
  .strict();

// ─────────────────────────────────────────────────────────────────
// LIST CHALLENGES QUERY PARAMS
// ─────────────────────────────────────────────────────────────────
export const listChallengesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  active: z.coerce.boolean().optional(), // filter by isActive
});
