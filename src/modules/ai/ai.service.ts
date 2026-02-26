// src/modules/ai/ai.service.ts
//
// ─────────────────────────────────────────────────────────────────
// SERVICE LAYER — orchestrates the full AI insight pipeline.
//
// CHANGED FROM OPENAI → GROQ
// Groq is free (generous free tier), faster than OpenAI for inference,
// and uses the same chat completions API shape — so the switch is minimal.
//
// Model used: llama-3.3-70b-versatile
// Why this model?
// - Free on Groq's free tier
// - 70B params → strong reasoning, good at structured JSON output
// - Faster than GPT-4o at a fraction of the cost (free)
//
// FLOW:
//   getAiInsights()
//       │
//       ├─► Fetch moods + habits from DB (ai.repository)
//       │
//       ├─► Guard: not enough data? → return early with message
//       │
//       ├─► Compute SHA-256 dataHash of raw data
//       │
//       ├─► Check cache: hash match? → return cached (no Groq call)
//       │
//       ├─► Build BehavioralSummary (ai.prompt.ts)
//       │
//       ├─► Build system + user prompts (ai.prompt.ts)
//       │
//       ├─► Call Groq API (llama-3.3-70b-versatile)
//       │
//       ├─► Parse + validate JSON response
//       │
//       ├─► Save to cache (upsert AiInsight row)
//       │
//       └─► Return insights
// ─────────────────────────────────────────────────────────────────

import crypto from "crypto";
import Groq from "groq-sdk";
import {
  getRecentMoodsForAi,
  getHabitsWithRecentLogsForAi,
  getCachedInsight,
  upsertInsightCache,
} from "./ai.repository";
import {
  buildBehavioralSummary,
  buildSystemPrompt,
  buildUserPrompt,
} from "./ai.prompt";

// ─── GROQ CLIENT ──────────────────────────────────────────────────

/**
 * Initialize Groq client with API key from environment.
 *
 * Instantiated at module level (once at startup, not per request).
 * process.env.GROQ_API_KEY is loaded by dotenv in your env.ts.
 *
 * Get your free API key at: https://console.groq.com/keys
 */
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────

/**
 * Shape of a single AI-generated insight.
 * This is what the frontend receives and displays.
 */
export type AiInsightItem = {
  type: "correlation" | "streak" | "warning" | "positive" | "suggestion";
  title: string;
  description: string;
  severity: "info" | "warning" | "success";
};

// ─── MAIN SERVICE FUNCTION ────────────────────────────────────────

/**
 * Generate (or retrieve from cache) AI-powered behavioral insights.
 *
 * @param userId       - The authenticated user's ID
 * @param forceRefresh - If true, skip cache and regenerate via Groq
 *
 * Why forceRefresh?
 * Users can click "Refresh Insights" on the frontend.
 * Without it, they'd be stuck with cached insights even after
 * logging a full week of new data.
 */
export const getAiInsights = async (
  userId: string,
  forceRefresh: boolean = false,
) => {
  const DAYS = 90;

  // ── Step 1: Fetch raw data ─────────────────────────────────────
  // Run both DB queries concurrently — halves the fetch time.
  const [moods, habits] = await Promise.all([
    getRecentMoodsForAi(userId, DAYS),
    getHabitsWithRecentLogsForAi(userId, DAYS),
  ]);

  // ── Step 2: Guard — not enough data ───────────────────────────
  // AI insights are meaningless with very little data.
  // We need at least 7 mood entries OR 1 habit with 5+ completions.
  const hasEnoughMoodData = moods.length >= 7;
  const hasEnoughHabitData = habits.some((h) => h.logs.length >= 5);

  if (!hasEnoughMoodData && !hasEnoughHabitData) {
    return {
      insights: [],
      cached: false,
      generatedAt: null,
      message:
        "Not enough data yet. Keep logging your mood and habits for at least a week to unlock AI insights.",
    };
  }

  // ── Step 3: Compute data hash ──────────────────────────────────
  // SHA-256 fingerprint of the current data snapshot.
  // If this hash matches the stored cache hash, the user's data
  // hasn't changed — we can skip the Groq call entirely.
  //
  // This is the core of the caching strategy:
  //   same data → same hash → serve cache
  //   new data  → new hash  → call Groq, update cache
  const dataSnapshot = JSON.stringify({ moods, habits });
  const dataHash = crypto
    .createHash("sha256")
    .update(dataSnapshot)
    .digest("hex");

  // ── Step 4: Check cache ────────────────────────────────────────
  if (!forceRefresh) {
    const cached = await getCachedInsight(userId);

    if (cached && cached.dataHash === dataHash) {
      return {
        insights: cached.insights as AiInsightItem[],
        cached: true,
        generatedAt: cached.generatedAt,
        message: "Insights served from cache",
      };
    }
  }

  // ── Step 5: Pre-process data ───────────────────────────────────
  // Convert raw DB rows → compact BehavioralSummary with weekly buckets.
  // This is what gets sent to Groq — NOT the raw rows.
  // Sending pre-processed summaries reduces token count significantly.
  const summary = buildBehavioralSummary(moods, habits, DAYS);

  // ── Step 6: Build prompts ──────────────────────────────────────
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(summary, DAYS);

  // ── Step 7: Call Groq API ──────────────────────────────────────
  //
  // Model: llama-3.3-70b-versatile
  //   - Free tier on Groq (6000 tokens/min, 500k tokens/day)
  //   - 70B params → excellent at structured JSON output
  //   - ~10x faster than GPT-4o
  //   - Other free options: mixtral-8x7b-32768, llama3-70b-8192
  //
  // temperature: 0.3
  //   Lower than 0.4 because Llama models respond well to lower temp
  //   for structured JSON tasks. Higher temps risk malformed JSON.
  //
  // max_tokens: 1200
  //   3–6 insights × ~150 tokens each = ~750 tokens.
  //   1200 gives breathing room without burning free quota.
  let rawResponse: string;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    rawResponse = completion.choices[0]?.message?.content ?? "";
  } catch (error: any) {
    // Groq API errors: rate limit, invalid key, network issue, etc.
    // Throw a descriptive error — the global error handler will catch it.
    throw new Error(`Groq API call failed: ${error.message}`);
  }

  // ── Step 8: Parse and validate AI response ─────────────────────
  // Groq/Llama sometimes wraps JSON in markdown fences.
  // parseAndValidateInsights strips fences, parses JSON,
  // and validates every field before trusting it.
  const insights = parseAndValidateInsights(rawResponse);

  // ── Step 9: Save to cache ──────────────────────────────────────
  // Upsert: creates the row on first call, updates on subsequent calls.
  await upsertInsightCache(userId, insights, dataHash);

  return {
    insights,
    cached: false,
    generatedAt: new Date(),
    message: `Generated ${insights.length} insights`,
  };
};

// ─── HELPER: Parse and Validate AI Response ───────────────────────

/**
 * Parse the raw Groq response string into validated AiInsightItem[].
 *
 * Why validate so carefully?
 * LLMs (even good ones) occasionally:
 *   - Wrap JSON in ```json ... ``` markdown fences
 *   - Include extra commentary before/after the JSON
 *   - Return wrong field types
 *   - Add fields we didn't ask for
 *
 * This function handles all of those cases defensively.
 * If parsing fails, we return [] rather than crashing.
 *
 * Validation steps:
 *   1. Strip markdown code fences
 *   2. Extract JSON array (even if surrounded by text)
 *   3. JSON.parse
 *   4. Filter items missing required fields
 *   5. Normalize type/severity to allowed values
 *   6. Cap string lengths to prevent oversized responses
 *   7. Cap total count at 8
 */
const parseAndValidateInsights = (raw: string): AiInsightItem[] => {
  // Step 1: Strip markdown code fences
  // Handles: ```json\n[...]\n``` and ```\n[...]\n```
  let cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Step 2: Extract JSON array even if surrounded by text
  // Some models add "Here are your insights:" before the JSON.
  // This regex finds the first [ ... ] block.
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    cleaned = arrayMatch[0];
  }

  // Step 3: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[AI] Failed to parse Groq response:", cleaned.slice(0, 200));
    return [];
  }

  // Step 4: Must be an array
  if (!Array.isArray(parsed)) {
    console.error("[AI] Groq response is not a JSON array");
    return [];
  }

  const VALID_TYPES = new Set([
    "correlation",
    "streak",
    "warning",
    "positive",
    "suggestion",
  ]);
  const VALID_SEVERITIES = new Set(["info", "warning", "success"]);

  // Steps 4–7: Filter, normalize, cap
  return parsed
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as any).type === "string" &&
        typeof (item as any).title === "string" &&
        typeof (item as any).description === "string",
    )
    .map((item) => ({
      // Normalize type: if AI returns unknown type, fall back to "suggestion"
      type: VALID_TYPES.has(item.type as string)
        ? (item.type as AiInsightItem["type"])
        : "suggestion",
      // Cap lengths — prevents oversized strings reaching the frontend
      title: String(item.title).slice(0, 100),
      description: String(item.description).slice(0, 500),
      // Normalize severity: fall back to "info" if unknown
      severity: VALID_SEVERITIES.has(item.severity as string)
        ? (item.severity as AiInsightItem["severity"])
        : "info",
    }))
    .slice(0, 8); // cap at 8 insights
};