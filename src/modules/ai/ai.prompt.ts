// src/modules/ai/ai.prompt.ts
//
// ─────────────────────────────────────────────────────────────────
// PROMPT ENGINEERING — the most important file in the AI module.
//
// This file is responsible for:
//   1. Pre-processing raw DB data into a clean summary for the AI
//   2. Building the system prompt (tells AI its role and output format)
//   3. Building the user prompt (contains the actual behavioral data)
//
// Why a separate prompt file?
// Prompt logic is complex and frequently tweaked. Keeping it isolated
// means you can improve prompts without touching service logic.
//
// DESIGN PRINCIPLE:
// We do NOT send raw DB rows to OpenAI. We pre-process the data into
// a compact, structured summary. This reduces token usage (cost) and
// makes the AI's job easier (better output quality).
// ─────────────────────────────────────────────────────────────────

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────

// Shape of one mood entry from the DB (after select)
export type RawMoodEntry = {
  moodScore: number;
  createdAt: Date;
};

// Shape of one habit with its logs (after select + include)
export type RawHabitWithLogs = {
  id: string;
  title: string;
  frequency: string;
  category: string | null;
  targetPerWeek: number | null;
  logs: { date: Date }[];
};

// The processed summary we pass to OpenAI
// This is a compact, human-readable representation of the user's data
export type BehavioralSummary = {
  moodSummary: {
    totalEntries: number;
    averageMood: number;
    weeklyAverages: { week: string; avg: number; entries: number }[];
    lowMoodWeeks: string[]; // weeks where avg < 3.0
  };
  habitSummaries: {
    title: string;
    category: string;
    frequency: string;
    targetPerWeek: number | null;
    totalCompletions: number;
    completionRate: number; // 0–100%
    weeklyCompletions: { week: string; count: number }[]; // completions per ISO week
    missedWeeksCount: number; // weeks with 0 completions
  }[];
};

// ─── DATA PROCESSING ──────────────────────────────────────────────

/**
 * Convert raw DB rows into a structured BehavioralSummary.
 *
 * This is the critical pre-processing step.
 *
 * What we calculate here:
 * - Weekly average mood scores (group mood entries by ISO week)
 * - Which weeks had low mood (avg < 3.0)
 * - Per-habit completion rates
 * - Per-habit completions broken down by ISO week
 * - Missed weeks (0 completions in that week)
 *
 * Having weekly breakdowns for BOTH mood and habits is what enables
 * correlation analysis — the AI can see "week 2026-W05: mood=2.1,
 * meditation completions=0" and infer a connection.
 */
export const buildBehavioralSummary = (
  moods: RawMoodEntry[],
  habits: RawHabitWithLogs[],
  days: number,
): BehavioralSummary => {
  // ── Step 1: Group mood entries by ISO week ────────────────────
  // ISO week key: "YYYY-WXX" (e.g. "2026-W07")
  const moodByWeek: Record<string, number[]> = {};

  for (const mood of moods) {
    const weekKey = getISOWeekKey(new Date(mood.createdAt));
    if (!moodByWeek[weekKey]) moodByWeek[weekKey] = [];
    moodByWeek[weekKey].push(mood.moodScore);
  }

  // Calculate weekly mood averages
  const weeklyAverages = Object.entries(moodByWeek)
    .sort(([a], [b]) => a.localeCompare(b)) // sort chronologically
    .map(([week, scores]) => ({
      week,
      avg: parseFloat(
        (scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(2),
      ),
      entries: scores.length,
    }));

  // Identify weeks with low mood (average below 3.0 = "bad week")
  const lowMoodWeeks = weeklyAverages
    .filter((w) => w.avg < 3.0)
    .map((w) => w.week);

  const totalEntries = moods.length;
  const averageMood =
    totalEntries > 0
      ? parseFloat(
          (moods.reduce((s, m) => s + m.moodScore, 0) / totalEntries).toFixed(
            2,
          ),
        )
      : 0;

  // ── Step 2: Process each habit ────────────────────────────────
  const habitSummaries = habits.map((habit) => {
    const totalCompletions = habit.logs.length;

    // Calculate total possible completions in the window
    // Daily: each day is a period. Weekly: each week is a period.
    const totalPossible =
      habit.frequency === "daily" ? days : Math.ceil(days / 7);

    const completionRate =
      totalPossible > 0
        ? parseFloat(((totalCompletions / totalPossible) * 100).toFixed(1))
        : 0;

    // Group completions by ISO week
    const completionsByWeek: Record<string, number> = {};
    for (const log of habit.logs) {
      const weekKey = getISOWeekKey(new Date(log.date));
      completionsByWeek[weekKey] = (completionsByWeek[weekKey] || 0) + 1;
    }

    const weeklyCompletions = Object.entries(completionsByWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ week, count }));

    // Count weeks in the window that had ZERO completions
    // This is a key signal — "you skipped this habit for entire weeks"
    const weeksInWindow = Math.ceil(days / 7);
    const activeWeeks = Object.keys(completionsByWeek).length;
    const missedWeeksCount = Math.max(0, weeksInWindow - activeWeeks);

    return {
      title: habit.title,
      category: habit.category ?? "custom",
      frequency: habit.frequency,
      targetPerWeek: habit.targetPerWeek,
      totalCompletions,
      completionRate,
      weeklyCompletions,
      missedWeeksCount,
    };
  });

  return {
    moodSummary: {
      totalEntries,
      averageMood,
      weeklyAverages,
      lowMoodWeeks,
    },
    habitSummaries,
  };
};

// ─── PROMPT BUILDERS ──────────────────────────────────────────────

/**
 * The SYSTEM PROMPT — tells OpenAI who it is and what to produce.
 *
 * Key design decisions:
 * 1. JSON-only output — we parse the response programmatically.
 *    Any conversational text would break JSON.parse().
 * 2. Strict output schema — we tell the AI exactly what fields
 *    to produce so our TypeScript types always match.
 * 3. Severity levels — lets the frontend color-code insights
 *    (red=warning, yellow=info, green=positive).
 * 4. Example insights — shows the AI the quality and style we want.
 *    LLMs follow examples better than abstract instructions.
 * 5. "Cross-correlate" instruction — this is the key behavior.
 *    We explicitly tell the AI to look for mood-habit relationships.
 */
export const buildSystemPrompt = (): string => {
  return `You are a behavioral analytics AI for PulseBloom, a personal well-being app.

Your job is to analyze a user's mood scores and habit completion data over the past 90 days, then generate 3 to 6 personalized behavioral insights.

CRITICAL RULES:
- Respond ONLY with a valid JSON array. No preamble, no explanation, no markdown.
- Each element in the array must have exactly these fields:
  {
    "type": string,         // one of: "correlation", "streak", "warning", "positive", "suggestion"
    "title": string,        // short headline, max 10 words
    "description": string,  // 1–2 sentences, specific and data-driven
    "severity": string      // one of: "info", "warning", "success"
  }

INSIGHT TYPES:
- "correlation" : A relationship between mood and a specific habit (this is the most valuable type)
- "streak"      : A notable streak pattern (current or broken)
- "warning"     : A concerning pattern that needs attention (use sparingly)
- "positive"    : A genuinely strong behavioral pattern worth celebrating
- "suggestion"  : An actionable recommendation based on the data

QUALITY RULES:
- Always cross-correlate mood weekly averages with habit weekly completion counts
- If a habit had 0 completions in weeks where mood was < 3.0, call this out specifically
- Reference actual numbers from the data (e.g. "your mood averaged 2.3 in weeks you skipped meditation")
- Be specific about habit names — never say "your habit", always use the habit's title
- Do NOT generate insights if there is not enough data to support them
- Insights should be actionable and empathetic, never judgmental

EXAMPLE of a good correlation insight:
{
  "type": "correlation",
  "title": "Meditation skips align with your lowest mood weeks",
  "description": "In the 3 weeks where your mood averaged below 3.0, you completed Morning Meditation 0 times. In weeks you did complete it, your average mood was 4.1.",
  "severity": "warning"
}`;
};

/**
 * The USER PROMPT — contains the actual behavioral data.
 *
 * We serialize the BehavioralSummary as formatted JSON inside the prompt.
 * The AI treats this as structured input to analyze.
 *
 * Why JSON.stringify with indent?
 * Readable formatting helps the AI "see" the structure clearly.
 * Token cost is slightly higher but output quality is significantly better.
 */
export const buildUserPrompt = (
  summary: BehavioralSummary,
  days: number,
): string => {
  return `Analyze this user's behavioral data from the past ${days} days and generate insights.

MOOD DATA:
${JSON.stringify(summary.moodSummary, null, 2)}

HABIT DATA:
${JSON.stringify(summary.habitSummaries, null, 2)}

Remember:
- Cross-reference low mood weeks (${summary.moodSummary.lowMoodWeeks.join(", ") || "none"}) with habit completion data
- Generate 3–6 insights as a JSON array only`;
};

// ─── HELPERS ──────────────────────────────────────────────────────

/**
 * Convert a Date to an ISO week key string: "YYYY-WXX"
 *
 * Why not use a library?
 * We want zero extra dependencies in this module.
 * The algorithm is standard ISO 8601 week numbering.
 *
 * ISO week rules:
 * - Week starts on Monday
 * - Week 1 is the week containing the first Thursday of the year
 */
const getISOWeekKey = (date: Date): string => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Set to nearest Thursday (ISO week anchor day)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};
