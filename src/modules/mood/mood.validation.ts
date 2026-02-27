import { z } from "zod";

// ─────────────────────────────────────────────────────────────────
// MOOD VALIDATION SCHEMAS
// Single source of truth for all mood-module input validation.
// Zod schemas are parsed in controllers — ZodErrors bubble up
// to the global error handler which formats them as 400 responses.
// ─────────────────────────────────────────────────────────────────

// ─── CREATE ───────────────────────────────────────────────────────

/**
 * POST /api/mood
 *
 * moodScore + emoji are required.
 * journalText is optional — a quick emoji log is a valid use case.
 * tags are optional context slugs for filtering and AI context.
 */
export const createMoodSchema = z.object({
  moodScore: z
    .number({ required_error: "moodScore is required" })
    .int("moodScore must be an integer")
    .min(1, "moodScore must be at least 1")
    .max(5, "moodScore must be at most 5"),

  emoji: z
    .string({ required_error: "emoji is required" })
    .min(1, "emoji cannot be empty"),

  journalText: z
    .string()
    .max(5000, "Journal text must be under 5000 characters")
    .transform((val) => val.trim())
    .optional(),

  // Lowercase context slugs: ["work", "sleep", "exercise"]
  // Used by AI prompt builder and future tag-based filtering
  tags: z
    .array(
      z
        .string()
        .min(1)
        .max(30)
        .regex(
          /^[a-z0-9-]+$/,
          "Tags must be lowercase alphanumeric (hyphens allowed)",
        ),
    )
    .max(10, "Maximum 10 tags per entry")
    .optional(),
});

// ─── UPDATE ───────────────────────────────────────────────────────

/**
 * PATCH /api/mood/:id
 *
 * True PATCH semantics — only provided fields are changed.
 * At least one field must be present.
 * journalText: null = explicitly delete the linked journal entry.
 */
export const updateMoodSchema = z
  .object({
    moodScore: z
      .number()
      .int("moodScore must be an integer")
      .min(1, "moodScore must be at least 1")
      .max(5, "moodScore must be at most 5")
      .optional(),

    emoji: z.string().min(1, "emoji cannot be empty").optional(),

    journalText: z
      .string()
      .max(5000, "Journal text must be under 5000 characters")
      .transform((val) => val.trim())
      .nullable() // null = explicitly clear the journal
      .optional(),

    tags: z
      .array(
        z
          .string()
          .min(1)
          .max(30)
          .regex(/^[a-z0-9-]+$/, "Tags must be lowercase alphanumeric"),
      )
      .max(10, "Maximum 10 tags per entry")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

// ─── QUERY / PAGINATION ───────────────────────────────────────────

/**
 * Shared query schema for all list + analytics endpoints.
 * page/limit for pagination, startDate/endDate for date-range filtering.
 */
export const moodQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),

    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be in YYYY-MM-DD format")
      .optional(),

    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be in YYYY-MM-DD format")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    { message: "startDate must be before or equal to endDate" },
  );

// ─── HEATMAP ──────────────────────────────────────────────────────

/**
 * GET /api/mood/heatmap
 * days: how many past days to include, default 365, max 730 (2 years)
 */
export const heatmapQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .min(1, "days must be at least 1")
    .max(730, "days cannot exceed 730 (2 years)")
    .default(365),
});

// ─── MONTHLY SUMMARY ──────────────────────────────────────────────

/**
 * GET /api/mood/summary/monthly
 * month: YYYY-MM format, defaults to current month
 */
export const monthlySummaryQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "month must be in YYYY-MM format (e.g. 2026-02)")
    .optional(),
});

// ─── EXPORTED TYPES ───────────────────────────────────────────────

export type CreateMoodInput = z.infer<typeof createMoodSchema>;
export type UpdateMoodInput = z.infer<typeof updateMoodSchema>;
export type MoodQueryInput = z.infer<typeof moodQuerySchema>;
export type HeatmapQueryInput = z.infer<typeof heatmapQuerySchema>;
export type MonthlySummaryQueryInput = z.infer<
  typeof monthlySummaryQuerySchema
>;
