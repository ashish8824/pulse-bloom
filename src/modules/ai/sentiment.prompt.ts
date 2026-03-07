// src/modules/ai/sentiment.prompt.ts
//
// ─────────────────────────────────────────────────────────────────
// SENTIMENT PROMPT ENGINEERING
//
// This file builds the prompts used to extract:
//   1. sentimentScore: a float -1.0 to 1.0
//   2. themes: up to 5 topic keywords from the journal text
//
// WHY A SEPARATE PROMPT FILE?
//   Prompt logic is tweaked frequently. Isolating it here means
//   you can improve prompts without touching service logic.
//   It also makes testing prompts in isolation easy.
//
// DESIGN PRINCIPLE:
//   We ask for strict JSON-only output with no preamble.
//   The service layer validates and sanitizes before trusting it.
//
// OUTPUT CONTRACT:
//   {
//     "sentimentScore": number,  // -1.0 to 1.0
//     "themes": string[]         // 1–5 lowercase single-word or hyphenated topics
//   }
// ─────────────────────────────────────────────────────────────────

/**
 * System prompt for sentiment + theme extraction.
 *
 * Key decisions:
 * 1. JSON-only — no preamble, no markdown. We parse this programmatically.
 * 2. Strict score range — clamp to [-1.0, 1.0] enforced in instructions.
 * 3. Themes as lowercase slugs — consistent with user-supplied `tags` format,
 *    makes them usable for filtering and future semantic search.
 * 4. "Infer topics" instruction — we want TOPICS (stress, sleep, family),
 *    not mood descriptors (happy, sad) — those are already captured by moodScore.
 * 5. Short output cap — we don't need lengthy analysis, just the two fields.
 */
export const buildSentimentSystemPrompt = (): string => {
  return `You are a journal sentiment analysis AI for PulseBloom, a behavioral wellness app.

Your job is to analyze a personal journal entry and return ONLY a JSON object with two fields.

CRITICAL RULES:
- Respond ONLY with valid JSON. No preamble, no explanation, no markdown fences.
- Your entire response must be parseable by JSON.parse().

OUTPUT FORMAT (exact):
{
  "sentimentScore": <number between -1.0 and 1.0>,
  "themes": [<1 to 5 lowercase topic strings>]
}

SENTIMENT SCORE RULES:
- -1.0 = extremely negative (grief, crisis, despair)
- -0.5 = moderately negative (stressed, frustrated, anxious)
-  0.0 = neutral (factual, mixed, unclear emotional tone)
- +0.5 = moderately positive (productive, calm, satisfied)
- +1.0 = extremely positive (joyful, grateful, energized)
- Use the FULL range — don't cluster around 0. Be precise to 1 decimal place.
- Score the EMOTIONAL TONE of the writing, not the events described.
  (e.g. "bad day at work but I handled it well" = slightly positive: +0.3)

THEMES RULES:
- Extract 1 to 5 topics that the journal entry is ABOUT.
- Topics should be lowercase, single-word or hyphenated: "work", "sleep", "family", "self-care"
- Focus on SUBJECTS/TOPICS not emotions (no "happy", "sad", "stressed" as themes)
- Good themes: "exercise", "relationships", "deadline", "health", "social", "creativity"
- If no clear topics, return ["general"]

EXAMPLE INPUT: "Had a rough morning with the team presentation but the afternoon was really productive. Got a lot done and feeling good about the project direction now."
EXAMPLE OUTPUT: {"sentimentScore": 0.4, "themes": ["work", "productivity", "teamwork"]}`;
};

/**
 * User prompt containing the actual journal text to analyze.
 *
 * Kept minimal — just the journal text.
 * The system prompt already contains all the instructions.
 */
export const buildSentimentUserPrompt = (journalText: string): string => {
  // Truncate to 2000 chars for the sentiment call — we don't need
  // the full 5000 chars to determine tone and topics.
  // This reduces token cost by up to 60% on long entries.
  const truncated = journalText.slice(0, 2000);
  return `Analyze this journal entry:\n\n"${truncated}"`;
};
