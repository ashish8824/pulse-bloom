import {
  createMoodEntry,
  updateMoodEntryRecord,
  deleteMoodEntryRecord,
  findMoodById,
  getUserMoods,
  getMoodScores,
  getMoodLogDates,
  getMoodScoresInRange,
  getMoodEntriesForMonth,
  getMoodScoresWithTimestamp,
  checkFullMonthMoodCoverage, // ← PHASE 4: new repository function (see bottom of file)
} from "./mood.repository";
import { JournalModel } from "./mood.mongo";
import { CreateMoodInput, UpdateMoodInput } from "./mood.validation";
import { checkAndAwardMoodMilestones } from "../milestones/milestone.service";
import { checkAndAwardMoodBadges } from "../badges/badge.service"; // ← PHASE 4
import { prisma } from "../../config/db"; // ← PHASE 4

// ─────────────────────────────────────────────────────────────────
// MOOD SERVICE — Business Logic Layer
//
// Pure functions: zero HTTP dependencies, zero req/res.
// All DB access goes through mood.repository.
// Fully testable in isolation without Express or a live DB.
// ─────────────────────────────────────────────────────────────────

// ─── PRIVATE HELPERS ──────────────────────────────────────────────

/**
 * Correct ISO 8601 week number algorithm.
 * Week 1 = week containing the first Thursday of the year.
 * Weeks start on Monday — fixes the original Sunday-biased formula.
 */
const getISOWeek = (date: Date): { year: number; week: number } => {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { year: d.getUTCFullYear(), week };
};

/** Format a Date as YYYY-MM-DD (UTC, no time component). */
const toDateString = (date: Date): string => date.toISOString().split("T")[0];

/** Day name lookup — getUTCDay() returns 0=Sunday…6=Saturday */
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Hour → time-of-day bucket */
const getTimeBucket = (hour: number): string => {
  if (hour >= 5 && hour < 12) return "Morning (5am–12pm)";
  if (hour >= 12 && hour < 17) return "Afternoon (12pm–5pm)";
  if (hour >= 17 && hour < 21) return "Evening (5pm–9pm)";
  return "Night (9pm–5am)";
};

/**
 * Verify ownership of a mood entry.
 * Throws a typed error if the entry doesn't exist or belongs to another user.
 * Used before every write operation (update, delete).
 */
const assertMoodOwnership = async (id: string, userId: string) => {
  const entry = await findMoodById(id);
  if (!entry) {
    const err = new Error("Mood entry not found") as any;
    err.statusCode = 404;
    throw err;
  }
  if (entry.userId !== userId) {
    const err = new Error(
      "You do not have permission to modify this entry",
    ) as any;
    err.statusCode = 403;
    throw err;
  }
  return entry;
};

// ─────────────────────────────────────────────────────────────────
// PHASE 4: PRIVATE HELPER — computeBurnoutLevel
//
// A lightweight version of calculateBurnoutRisk() that returns just
// the risk level string ("Low" | "Moderate" | "High").
//
// Used inside addMood() to detect if burnout risk dropped from
// High → Low after the new entry is added, which triggers the
// RESILIENT badge award.
//
// WHY a separate helper instead of calling calculateBurnoutRisk()?
//   calculateBurnoutRisk() is a public async function that hits the
//   DB. Here we already have the scores in memory (from getMoodScores),
//   so we use this pure synchronous version to avoid an extra DB
//   round-trip. Same formula — different input source.
// ─────────────────────────────────────────────────────────────────
const computeBurnoutLevel = (scores: number[]): "Low" | "Moderate" | "High" => {
  if (scores.length < 3) return "Low";
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const lowMoodDays = scores.filter((s) => s <= 2).length;
  const volatility = Math.max(...scores) - Math.min(...scores);
  const riskScore =
    lowMoodDays * 2 + Math.max(0, 3.0 - avg) * 3 + volatility * 1.5;
  if (riskScore >= 10) return "High";
  if (riskScore >= 5) return "Moderate";
  return "Low";
};

// ─── CREATE ───────────────────────────────────────────────────────

/**
 * Create a mood entry.
 *
 * Flow:
 * 1. If journalText is provided → save to MongoDB first (with placeholder moodEntryId)
 * 2. Insert MoodEntry row in PostgreSQL (with journalId linking to Mongo)
 * 3. Update the Mongo document with the real PostgreSQL id (back-reference)
 * 4. Fire-and-forget: milestone checks (existing)
 * 5. Fire-and-forget: badge checks (Phase 4)
 *
 * Why Mongo first?
 * If Postgres insert fails, the orphaned Mongo doc has no FK consequence.
 * If Mongo fails, we bail before writing to Postgres — no partial state.
 *
 * Phase 4 badge checks require three extra pieces of data:
 *   totalMoodCount        → FIRST_STEP badge (count === 1)
 *   burnoutDroppedToLow   → RESILIENT badge (High → Low transition)
 *   loggedEveryDayThisMonth → MINDFUL_MONTH badge (full calendar month)
 *
 * All three are computed asynchronously inside the fire-and-forget
 * block — they never delay the primary mood response.
 */
export const addMood = async (input: CreateMoodInput, userId: string) => {
  let journalId: string | undefined;

  if (input.journalText) {
    const journal = await JournalModel.create({
      userId,
      moodEntryId: "pending",
      text: input.journalText,
      tags: input.tags ?? [],
    });
    journalId = journal._id.toString();
  }

  const mood = await createMoodEntry({
    moodScore: input.moodScore,
    emoji: input.emoji,
    journalId,
    userId,
  });

  // Close the bidirectional link: journal now knows its Postgres id
  if (journalId) {
    await JournalModel.findByIdAndUpdate(journalId, { moodEntryId: mood.id });
  }

  // ── Fire-and-forget: milestone checks (existing) ─────────────
  // currentMoodStreak is computed lazily inside checkAndAwardMoodMilestones.
  // We need the streak to check MOOD_STREAK milestones.
  calculateMoodStreak(userId)
    .then(({ currentStreak }) =>
      checkAndAwardMoodMilestones(userId, currentStreak),
    )
    .catch(() => {}); // swallow all errors — secondary side effect

  // ── Fire-and-forget: badge checks (Phase 4) ──────────────────
  //
  // WHY run in a separate async IIFE (not chained to the streak promise above)?
  //   Badge checks need different data than milestone checks:
  //     - totalMoodCount  (Prisma count query)
  //     - burnoutDroppedToLow (requires BOTH pre-entry and post-entry scores)
  //     - loggedEveryDayThisMonth (new repository function)
  //
  //   Chaining everything onto the streak promise would make the
  //   promise chain harder to read and debug. A self-contained async
  //   IIFE is cleaner and fails independently.
  //
  // WHY NOT await these?
  //   Same reason as milestones: badge failures must NEVER crash addMood().
  //   The mood IS saved — badges are a secondary reward layer.
  (async () => {
    try {
      // ── Data fetch (all in parallel for speed) ────────────────
      const [totalMoodCount, streak, recentScoreRows, monthCoverage] =
        await Promise.all([
          // FIRST_STEP: total entries ever — is this the very first?
          prisma.moodEntry.count({ where: { userId } }),

          // WEEK_ONE: current streak (same computation as milestone check above,
          // but we need the value here — Promise.all avoids a second DB call
          // by running in parallel with the other queries)
          calculateMoodStreak(userId),

          // RESILIENT: last 14 mood scores to detect burnout level change.
          // We use a raw number array (not the full record) for computeBurnoutLevel.
          getMoodScores(userId).then((rows) =>
            rows.slice(0, 14).map((r: any) => r.moodScore as number),
          ),

          // MINDFUL_MONTH: did the user log every day of the current calendar month?
          checkFullMonthMoodCoverage(userId),
        ]);

      // ── Burnout transition detection ──────────────────────────
      //
      // recentScoreRows[0] is the entry we JUST inserted (newest first).
      // prevScores = all entries EXCEPT the newest = the state before this entry.
      // currScores = all 14 entries including the newest = current state.
      //
      // If prevScores showed High burnout and currScores show Low burnout,
      // this entry tipped the user out of burnout → award RESILIENT badge.
      const prevScores = recentScoreRows.slice(1); // exclude newest
      const currScores = recentScoreRows; // include newest

      const prevRisk = computeBurnoutLevel(prevScores);
      const currRisk = computeBurnoutLevel(currScores);
      const burnoutDroppedToLow = prevRisk === "High" && currRisk === "Low";

      // ── Award badges ──────────────────────────────────────────
      await checkAndAwardMoodBadges(userId, {
        totalMoodCount,
        currentMoodStreak: streak.currentStreak,
        burnoutDroppedToLow,
        loggedEveryDayThisMonth: monthCoverage,
      });
    } catch {
      // Silent failure — badge check errors never surface to the caller
    }
  })();

  return mood;
};

// ─── GET SINGLE ───────────────────────────────────────────────────

/**
 * Fetch a single mood entry by id, hydrated with its journal text.
 *
 * If the entry has a journalId, the corresponding MongoDB document
 * is fetched and merged into the response — the caller gets a single
 * unified object instead of having to join two stores themselves.
 */
export const getMoodById = async (id: string, userId: string) => {
  const entry = await assertMoodOwnership(id, userId);

  let journal: { text: string; tags: string[] } | null = null;

  if (entry.journalId) {
    const doc = await JournalModel.findById(entry.journalId)
      .select("text tags")
      .lean();

    if (doc) {
      journal = { text: doc.text, tags: doc.tags };
    }
  }

  return { ...entry, journal };
};

// ─── UPDATE ───────────────────────────────────────────────────────

/**
 * Partially update a mood entry.
 *
 * Handles four cases for journalText:
 *   provided string + existing journal  → update the MongoDB doc
 *   provided string + no journal yet    → create a new MongoDB doc
 *   null + existing journal             → delete the MongoDB doc + clear journalId
 *   undefined                           → leave journal untouched
 */
export const updateMood = async (
  id: string,
  userId: string,
  input: UpdateMoodInput,
) => {
  const entry = await assertMoodOwnership(id, userId);

  const pgUpdate: {
    moodScore?: number;
    emoji?: string;
    journalId?: string | null;
  } = {};

  if (input.moodScore !== undefined) pgUpdate.moodScore = input.moodScore;
  if (input.emoji !== undefined) pgUpdate.emoji = input.emoji;

  // ── Journal text handling ──────────────────────────────────────
  if (input.journalText === null) {
    // Explicitly clearing the journal
    if (entry.journalId) {
      await JournalModel.findByIdAndDelete(entry.journalId);
    }
    pgUpdate.journalId = null;
  } else if (input.journalText !== undefined) {
    if (entry.journalId) {
      // Update the existing journal document
      await JournalModel.findByIdAndUpdate(entry.journalId, {
        text: input.journalText,
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
      });
    } else {
      // No journal existed — create one now
      const journal = await JournalModel.create({
        userId,
        moodEntryId: id,
        text: input.journalText,
        tags: input.tags ?? [],
      });
      pgUpdate.journalId = journal._id.toString();
    }
  } else if (input.tags !== undefined && entry.journalId) {
    // Tags changed but no text change — update tags on the existing journal
    await JournalModel.findByIdAndUpdate(entry.journalId, {
      tags: input.tags,
    });
  }

  // Only update Postgres if there are Postgres-level changes
  if (Object.keys(pgUpdate).length > 0) {
    return updateMoodEntryRecord(id, pgUpdate);
  }

  // Nothing changed at Postgres level — return the current entry
  return entry;
};

// ─── DELETE ───────────────────────────────────────────────────────

/**
 * Delete a mood entry and its linked journal.
 *
 * Deletes the MongoDB journal first (if one exists), then removes
 * the Postgres row. If the Mongo delete fails, we stop before
 * touching Postgres — leaving the data in a consistent state.
 */
export const deleteMood = async (id: string, userId: string) => {
  const entry = await assertMoodOwnership(id, userId);

  if (entry.journalId) {
    await JournalModel.findByIdAndDelete(entry.journalId);
  }

  await deleteMoodEntryRecord(id);

  return { message: "Mood entry deleted successfully" };
};

// ─── FETCH LIST ───────────────────────────────────────────────────

/**
 * Fetch paginated mood history with optional date range.
 * Adds pagination metadata to the response.
 */
export const fetchMoods = async (
  userId: string,
  page: number,
  limit: number,
  startDate?: string,
  endDate?: string,
) => {
  const { data, total } = await getUserMoods(
    userId,
    page,
    limit,
    startDate,
    endDate,
  );

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ─── ANALYTICS ────────────────────────────────────────────────────

/**
 * Mood analytics: summary statistics for a date range.
 * Uses lean getMoodScores() — fetches only moodScore + createdAt.
 */
export const calculateMoodAnalytics = async (
  userId: string,
  startDate?: string,
  endDate?: string,
) => {
  const moods = await getMoodScores(userId, startDate, endDate);

  if (moods.length === 0) {
    return {
      totalEntries: 0,
      averageMood: 0,
      highestMood: null,
      lowestMood: null,
      mostFrequentMood: null,
      distribution: {},
    };
  }

  const scores = moods.map((m) => m.moodScore);
  const totalEntries = scores.length;
  const sum = scores.reduce((acc, val) => acc + val, 0);

  const distribution: Record<number, number> = {};
  for (const score of scores) {
    distribution[score] = (distribution[score] ?? 0) + 1;
  }

  const mostFrequentMood = Number(
    Object.entries(distribution).reduce((prev, curr) =>
      curr[1] > prev[1] ? curr : prev,
    )[0],
  );

  return {
    totalEntries,
    averageMood: parseFloat((sum / totalEntries).toFixed(2)),
    highestMood: Math.max(...scores),
    lowestMood: Math.min(...scores),
    mostFrequentMood,
    distribution,
  };
};

/**
 * Weekly mood trends grouped by ISO 8601 week.
 * Returns weeks in chronological order, zero-padded for correct string sort.
 */
export const calculateWeeklyTrend = async (
  userId: string,
  startDate?: string,
  endDate?: string,
) => {
  const moods = await getMoodScores(userId, startDate, endDate);

  const weeklyMap = new Map<string, { total: number; count: number }>();

  for (const mood of moods) {
    const { year, week } = getISOWeek(new Date(mood.createdAt));
    const weekKey = `${year}-W${String(week).padStart(2, "0")}`;
    const existing = weeklyMap.get(weekKey) ?? { total: 0, count: 0 };
    weeklyMap.set(weekKey, {
      total: existing.total + mood.moodScore,
      count: existing.count + 1,
    });
  }

  const weeklyTrends = Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, { total, count }]) => ({
      week,
      averageMood: parseFloat((total / count).toFixed(2)),
      entries: count,
    }));

  return { weeklyTrends };
};

/**
 * Rolling 7-day average mood.
 *
 * Groups multiple same-day entries into a daily average first,
 * then applies a 7-day sliding window ending on each calendar date.
 */
export const calculateRollingAverage = async (
  userId: string,
  startDate?: string,
  endDate?: string,
) => {
  const moods = await getMoodScores(userId, startDate, endDate);

  if (moods.length === 0) return { rollingAverage: [] };

  // Step 1: group by calendar date
  const dailyMap = new Map<string, number[]>();
  for (const mood of moods) {
    const dateStr = toDateString(new Date(mood.createdAt));
    const existing = dailyMap.get(dateStr) ?? [];
    existing.push(mood.moodScore);
    dailyMap.set(dateStr, existing);
  }

  const sortedDates = Array.from(dailyMap.keys()).sort();

  // Step 2: for each date, average the 7-day window ending on that date
  const rollingAverage = sortedDates.map((dateStr) => {
    const currentDate = new Date(dateStr);
    const windowStart = new Date(currentDate);
    windowStart.setDate(windowStart.getDate() - 6);

    const windowScores: number[] = [];
    for (const [d, scores] of dailyMap.entries()) {
      const day = new Date(d);
      if (day >= windowStart && day <= currentDate) {
        windowScores.push(...scores);
      }
    }

    const avg = windowScores.reduce((a, b) => a + b, 0) / windowScores.length;
    return { date: dateStr, averageMood: parseFloat(avg.toFixed(2)) };
  });

  return { rollingAverage };
};

/**
 * Burnout risk score.
 *
 * Combines three signals:
 *   lowMoodDays  (score ≤ 2) × 2
 *   moodDeficit  (how far avg falls below 3.0) × 3   [clamped ≥ 0]
 *   volatility   (score range) × 1.5
 *
 * Risk levels: 0–5 Low | 5–10 Moderate | 10+ High
 * Minimum 3 entries required for a meaningful result.
 */
export const calculateBurnoutRisk = async (
  userId: string,
  startDate?: string,
  endDate?: string,
) => {
  const moods = await getMoodScores(userId, startDate, endDate);

  if (moods.length < 3) {
    return {
      riskScore: 0,
      riskLevel: "Insufficient Data",
      message: "At least 3 mood entries are needed to calculate burnout risk.",
      metrics: null,
    };
  }

  const scores = moods.map((m) => m.moodScore);
  const totalEntries = scores.length;
  const averageMood = scores.reduce((a, b) => a + b, 0) / totalEntries;
  const lowMoodDays = scores.filter((s) => s <= 2).length;
  const highest = Math.max(...scores);
  const lowest = Math.min(...scores);
  const volatility = highest - lowest;
  const moodDeficit = Math.max(0, 3.0 - averageMood);
  const riskScore = lowMoodDays * 2 + moodDeficit * 3 + volatility * 1.5;

  let riskLevel: "Low" | "Moderate" | "High";
  if (riskScore > 10) riskLevel = "High";
  else if (riskScore >= 5) riskLevel = "Moderate";
  else riskLevel = "Low";

  return {
    riskScore: parseFloat(riskScore.toFixed(2)),
    riskLevel,
    metrics: {
      totalEntries,
      averageMood: parseFloat(averageMood.toFixed(2)),
      lowMoodDays,
      volatility,
    },
  };
};

// ─── STREAK ───────────────────────────────────────────────────────

/**
 * Calculate the user's current mood logging streak.
 *
 * A streak = the number of consecutive calendar days ending today (or yesterday)
 * on which the user logged at least one mood entry.
 *
 * Why "or yesterday"?
 * If it's 7am and you haven't logged today yet, you shouldn't see your
 * 30-day streak drop to 0. The streak stays alive through end-of-today.
 *
 * Algorithm:
 * 1. Deduplicate all log timestamps to unique calendar dates (DESC)
 * 2. Starting from today (or yesterday if today has no entry), walk backwards
 * 3. Count consecutive days — stop at the first gap
 */
export const calculateMoodStreak = async (userId: string) => {
  const rows = await getMoodLogDates(userId);

  if (rows.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastLoggedDate: null };
  }

  // Deduplicate to unique YYYY-MM-DD strings, sorted DESC
  const uniqueDates = [
    ...new Set(rows.map((r) => toDateString(new Date(r.createdAt)))),
  ].sort((a, b) => b.localeCompare(a));

  const todayStr = toDateString(new Date());

  // Determine the starting anchor: today if logged today, else yesterday
  let anchor = new Date();
  if (uniqueDates[0] !== todayStr) {
    anchor.setDate(anchor.getDate() - 1);
  }
  let anchorStr = toDateString(anchor);

  // If the most recent log is older than yesterday — streak is broken
  if (uniqueDates[0] < anchorStr) {
    // Still calculate longestStreak below for the full response
  }

  // Walk backwards counting the current streak
  let currentStreak = 0;
  let cursor = new Date(anchor);

  for (const dateStr of uniqueDates) {
    const cursorStr = toDateString(cursor);
    if (dateStr === cursorStr) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (dateStr < cursorStr) {
      // Skipped a day — streak is broken
      break;
    }
    // dateStr > cursorStr means a future date slipped in — skip it
  }

  // If anchor was yesterday but the most recent log is older → streak = 0
  if (
    uniqueDates[0] <
    toDateString(new Date(new Date().setDate(new Date().getDate() - 1)))
  ) {
    currentStreak = 0;
  }

  // ── Longest streak (full history scan) ────────────────────────
  const ascDates = [...uniqueDates].sort();
  let longestStreak = 0;
  let runLength = 1;

  for (let i = 1; i < ascDates.length; i++) {
    const prev = new Date(ascDates[i - 1]);
    const curr = new Date(ascDates[i]);
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 1) {
      runLength++;
      longestStreak = Math.max(longestStreak, runLength);
    } else {
      runLength = 1;
    }
  }
  longestStreak = Math.max(longestStreak, ascDates.length === 1 ? 1 : 0);
  if (currentStreak > 0 && longestStreak < currentStreak) {
    longestStreak = currentStreak;
  }

  return {
    currentStreak,
    longestStreak,
    lastLoggedDate: uniqueDates[0],
  };
};

// ─── HEATMAP ──────────────────────────────────────────────────────

/**
 * Generate GitHub-style mood heatmap data.
 *
 * Returns one entry per calendar day for the requested window.
 * If multiple entries exist on one day, the average score is used.
 *
 * `averageScore` field: 0 = no entry, 1–5 = average mood that day.
 * Frontend maps 0 → grey, 1–5 → colour intensity (green scale or custom).
 *
 * Max 730 days (2 years). Defaults to 365.
 */
export const generateMoodHeatmap = async (userId: string, days: number) => {
  const to = new Date();
  to.setHours(23, 59, 59, 999);

  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  const entries = await getMoodScoresInRange(userId, from, to);

  // Group by date → collect all scores
  const scoresByDate = new Map<string, number[]>();
  for (const entry of entries) {
    const dateStr = toDateString(new Date(entry.createdAt));
    const existing = scoresByDate.get(dateStr) ?? [];
    existing.push(entry.moodScore);
    scoresByDate.set(dateStr, existing);
  }

  // Build full calendar grid — every day in range, no gaps
  const heatmap: { date: string; averageScore: number; count: number }[] = [];
  const cursor = new Date(from);

  while (cursor <= to) {
    const dateStr = toDateString(cursor);
    const scores = scoresByDate.get(dateStr);

    if (scores && scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      heatmap.push({
        date: dateStr,
        averageScore: parseFloat(avg.toFixed(1)),
        count: scores.length,
      });
    } else {
      heatmap.push({ date: dateStr, averageScore: 0, count: 0 });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return { heatmap, totalDays: days, loggedDays: scoresByDate.size };
};

// ─── MONTHLY SUMMARY ──────────────────────────────────────────────

/**
 * Monthly calendar summary — one entry per day of the month.
 *
 * Returns:
 *   calendar: per-day array with average mood and entry count
 *   summary: aggregated stats for the month (avg, best day, worst day)
 *
 * Used by frontend calendar UI to render a month view with mood colours.
 * Default: current month.
 */
export const getMoodMonthlySummary = async (
  userId: string,
  month: string, // "YYYY-MM"
) => {
  const [year, mon] = month.split("-").map(Number);
  const from = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, mon, 0, 23, 59, 59, 999)); // last day of month

  const entries = await getMoodEntriesForMonth(userId, from, to);

  // Group by day-of-month
  const byDay = new Map<number, number[]>();
  for (const entry of entries) {
    const day = new Date(entry.createdAt).getUTCDate();
    const existing = byDay.get(day) ?? [];
    existing.push(entry.moodScore);
    byDay.set(day, existing);
  }

  const daysInMonth = to.getUTCDate();
  const calendar: {
    date: string;
    day: number;
    averageScore: number | null;
    count: number;
  }[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const scores = byDay.get(d);
    const dateStr = `${month}-${String(d).padStart(2, "0")}`;

    if (scores && scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      calendar.push({
        date: dateStr,
        day: d,
        averageScore: parseFloat(avg.toFixed(2)),
        count: scores.length,
      });
    } else {
      calendar.push({ date: dateStr, day: d, averageScore: null, count: 0 });
    }
  }

  // Month-level summary stats
  const loggedDays = calendar.filter((d) => d.averageScore !== null);
  const allScores = entries.map((e) => e.moodScore);

  if (allScores.length === 0) {
    return {
      month,
      totalEntries: 0,
      loggedDays: 0,
      averageMood: null,
      bestDay: null,
      worstDay: null,
      calendar,
    };
  }

  const avgMood = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const bestDay = loggedDays.reduce((best, curr) =>
    (curr.averageScore ?? 0) > (best.averageScore ?? 0) ? curr : best,
  );
  const worstDay = loggedDays.reduce((worst, curr) =>
    (curr.averageScore ?? 5) < (worst.averageScore ?? 5) ? curr : worst,
  );

  return {
    month,
    totalEntries: allScores.length,
    loggedDays: loggedDays.length,
    averageMood: parseFloat(avgMood.toFixed(2)),
    bestDay: { date: bestDay.date, averageScore: bestDay.averageScore },
    worstDay: { date: worstDay.date, averageScore: worstDay.averageScore },
    calendar,
  };
};

// ─── DAILY INSIGHTS (Day-of-week + Time-of-day patterns) ──────────

/**
 * Behavioural pattern insights — when do you feel best and worst?
 *
 * Analyses mood scores across two dimensions:
 *
 * 1. Day-of-week pattern
 *    → Which weekday has your highest / lowest average mood?
 *    → Which day do you log most consistently?
 *    → Useful: "Your Mondays average 2.1 — significantly below your 3.8 mean"
 *
 * 2. Time-of-day pattern
 *    → Buckets: Morning / Afternoon / Evening / Night
 *    → Which time bucket has your highest average mood?
 *    → Useful: "You log best moods in the morning (avg 4.2 vs 2.9 at night)"
 *
 * Defaults to the last 90 days for enough statistical signal.
 * Returns null on insufficient data (< 5 entries).
 */
export const getMoodDailyInsights = async (
  userId: string,
  startDate?: string,
  endDate?: string,
) => {
  const moods = await getMoodScoresWithTimestamp(userId, startDate, endDate);

  if (moods.length < 5) {
    return {
      message: "At least 5 mood entries are needed for pattern analysis.",
      dayOfWeekPattern: null,
      timeOfDayPattern: null,
    };
  }

  // ── Day-of-week analysis ───────────────────────────────────────
  const dayMap = new Map<number, number[]>(); // 0=Sun … 6=Sat
  for (const mood of moods) {
    const dow = new Date(mood.createdAt).getUTCDay();
    const existing = dayMap.get(dow) ?? [];
    existing.push(mood.moodScore);
    dayMap.set(dow, existing);
  }

  const dayOfWeekPattern = Array.from(dayMap.entries())
    .map(([dow, scores]) => ({
      day: DAY_NAMES[dow],
      averageMood: parseFloat(
        (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
      ),
      entries: scores.length,
    }))
    .sort((a, b) => {
      // Sort by day order Sun=0 … Sat=6 for a natural week display
      return DAY_NAMES.indexOf(a.day) - DAY_NAMES.indexOf(b.day);
    });

  const bestDay = [...dayOfWeekPattern].sort(
    (a, b) => b.averageMood - a.averageMood,
  )[0];
  const worstDay = [...dayOfWeekPattern].sort(
    (a, b) => a.averageMood - b.averageMood,
  )[0];
  const mostActiveDay = [...dayOfWeekPattern].sort(
    (a, b) => b.entries - a.entries,
  )[0];

  // ── Time-of-day analysis ───────────────────────────────────────
  const timeMap = new Map<string, number[]>();
  for (const mood of moods) {
    const hour = new Date(mood.createdAt).getUTCHours();
    const bucket = getTimeBucket(hour);
    const existing = timeMap.get(bucket) ?? [];
    existing.push(mood.moodScore);
    timeMap.set(bucket, existing);
  }

  const timeOfDayPattern = Array.from(timeMap.entries())
    .map(([bucket, scores]) => ({
      timeOfDay: bucket,
      averageMood: parseFloat(
        (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
      ),
      entries: scores.length,
    }))
    .sort((a, b) => b.averageMood - a.averageMood);

  const bestTime = timeOfDayPattern[0];
  const mostActiveTime = [...timeOfDayPattern].sort(
    (a, b) => b.entries - a.entries,
  )[0];

  return {
    analyzedEntries: moods.length,
    dayOfWeekPattern: {
      data: dayOfWeekPattern,
      bestDay: bestDay.day,
      worstDay: worstDay.day,
      mostActiveDay: mostActiveDay.day,
      insight: `Your ${bestDay.day}s average ${bestDay.averageMood} — your best day of the week.`,
    },
    timeOfDayPattern: {
      data: timeOfDayPattern,
      bestTime: bestTime.timeOfDay,
      mostActiveTime: mostActiveTime.timeOfDay,
      insight: `You feel best during ${bestTime.timeOfDay} (avg ${bestTime.averageMood}).`,
    },
  };
};

/**
 * Predict mood scores for the next N days (max 14).
 *
 * Formula (per README spec):
 *   predictedScore = baseline + dayOfWeekAdjustment + trendSlope
 *
 *   baseline          = 30-day rolling average mood
 *   dayOfWeekAdjustment = (avg mood on that weekday) - baseline
 *                         (positive = that weekday tends to be better than average)
 *   trendSlope        = linear regression slope over the last 14 days,
 *                       scaled by days-ahead to project the trend forward
 *                       (clamped so it can't dominate the forecast)
 *
 * Final score is clamped to [1, 5] — mood scale boundaries.
 *
 * Minimum data requirement: 7 entries (matches AI insights gate from README).
 */
export const getMoodForecast = async (userId: string, days: number) => {
  // ── Fetch data for both signals in parallel ────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const [allScoreRows, recentScoreRows] = await Promise.all([
    // Last 90 days for day-of-week pattern (more signal, more reliable)
    getMoodScoresWithTimestamp(userId),
    // Last 30 days for baseline + trend
    getMoodScores(userId, thirtyDaysAgoStr),
  ]);

  // ── Minimum data guard ─────────────────────────────────────────
  if (recentScoreRows.length < 7) {
    return {
      forecast: [],
      insufficientData: true,
      message:
        "At least 7 mood entries in the last 30 days are needed to generate a forecast.",
    };
  }

  // ── Signal 1: Baseline (30-day simple average) ─────────────────
  const baseline =
    recentScoreRows.reduce((sum, r) => sum + r.moodScore, 0) /
    recentScoreRows.length;

  // ── Signal 2: Day-of-week adjustment ──────────────────────────
  // Average mood per weekday (0=Sun … 6=Sat) over the last 90 days
  const dayTotals: Record<number, { sum: number; count: number }> = {};
  for (const row of allScoreRows) {
    const dow = new Date(row.createdAt).getUTCDay();
    if (!dayTotals[dow]) dayTotals[dow] = { sum: 0, count: 0 };
    dayTotals[dow].sum += row.moodScore;
    dayTotals[dow].count += 1;
  }

  // adjustment = (weekday avg) - baseline
  // Positive → that weekday is historically better than average
  // If we have no data for a weekday, adjustment defaults to 0
  const dayAdjustment: Record<number, number> = {};
  for (let dow = 0; dow <= 6; dow++) {
    if (dayTotals[dow] && dayTotals[dow].count > 0) {
      const dayAvg = dayTotals[dow].sum / dayTotals[dow].count;
      dayAdjustment[dow] = dayAvg - baseline;
    } else {
      dayAdjustment[dow] = 0;
    }
  }

  // ── Signal 3: Recent trend slope (linear regression, last 14 days) ──
  // Group into daily averages first (same day can have multiple entries)
  const dailyAvgMap = new Map<string, { sum: number; count: number }>();
  for (const row of recentScoreRows) {
    const dateStr = row.createdAt.toISOString().split("T")[0];
    if (!dailyAvgMap.has(dateStr))
      dailyAvgMap.set(dateStr, { sum: 0, count: 0 });
    const entry = dailyAvgMap.get(dateStr)!;
    entry.sum += row.moodScore;
    entry.count += 1;
  }

  const sortedDailyEntries = Array.from(dailyAvgMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14) // only last 14 days for trend
    .map(([date, { sum, count }], idx) => ({
      x: idx, // x = day index (0, 1, 2 …)
      y: sum / count, // y = daily avg mood
    }));

  // Simple linear regression: slope = (n·Σxy - Σx·Σy) / (n·Σx² - (Σx)²)
  let slope = 0;
  if (sortedDailyEntries.length >= 3) {
    const n = sortedDailyEntries.length;
    const sumX = sortedDailyEntries.reduce((s, p) => s + p.x, 0);
    const sumY = sortedDailyEntries.reduce((s, p) => s + p.y, 0);
    const sumXY = sortedDailyEntries.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = sortedDailyEntries.reduce((s, p) => s + p.x * p.x, 0);
    const denom = n * sumX2 - sumX * sumX;
    slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;

    // Clamp slope: don't let trend overwhelm baseline + day-of-week signal.
    // Max trend contribution = ±0.15 per day ahead.
    // Without this, a bad week could forecast score 0 by day 7.
    slope = Math.max(-0.15, Math.min(0.15, slope));
  }

  // ── Build forecast array ───────────────────────────────────────
  const FORECAST_DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const MOOD_LABELS: Record<number, string> = {
    1: "Very Low",
    2: "Low",
    3: "Moderate",
    4: "Good",
    5: "Excellent",
  };

  const getMoodLabel = (score: number): string => {
    const rounded = Math.round(score);
    return MOOD_LABELS[Math.max(1, Math.min(5, rounded))] ?? "Moderate";
  };

  const forecast: {
    date: string;
    dayOfWeek: string;
    predictedScore: number;
    label: string;
    signals: {
      baseline: number;
      dayOfWeekAdjustment: number;
      trendContribution: number;
    };
  }[] = [];

  const today = new Date();

  for (let i = 1; i <= days; i++) {
    const forecastDate = new Date(today);
    forecastDate.setUTCDate(today.getUTCDate() + i);
    forecastDate.setUTCHours(0, 0, 0, 0);

    const dateStr = forecastDate.toISOString().split("T")[0];
    const dow = forecastDate.getUTCDay();
    const adjustment = dayAdjustment[dow] ?? 0;

    // Trend scales with how far ahead we're projecting.
    // Day 1 forecast uses 1 × slope, day 7 uses 7 × slope.
    const trendContribution = parseFloat((slope * i).toFixed(2));

    const rawScore = baseline + adjustment + trendContribution;

    // Hard clamp to [1.0, 5.0] — mood scale is bounded
    const predictedScore = parseFloat(
      Math.max(1.0, Math.min(5.0, rawScore)).toFixed(2),
    );

    forecast.push({
      date: dateStr,
      dayOfWeek: FORECAST_DAY_NAMES[dow],
      predictedScore,
      label: getMoodLabel(predictedScore),
      signals: {
        baseline: parseFloat(baseline.toFixed(2)),
        dayOfWeekAdjustment: parseFloat(adjustment.toFixed(2)),
        trendContribution,
      },
    });
  }

  return {
    forecast,
    insufficientData: false,
    basedOn: {
      baselineDays: 30,
      baselineAvg: parseFloat(baseline.toFixed(2)),
      trendSlopePerDay: parseFloat(slope.toFixed(3)),
      entriesAnalyzed: recentScoreRows.length,
    },
    message: `Forecast generated using your 30-day baseline, day-of-week patterns, and recent trend.`,
  };
};

