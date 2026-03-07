// src/modules/ai/suggestions.service.ts
//
// ─────────────────────────────────────────────────────────────────
// SMART HABIT SUGGESTIONS SERVICE
//
// Generates 3 personalized habit suggestions by feeding the user's:
//   - Daily mood insights (best/worst day, best time of day, avg mood)
//   - Current active habits + their completion rates
//   - Current burnout risk level
// into a Groq prompt.
//
// CACHING STRATEGY:
//   Reuses the existing AiInsight PostgreSQL table — the same table
//   used by ai.service.ts for behavioral insights.
//   The `type` discriminator ("suggestions" vs "insights") keeps them
//   separate in the same table without schema changes.
//
//   Cache key: SHA-256 hash of the input context data.
//   If habits, mood, and burnout haven't changed → serve cache.
//   If anything changed → call Groq, update cache.
//
// PLAN GATE:
//   Gated behind Pro/Enterprise via checkPlanLimit("ai_insights")
//   in the route definition — the service itself has no plan awareness.
// ─────────────────────────────────────────────────────────────────

import crypto from "crypto";
import Groq from "groq-sdk";
import { prisma } from "../../config/db";
import {
  buildSuggestionsSystemPrompt,
  buildSuggestionsUserPrompt,
  SuggestionContext,
  CurrentHabitSummary,
} from "./suggestions.prompt";
import {
  getRecentMoodsForAi,
  getHabitsWithRecentLogsForAi,
} from "./ai.repository";

// ─── GROQ CLIENT ──────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── TYPES ────────────────────────────────────────────────────────

export type HabitSuggestion = {
  title: string;
  frequency: "daily" | "weekly";
  category: string;
  rationale: string;
  expectedMoodImpact: string;
};

// ─── MAIN SERVICE FUNCTION ────────────────────────────────────────

/**
 * Generate (or retrieve from cache) 3 personalized habit suggestions.
 *
 * @param userId       - Authenticated user's ID
 * @param forceRefresh - If true, bypass cache and call Groq fresh
 */
export const getHabitSuggestions = async (
  userId: string,
  forceRefresh: boolean = false,
) => {
  const DAYS = 90;

  // ── Step 1: Gather context data ────────────────────────────────
  const [moods, habits] = await Promise.all([
    getRecentMoodsForAi(userId, DAYS),
    getHabitsWithRecentLogsForAi(userId, DAYS),
  ]);

  // ── Step 2: Guard — not enough data ───────────────────────────
  if (moods.length < 5 && habits.length === 0) {
    return {
      suggestions: [],
      cached: false,
      generatedAt: null,
      message:
        "Keep logging your mood and habits for a few more days to unlock personalized suggestions.",
    };
  }

  // ── Step 3: Build suggestion context ──────────────────────────
  const context = buildSuggestionContext(moods, habits, DAYS);

  // ── Step 4: Compute cache hash ─────────────────────────────────
  // Hash the context (not raw rows) — smaller payload, same sensitivity.
  const dataHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(context))
    .digest("hex");

  // ── Step 5: Check cache ────────────────────────────────────────
  if (!forceRefresh) {
    const cached = await prisma.aiInsight.findFirst({
      where: { userId, type: "suggestions" } as any,
    });

    if (cached && (cached as any).dataHash === dataHash) {
      return {
        suggestions: (cached as any).insights as HabitSuggestion[],
        cached: true,
        generatedAt: (cached as any).generatedAt,
        message: "Suggestions served from cache",
      };
    }
  }

  // ── Step 6: Build prompts ──────────────────────────────────────
  const systemPrompt = buildSuggestionsSystemPrompt();
  const userPrompt = buildSuggestionsUserPrompt(context);

  // ── Step 7: Call Groq ──────────────────────────────────────────
  // temperature: 0.5 — slightly higher than insights (0.3) because we WANT
  //   some creative variety in suggestions across different users.
  // max_tokens: 600 — 3 suggestions × ~150 tokens each + buffer.
  let rawResponse: string;
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    rawResponse = completion.choices[0]?.message?.content ?? "";
  } catch (error: any) {
    throw new Error(`Groq API call failed: ${error.message}`);
  }

  // ── Step 8: Parse + validate ───────────────────────────────────
  const suggestions = parseSuggestionsResponse(rawResponse);

  // ── Step 9: Cache with type discriminator ──────────────────────
  // We upsert using a compound key workaround: delete old then create new.
  // (Prisma's upsert requires a unique field — AiInsight.@@unique is on userId only,
  //  which is used by the main insights. We use findFirst + delete/create for suggestions.)
  await prisma.$transaction(async (tx) => {
    await tx.aiInsight.deleteMany({
      where: { userId, type: "suggestions" } as any,
    });
    await tx.aiInsight.create({
      data: {
        userId,
        insights: suggestions as any,
        dataHash,
        generatedAt: new Date(),
        type: "suggestions",
      } as any,
    });
  });

  return {
    suggestions,
    cached: false,
    generatedAt: new Date(),
    message: `Generated ${suggestions.length} personalized habit suggestions`,
  };
};

// ─── HELPERS ──────────────────────────────────────────────────────

/**
 * Build the SuggestionContext from raw DB data.
 * Extracts the signals the prompt needs without sending raw rows.
 */
const buildSuggestionContext = (
  moods: { moodScore: number; createdAt: Date }[],
  habits: {
    title: string;
    category: string | null;
    frequency: string;
    logs: { date: Date }[];
  }[],
  days: number,
): SuggestionContext => {
  // ── Burnout risk (recomputed locally, no extra DB call) ────────
  const burnoutRiskLevel = computeLocalBurnoutLevel(moods);

  // ── Average mood ───────────────────────────────────────────────
  const averageMood =
    moods.length > 0
      ? parseFloat(
          (moods.reduce((s, m) => s + m.moodScore, 0) / moods.length).toFixed(
            2,
          ),
        )
      : null;

  // ── Day-of-week pattern ────────────────────────────────────────
  const DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayBuckets: Record<number, number[]> = {};
  for (const mood of moods) {
    const day = new Date(mood.createdAt).getUTCDay();
    if (!dayBuckets[day]) dayBuckets[day] = [];
    dayBuckets[day].push(mood.moodScore);
  }

  let bestDayOfWeek: string | null = null;
  let worstDayOfWeek: string | null = null;
  let bestDayAvg = -Infinity;
  let worstDayAvg = Infinity;

  for (const [dayNum, scores] of Object.entries(dayBuckets)) {
    if (scores.length < 2) continue; // need at least 2 data points
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    if (avg > bestDayAvg) {
      bestDayAvg = avg;
      bestDayOfWeek = DAY_NAMES[Number(dayNum)];
    }
    if (avg < worstDayAvg) {
      worstDayAvg = avg;
      worstDayOfWeek = DAY_NAMES[Number(dayNum)];
    }
  }

  // ── Time-of-day pattern ────────────────────────────────────────
  const timeBuckets: Record<string, number[]> = {};
  const getTimeBucket = (hour: number): string => {
    if (hour >= 5 && hour < 12) return "Morning (5am–12pm)";
    if (hour >= 12 && hour < 17) return "Afternoon (12pm–5pm)";
    if (hour >= 17 && hour < 21) return "Evening (5pm–9pm)";
    return "Night (9pm–5am)";
  };
  for (const mood of moods) {
    const bucket = getTimeBucket(new Date(mood.createdAt).getUTCHours());
    if (!timeBuckets[bucket]) timeBuckets[bucket] = [];
    timeBuckets[bucket].push(mood.moodScore);
  }

  let bestTimeOfDay: string | null = null;
  let bestTimeAvg = -Infinity;
  for (const [bucket, scores] of Object.entries(timeBuckets)) {
    if (scores.length < 2) continue;
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    if (avg > bestTimeAvg) {
      bestTimeAvg = avg;
      bestTimeOfDay = bucket;
    }
  }

  // ── Current habits summary ─────────────────────────────────────
  const currentHabits: CurrentHabitSummary[] = habits.map((h) => {
    const totalPossible = h.frequency === "daily" ? days : Math.ceil(days / 7);
    const completionRate =
      totalPossible > 0 ? Math.round((h.logs.length / totalPossible) * 100) : 0;
    return {
      title: h.title,
      category: h.category ?? "custom",
      completionRate: Math.min(completionRate, 100),
    };
  });

  return {
    currentHabits,
    burnoutRiskLevel,
    bestDayOfWeek,
    worstDayOfWeek,
    bestTimeOfDay,
    averageMood,
  };
};

/**
 * Lightweight burnout level computation (no DB call needed).
 * Mirrors the formula in mood.service.ts calculateBurnoutRisk().
 */
const computeLocalBurnoutLevel = (moods: { moodScore: number }[]): string => {
  if (moods.length < 3) return "Insufficient Data";

  const avg = moods.reduce((s, m) => s + m.moodScore, 0) / moods.length;
  const lowMoodDays = moods.filter((m) => m.moodScore <= 2).length;
  const variance =
    moods.reduce((s, m) => s + Math.pow(m.moodScore - avg, 2), 0) /
    moods.length;
  const volatility = Math.sqrt(variance);

  const score = lowMoodDays * 2 + Math.max(0, 3.0 - avg) * 3 + volatility * 1.5;

  if (score >= 10) return "High";
  if (score >= 5) return "Moderate";
  return "Low";
};

/**
 * Parse and validate Groq's suggestions response.
 * Handles markdown fences, validates all fields, caps at 3.
 */
const parseSuggestionsResponse = (raw: string): HabitSuggestion[] => {
  let cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) cleaned = arrayMatch[0];

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error(
      "[Suggestions] Failed to parse Groq response:",
      cleaned.slice(0, 200),
    );
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const VALID_FREQUENCIES = new Set(["daily", "weekly"]);
  const VALID_CATEGORIES = new Set([
    "health",
    "fitness",
    "learning",
    "mindfulness",
    "productivity",
    "custom",
  ]);

  return parsed
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as any).title === "string" &&
        typeof (item as any).rationale === "string",
    )
    .map((item) => ({
      title: String(item.title).slice(0, 100),
      frequency: VALID_FREQUENCIES.has(item.frequency as string)
        ? (item.frequency as "daily" | "weekly")
        : "daily",
      category: VALID_CATEGORIES.has(item.category as string)
        ? String(item.category)
        : "custom",
      rationale: String(item.rationale ?? "").slice(0, 300),
      expectedMoodImpact: String(item.expectedMoodImpact ?? "").slice(0, 200),
    }))
    .slice(0, 3); // always cap at 3
};
