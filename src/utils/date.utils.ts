// ─────────────────────────────────────────────────────────────────
// DATE UTILITIES
//
// These functions normalize dates for habit period tracking.
// "Normalize" means: strip time components so that any timestamp
// within a given period maps to a single canonical Date value.
//
// This is critical for the @@unique([habitId, date]) constraint:
// if two completions at 9am and 9pm produce different timestamps,
// the unique constraint won't catch the duplicate.
//
// All normalization sets time to midnight (00:00:00.000) in local time.
// ─────────────────────────────────────────────────────────────────

/**
 * Returns today's date normalized to midnight (start of day).
 *
 * Used for daily habit completion and streak calculation.
 * Any call made on the same calendar day returns the same timestamp,
 * ensuring the unique constraint catches duplicate completions correctly.
 *
 * Example: new Date() at 14:32:11 → 2026-02-23T00:00:00.000
 */
export const normalizeDailyDate = (): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Returns the Monday of the current ISO week normalized to midnight.
 *
 * Used for weekly habit completion and streak calculation.
 * Any call made Mon–Sun of the same week returns the same Monday timestamp.
 *
 * Why Monday (ISO week)?
 * ISO 8601 defines weeks as Mon–Sun. Using Sunday (US convention) would
 * cause ambiguity when users interact around the week boundary.
 *
 * Example: Called on Wednesday 2026-02-25 → returns 2026-02-23T00:00:00.000 (Monday)
 * Example: Called on Sunday   2026-03-01  → returns 2026-02-23T00:00:00.000 (same week)
 *
 * Edge case: getDay() returns 0 for Sunday.
 * The expression `day === 0 ? -6 : 1` shifts Sunday back 6 days
 * to the preceding Monday rather than forward to the next Monday.
 */
export const normalizeWeeklyDate = (): Date => {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Calculate days to subtract to reach Monday
  const daysToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + daysToMonday);
  monday.setHours(0, 0, 0, 0);

  return monday;
};
