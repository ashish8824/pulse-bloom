import { z } from "zod";

// ─────────────────────────────────────────────────────────────────
// SHARED ENUMS
// Defined once here and reused across schemas.
// Must match the Prisma schema enum values exactly.
// ─────────────────────────────────────────────────────────────────

const frequencyEnum = z.enum(["daily", "weekly"], {
  errorMap: () => ({ message: "Frequency must be 'daily' or 'weekly'" }),
});

const categoryEnum = z.enum(
  ["health", "fitness", "learning", "mindfulness", "productivity", "custom"],
  { errorMap: () => ({ message: "Invalid category" }) },
);

// ─────────────────────────────────────────────────────────────────
// CREATE HABIT — POST /api/habits
// ─────────────────────────────────────────────────────────────────
export const createHabitSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(100, "Title must be under 100 characters")
    .transform((val) => val.trim()), // strips accidental spaces before storage

  description: z
    .string()
    .max(500, "Description must be under 500 characters")
    .transform((val) => val.trim())
    .optional(),

  frequency: frequencyEnum,

  // Category defaults to "custom" in schema but can be set on creation
  category: categoryEnum.optional(),

  // Hex color code for frontend UI differentiation
  // Regex: must be valid 6-digit hex like #FF5733
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code like #FF5733")
    .optional(),

  // Single emoji icon for visual identification
  icon: z.string().max(10, "Icon must be a single emoji").optional(),

  // Optional weekly target — e.g. daily habit but user only wants 5/7 days
  // Must be between 1 and 7
  targetPerWeek: z
    .number()
    .int("Target must be a whole number")
    .min(1, "Target must be at least 1")
    .max(7, "Target cannot exceed 7 days per week")
    .optional(),

  // Reminder time in HH:MM 24-hour format
  reminderTime: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):[0-5]\d$/,
      "Reminder time must be in HH:MM format (e.g. 08:00)",
    )
    .optional(),

  reminderOn: z.boolean().optional(),
});

// ─────────────────────────────────────────────────────────────────
// UPDATE HABIT — PATCH /api/habits/:id
// All fields optional — true PATCH semantics.
// Only the fields you send will be changed.
// ─────────────────────────────────────────────────────────────────
export const updateHabitSchema = z
  .object({
    title: z
      .string()
      .min(2, "Title must be at least 2 characters")
      .max(100, "Title must be under 100 characters")
      .transform((val) => val.trim())
      .optional(),

    description: z
      .string()
      .max(500, "Description must be under 500 characters")
      .transform((val) => val.trim())
      .optional(),

    frequency: frequencyEnum.optional(),
    category: categoryEnum.optional(),

    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code like #FF5733")
      .nullable() // allow null to clear the color
      .optional(),

    icon: z
      .string()
      .max(10, "Icon must be a single emoji")
      .nullable() // allow null to clear the icon
      .optional(),

    targetPerWeek: z
      .number()
      .int()
      .min(1)
      .max(7)
      .nullable() // allow null to remove the target
      .optional(),

    reminderTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):[0-5]\d$/,
        "Reminder time must be in HH:MM format",
      )
      .nullable()
      .optional(),

    reminderOn: z.boolean().optional(),
  })
  // Reject completely empty PATCH bodies — at least one field must be present
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

// ─────────────────────────────────────────────────────────────────
// COMPLETE HABIT — POST /api/habits/:id/complete
// Body is entirely optional — note is the only field
// ─────────────────────────────────────────────────────────────────
export const completeHabitSchema = z.object({
  note: z
    .string()
    .max(300, "Note must be under 300 characters")
    .transform((val) => val.trim())
    .optional(),
});

// ─────────────────────────────────────────────────────────────────
// REORDER HABITS — PATCH /api/habits/reorder
// Accepts an array of { id, sortOrder } pairs
// ─────────────────────────────────────────────────────────────────
export const reorderHabitsSchema = z.object({
  // Must be a non-empty array of objects with id and sortOrder
  habits: z
    .array(
      z.object({
        id: z.string().uuid("Each habit ID must be a valid UUID"),
        sortOrder: z.number().int().min(0, "Sort order must be 0 or greater"),
      }),
    )
    .min(1, "At least one habit must be provided"),
});

// ─────────────────────────────────────────────────────────────────
// REMINDER — PATCH /api/habits/:id/reminder
// Dedicated endpoint for toggling reminder without a full PATCH
// ─────────────────────────────────────────────────────────────────
export const reminderSchema = z.object({
  reminderOn: z.boolean({ required_error: "reminderOn is required" }),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Reminder time must be in HH:MM format")
    .optional(),
});

// ─────────────────────────────────────────────────────────────────
// EXPORTED TYPESCRIPT TYPES
// Inferred from schemas — use these in service and controller layers
// instead of writing duplicate interface definitions
// ─────────────────────────────────────────────────────────────────
export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
export type CompleteHabitInput = z.infer<typeof completeHabitSchema>;
export type ReorderHabitsInput = z.infer<typeof reorderHabitsSchema>;
export type ReminderInput = z.infer<typeof reminderSchema>;
