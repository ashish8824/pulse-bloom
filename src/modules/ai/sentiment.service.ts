// src/modules/ai/sentiment.service.ts
//
// ─────────────────────────────────────────────────────────────────
// SENTIMENT SERVICE
//
// This service does ONE thing: take a journal's MongoDB _id and text,
// call Groq to extract sentimentScore + themes, then update the
// MongoDB document with the results.
//
// HOW IT'S CALLED:
//   From mood.service.ts → addMood() → fire-and-forget after journal creation.
//   The caller does NOT await this function. It runs in the background.
//   If it fails, the mood entry is completely unaffected.
//
// FLOW:
//   analyzeJournalSentiment(journalId, text)
//     │
//     ├─► Build system + user prompts
//     ├─► Call Groq (llama-3.3-70b-versatile)
//     ├─► Parse + validate JSON response
//     └─► Update JournalModel document with sentimentScore + themes
//
// ERROR HANDLING:
//   All errors are caught internally and logged.
//   This function NEVER throws — it is designed to be fire-and-forget safe.
//   A Groq failure, parse error, or DB write error → log + return silently.
// ─────────────────────────────────────────────────────────────────

import Groq from "groq-sdk";
import { JournalModel } from "../mood/mood.mongo";
import {
  buildSentimentSystemPrompt,
  buildSentimentUserPrompt,
} from "./sentiment.prompt";

// ─── GROQ CLIENT ──────────────────────────────────────────────────
// Reuse the same Groq client pattern as ai.service.ts.
// Module-level instantiation = one client for the lifetime of the process.
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ─── TYPES ────────────────────────────────────────────────────────

/**
 * The validated output from Groq sentiment analysis.
 */
type SentimentResult = {
  sentimentScore: number; // -1.0 to 1.0
  themes: string[]; // 1–5 lowercase topic strings
};

// ─── MAIN FUNCTION ────────────────────────────────────────────────

/**
 * Analyze a journal entry for sentiment and themes.
 * Updates the MongoDB JournalEntry document in place.
 *
 * @param journalId  - MongoDB _id string of the JournalEntry document
 * @param journalText - The raw journal text to analyze
 *
 * Design: pure side-effect function.
 * Returns void — the result is written directly to MongoDB.
 * Never throws — all errors are swallowed with a log.
 */
export const analyzeJournalSentiment = async (
  journalId: string,
  journalText: string,
): Promise<void> => {
  try {
    // ── Step 1: Build prompts ──────────────────────────────────────
    const systemPrompt = buildSentimentSystemPrompt();
    const userPrompt = buildSentimentUserPrompt(journalText);

    // ── Step 2: Call Groq ──────────────────────────────────────────
    // Model: llama-3.3-70b-versatile (same as main AI insights)
    // temperature: 0.1 — very low because this is a structured extraction task.
    //   We want deterministic, consistent results. Creativity is not needed here.
    // max_tokens: 100 — the output is tiny: {"sentimentScore": 0.4, "themes": [...]}
    //   Capping at 100 prevents runaway responses and keeps token cost minimal.
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 100,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const rawResponse = completion.choices[0]?.message?.content ?? "";

    // ── Step 3: Parse + validate ───────────────────────────────────
    const result = parseSentimentResponse(rawResponse);

    if (!result) {
      // parseSentimentResponse already logged the error
      return;
    }

    // ── Step 4: Update MongoDB document ───────────────────────────
    // findByIdAndUpdate: atomic update, no need to fetch-then-save.
    // We use $set to only update these two fields — other fields unchanged.
    await JournalModel.findByIdAndUpdate(journalId, {
      $set: {
        sentimentScore: result.sentimentScore,
        themes: result.themes,
      },
    });

    // Uncomment during development to verify sentiment is being written:
    // console.log(`[Sentiment] ✅ ${journalId} → score: ${result.sentimentScore}, themes: ${result.themes.join(", ")}`);
  } catch (error: any) {
    // Silent failure — sentiment is a secondary enrichment layer.
    // The mood entry already exists. This failing doesn't affect the user.
    console.error(
      `[Sentiment] ❌ Failed for journal ${journalId}:`,
      error.message,
    );
  }
};

// ─── HELPER: Parse + Validate Groq Response ───────────────────────

/**
 * Parse the raw Groq response string into a validated SentimentResult.
 *
 * Defensive parsing steps:
 *   1. Strip markdown fences (model sometimes wraps in ```json)
 *   2. Extract first {...} object even if surrounded by text
 *   3. JSON.parse
 *   4. Validate sentimentScore is a number in [-1.0, 1.0]
 *   5. Validate themes is an array of strings
 *   6. Clamp + normalize values
 *
 * Returns null if parsing fails (caller handles silently).
 */
const parseSentimentResponse = (raw: string): SentimentResult | null => {
  // Step 1: Strip markdown fences
  let cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Step 2: Extract first JSON object
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    cleaned = objectMatch[0];
  }

  // Step 3: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error(
      "[Sentiment] Failed to parse Groq response:",
      cleaned.slice(0, 100),
    );
    return null;
  }

  // Step 4: Must be an object
  if (typeof parsed !== "object" || parsed === null) {
    console.error("[Sentiment] Groq response is not a JSON object");
    return null;
  }

  const obj = parsed as Record<string, unknown>;

  // Step 5: Validate sentimentScore
  const rawScore = obj.sentimentScore;
  if (typeof rawScore !== "number" || isNaN(rawScore)) {
    console.error("[Sentiment] Invalid sentimentScore:", rawScore);
    return null;
  }

  // Clamp to [-1.0, 1.0] in case the model went slightly out of range
  const sentimentScore = Math.max(-1.0, Math.min(1.0, rawScore));
  // Round to 1 decimal place for clean storage
  const roundedScore = Math.round(sentimentScore * 10) / 10;

  // Step 6: Validate themes
  const rawThemes = obj.themes;
  let themes: string[] = [];

  if (Array.isArray(rawThemes)) {
    themes = rawThemes
      .filter((t): t is string => typeof t === "string" && t.length > 0)
      .map((t) => t.toLowerCase().trim().replace(/\s+/g, "-")) // normalize to slugs
      .slice(0, 5); // cap at 5
  }

  // Fallback: if themes is empty after filtering, use generic
  if (themes.length === 0) {
    themes = ["general"];
  }

  return { sentimentScore: roundedScore, themes };
};
