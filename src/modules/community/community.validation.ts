// src/modules/community/community.validation.ts
//
// ZOD SCHEMAS — validated at the route layer before controller runs.
// Validation errors are caught by the global error handler which
// converts ZodErrors into 400 responses with field-level detail.

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────
// CREATE POST
//
// type: MILESTONE — celebrating a streak or habit achievement
// type: REFLECTION — freeform thought, feeling, or observation
//
// content: capped at 500 chars — keeps posts card-sized, not essays
// tags: up to 5 lowercase slugs for filtering (e.g. "meditation")
// ─────────────────────────────────────────────────────────────────
export const createPostSchema = z
  .object({
    type: z.enum(["MILESTONE", "REFLECTION"]),
    content: z
      .string()
      .min(1, "Post content cannot be empty")
      .max(500, "Post content cannot exceed 500 characters")
      .trim(),
    tags: z
      .array(z.string().min(1).max(30).toLowerCase().trim())
      .max(5, "Maximum 5 tags per post")
      .default([]),
  })
  .strict();

export type CreatePostInput = z.infer<typeof createPostSchema>;

// ─────────────────────────────────────────────────────────────────
// FEED QUERY PARAMS
//
// sort: newest (default) | popular (by upvote count)
// type: optional filter — show only MILESTONE or REFLECTION posts
// tag: optional filter — show only posts with this tag
// page/limit: standard pagination
// ─────────────────────────────────────────────────────────────────
export const feedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  sort: z.enum(["newest", "popular"]).default("newest"),
  type: z.enum(["MILESTONE", "REFLECTION"]).optional(),
  tag: z.string().optional(),
});

export type FeedQueryInput = z.infer<typeof feedQuerySchema>;
