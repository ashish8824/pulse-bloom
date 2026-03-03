import {
  getMoodScoresForCorrelation,
  getActiveHabitsForUser,
  getHabitLogDatesInRange,
  getAllHabitLogsInRange,
} from "./analytics.repository";

// ─────────────────────────────────────────────────────────────────
// ANALYTICS SERVICE — Business Logic Layer
//
// Feature #7: Mood ↔ Habit Correlation Engine
//
// Algorithm:
//   1. Fetch last 90 days of mood entries → build a Map<dateString, avgMood>
//   2. Fetch all active habits for the user
//   3. For each habit, fetch its completion dates in the same window
//   4. Split all days in the window into: completed days vs skip days
//   5. Average mood on each group → compute lift (completionAvg - skipAvg)
//   6. Filter out habits with insufficient data, sort by lift DESC
// ─────────────────────────────────────────────────────────────────

// Minimum number of days in each group (completed/skipped) required
// to include a habit in the results. Prevents misleading correlations
// from habits with only 1–2 data points.
const MIN_DAYS_REQUIRED = 3;

// Analysis window in days. 90 days gives meaningful signal without
// being too noisy from long-ago behavioral changes.
const ANALYSIS_WINDOW_DAYS = 90;

// ─── PRIVATE HELPERS ──────────────────────────────────────────────

/** Format a Date as YYYY-MM-DD using UTC to avoid timezone drift. */
const toDateString = (date: Date): string => date.toISOString().split("T")[0];

/**
 * Build a Map from date string → average mood score for that day.
 *
 * Why average per day (not per entry)?
 * Users can log multiple moods per day. We want one representative
 * score per day so each day has equal weight in the correlation,
 * regardless of how many times the user logged.
 */
const buildDailyMoodMap = (
  entries: { moodScore: number; createdAt: Date }[],
): Map<string, number> => {
  // First pass: group scores by date
  const grouped = new Map<string, number[]>();

  for (const entry of entries) {
    const dateKey = toDateString(entry.createdAt);
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(entry.moodScore);
  }

  // Second pass: compute per-day average
  const dailyAvg = new Map<string, number>();
  for (const [date, scores] of grouped) {
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    dailyAvg.set(date, Math.round(avg * 100) / 100);
  }

  return dailyAvg;
};

/**
 * Generate every calendar date string in a [from, to] window.
 * Used to enumerate skip days: all days the habit was NOT completed
 * but on which the user DID log a mood.
 */
const generateDateRange = (from: Date, to: Date): string[] => {
  const dates: string[] = [];
  const cursor = new Date(from);

  while (cursor <= to) {
    dates.push(toDateString(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
};

/** Compute the simple arithmetic mean of an array of numbers. */
const mean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return (
    Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) /
    100
  );
};

// ─── EXPORTED SERVICE ─────────────────────────────────────────────

export interface CorrelationResult {
  habitId: string;
  habitTitle: string;
  frequency: string;
  completionDayAvg: number;
  skipDayAvg: number;
  lift: number; // positive = habit associated with better mood, negative = worse
  completionDaysAnalyzed: number;
  skipDaysAnalyzed: number;
}

export interface CorrelationResponse {
  correlations: CorrelationResult[];
  analyzedDays: number;
  moodLoggedDays: number;
  message: string;
}

/**
 * Calculate mood ↔ habit correlation for all active habits of a user.
 *
 * Returns habits sorted by lift descending (biggest positive impact first).
 * Habits with insufficient data in either group are excluded from results.
 */
export const calculateMoodHabitCorrelation = async (
  userId: string,
): Promise<CorrelationResponse> => {
  // ── 1. Define analysis window ──────────────────────────────────
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999); // end of today

  const from = new Date();
  from.setUTCDate(from.getUTCDate() - ANALYSIS_WINDOW_DAYS + 1);
  from.setUTCHours(0, 0, 0, 0); // start of day N days ago

  // ── 2. Fetch mood data and build the daily mood map ────────────
  // Run mood fetch and habit list fetch in parallel — no dependency between them
  const [moodEntries, habits] = await Promise.all([
    getMoodScoresForCorrelation(userId, from, to),
    getActiveHabitsForUser(userId),
  ]);

  if (moodEntries.length === 0) {
    return {
      correlations: [],
      analyzedDays: ANALYSIS_WINDOW_DAYS,
      moodLoggedDays: 0,
      message:
        "No mood data found in the last 90 days. Log some moods to see correlations.",
    };
  }

  if (habits.length === 0) {
    return {
      correlations: [],
      analyzedDays: ANALYSIS_WINDOW_DAYS,
      moodLoggedDays: 0,
      message:
        "No active habits found. Create some habits to see how they correlate with your mood.",
    };
  }

  const dailyMoodMap = buildDailyMoodMap(moodEntries);
  const moodLoggedDays = dailyMoodMap.size;

  // All days in the window where the user actually logged a mood.
  // We only compare days with mood data — a day with no mood log
  // can't tell us anything about mood on completion vs skip days.
  const allMoodDays = new Set(dailyMoodMap.keys());

  // ── 3. Process each habit ──────────────────────────────────────
  // Fetch all habit log dates in parallel — one query per habit,
  // all fired concurrently via Promise.all
  const habitLogResults = await Promise.all(
    habits.map(async (habit) => {
      const logs = await getHabitLogDatesInRange(habit.id, from, to);
      return { habit, logs };
    }),
  );

  // ── 4. Compute correlation for each habit ─────────────────────
  const correlations: CorrelationResult[] = [];

  for (const { habit, logs } of habitLogResults) {
    // Build a Set of completion date strings for O(1) lookup
    const completedDates = new Set(logs.map((l) => toDateString(l.date)));

    // Split mood-logged days into two groups
    const completionMoods: number[] = [];
    const skipMoods: number[] = [];

    for (const moodDay of allMoodDays) {
      const mood = dailyMoodMap.get(moodDay)!;
      if (completedDates.has(moodDay)) {
        completionMoods.push(mood);
      } else {
        skipMoods.push(mood);
      }
    }

    // Skip habits where either group lacks sufficient data points
    if (
      completionMoods.length < MIN_DAYS_REQUIRED ||
      skipMoods.length < MIN_DAYS_REQUIRED
    ) {
      continue;
    }

    const completionDayAvg = mean(completionMoods);
    const skipDayAvg = mean(skipMoods);
    const lift = Math.round((completionDayAvg - skipDayAvg) * 100) / 100;

    correlations.push({
      habitId: habit.id,
      habitTitle: habit.title,
      frequency: habit.frequency,
      completionDayAvg,
      skipDayAvg,
      lift,
      completionDaysAnalyzed: completionMoods.length,
      skipDaysAnalyzed: skipMoods.length,
    });
  }

  // ── 5. Sort by lift DESC (biggest positive impact first) ───────
  correlations.sort((a, b) => b.lift - a.lift);

  const message =
    correlations.length === 0
      ? `Not enough data yet. Complete your habits more consistently over the next few weeks to unlock correlation insights.`
      : `Sorted by mood impact. Positive lift = habit days have higher average mood than skip days.`;

  return {
    correlations,
    analyzedDays: ANALYSIS_WINDOW_DAYS,
    moodLoggedDays,
    message,
  };
};

// ─────────────────────────────────────────────────────────────────
// FEATURE #10 — HABIT CORRELATION MATRIX
// ─────────────────────────────────────────────────────────────────

export interface HabitPairResult {
  habitA: { id: string; title: string };
  habitB: { id: string; title: string };
  coCompletionRate: number; // % of (A∪B days) where both A and B were done
  coCompletedDays: number; // days where BOTH were completed
  eitherCompletedDays: number; // days where AT LEAST ONE was completed
  suggestion: string;
}

export interface HabitMatrixResponse {
  matrix: HabitPairResult[];
  analyzedDays: number;
  totalHabits: number;
  message: string;
}

/**
 * Compute co-completion rate for every pair of active habits.
 *
 * Algorithm:
 *   1. Fetch all active habits for the user
 *   2. Fetch ALL their logs in one query (single DB round-trip)
 *   3. Build a Map<habitId, Set<dateString>> for O(1) date lookup
 *   4. For every unique habit pair (A, B):
 *        eitherDays = |dates where A completed ∪ dates where B completed|
 *        bothDays   = |dates where A completed ∩ dates where B completed|
 *        coCompletionRate = (bothDays / eitherDays) × 100
 *   5. Filter pairs with insufficient data, sort by rate DESC
 *
 * Why union-based denominator (not total days)?
 * Using total calendar days would unfairly penalise habits that were
 * created recently — a habit started last week has ~83 "missed" days
 * before it even existed. The union denominator only counts days where
 * at least one of the two habits was active, giving a fair rate.
 */
export const calculateHabitMatrix = async (
  userId: string,
): Promise<HabitMatrixResponse> => {
  // ── 1. Define analysis window ──────────────────────────────────
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);

  const from = new Date();
  from.setUTCDate(from.getUTCDate() - ANALYSIS_WINDOW_DAYS + 1);
  from.setUTCHours(0, 0, 0, 0);

  // ── 2. Fetch habits + all logs in parallel ─────────────────────
  const [habits, allLogs] = await Promise.all([
    getActiveHabitsForUser(userId),
    getAllHabitLogsInRange(userId, from, to),
  ]);

  // Need at least 2 habits to form any pair
  if (habits.length < 2) {
    return {
      matrix: [],
      analyzedDays: ANALYSIS_WINDOW_DAYS,
      totalHabits: habits.length,
      message:
        "You need at least 2 active habits to see correlation data. Create more habits to unlock this feature.",
    };
  }

  // ── 3. Build Map<habitId, Set<dateString>> ─────────────────────
  // toDateString normalises each log's DateTime to a plain YYYY-MM-DD
  // so daily habits and weekly habits both compare on the same axis.
  const habitDateSets = new Map<string, Set<string>>();

  // Initialise an empty Set for every active habit — even habits with
  // zero completions need to be present so pair generation is complete.
  for (const habit of habits) {
    habitDateSets.set(habit.id, new Set());
  }

  for (const log of allLogs) {
    const dateStr = toDateString(log.date);
    habitDateSets.get(log.habitId)?.add(dateStr);
  }

  // ── 4. Compute every unique pair ──────────────────────────────
  const matrix: HabitPairResult[] = [];

  for (let i = 0; i < habits.length; i++) {
    for (let j = i + 1; j < habits.length; j++) {
      const habitA = habits[i];
      const habitB = habits[j];

      const datesA = habitDateSets.get(habitA.id)!;
      const datesB = habitDateSets.get(habitB.id)!;

      // Union: days where at least one was completed
      const unionDates = new Set([...datesA, ...datesB]);
      const eitherCompletedDays = unionDates.size;

      // Skip pairs where neither habit has enough data
      if (eitherCompletedDays < MIN_DAYS_REQUIRED) continue;

      // Intersection: days where both were completed
      let coCompletedDays = 0;
      // Iterate the smaller set for efficiency
      const [smaller, larger] =
        datesA.size <= datesB.size ? [datesA, datesB] : [datesB, datesA];
      for (const date of smaller) {
        if (larger.has(date)) coCompletedDays++;
      }

      const coCompletionRate =
        Math.round((coCompletedDays / eitherCompletedDays) * 10000) / 100; // two decimal places

      // Build a human-readable suggestion based on the rate
      const suggestion = buildSuggestion(
        habitA.title,
        habitB.title,
        coCompletionRate,
      );

      matrix.push({
        habitA: { id: habitA.id, title: habitA.title },
        habitB: { id: habitB.id, title: habitB.title },
        coCompletionRate,
        coCompletedDays,
        eitherCompletedDays,
        suggestion,
      });
    }
  }

  // ── 5. Sort by co-completion rate DESC ────────────────────────
  matrix.sort((a, b) => b.coCompletionRate - a.coCompletionRate);

  const message =
    matrix.length === 0
      ? "Complete your habits more consistently over the next few weeks to unlock pair correlation data."
      : "Sorted by co-completion rate. High rate = strong habit stack candidate.";

  return {
    matrix,
    analyzedDays: ANALYSIS_WINDOW_DAYS,
    totalHabits: habits.length,
    message,
  };
};

/**
 * Generate a plain-English suggestion for a habit pair based on their
 * co-completion rate. Used directly in the API response.
 *
 * Thresholds chosen to match intuitive language:
 *   ≥ 80% → strong stack (they almost always go together)
 *   ≥ 60% → often paired (more often than not)
 *   ≥ 40% → moderate link (sometimes together)
 *   < 40%  → rarely paired (treat as independent)
 */
const buildSuggestion = (
  titleA: string,
  titleB: string,
  rate: number,
): string => {
  if (rate >= 80) {
    return `Strong habit stack — "${titleA}" and "${titleB}" are almost always done together. Consider combining them into a single routine.`;
  }
  if (rate >= 60) {
    return `"${titleA}" and "${titleB}" are often completed on the same day. Try intentionally pairing them.`;
  }
  if (rate >= 40) {
    return `"${titleA}" and "${titleB}" occasionally overlap. There may be a habit stack opportunity here.`;
  }
  return `"${titleA}" and "${titleB}" are rarely completed on the same day — they appear to be independent habits.`;
};
