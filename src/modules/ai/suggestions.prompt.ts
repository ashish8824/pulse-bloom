// src/modules/ai/suggestions.prompt.ts
//
// ─────────────────────────────────────────────────────────────────
// HABIT SUGGESTIONS PROMPT ENGINEERING
//
// Builds the prompts for generating 3 personalized habit suggestions.
//
// INPUT DATA (fed to the prompt):
//   - User's daily mood insights (day-of-week + time-of-day patterns)
//   - Current active habits (title + category + completion rate)
//   - Current burnout risk level
//
// OUTPUT CONTRACT: strict JSON array of 3 objects:
//   [
//     {
//       "title": string,          // 2-6 word habit name
//       "frequency": "daily" | "weekly",
//       "category": string,       // one of the HabitCategory enum values
//       "rationale": string,      // why this habit, referencing user's data
//       "expectedMoodImpact": string  // one sentence on what to expect
//     }
//   ]
//
// DESIGN DECISIONS:
//   1. We always suggest exactly 3 habits — predictable for the UI.
//   2. Suggestions must NOT duplicate existing active habits.
//   3. The rationale must reference actual data — no generic advice.
//   4. Category must match the Prisma HabitCategory enum exactly
//      so the frontend can pre-fill the "create habit" form.
// ─────────────────────────────────────────────────────────────────

// ─── TYPES ────────────────────────────────────────────────────────

export type CurrentHabitSummary = {
  title: string;
  category: string;
  completionRate: number; // 0–100
};

export type SuggestionContext = {
  currentHabits: CurrentHabitSummary[];
  burnoutRiskLevel: string; // "Low" | "Moderate" | "High" | "Insufficient Data"
  bestDayOfWeek: string | null; // e.g. "Monday" — day user logs best mood
  worstDayOfWeek: string | null; // e.g. "Friday" — day user logs worst mood
  bestTimeOfDay: string | null; // e.g. "Morning (5am–12pm)"
  averageMood: number | null; // 1–5 overall average
};

// ─── SYSTEM PROMPT ────────────────────────────────────────────────

export const buildSuggestionsSystemPrompt = (): string => {
  return `You are a behavioral wellness AI for PulseBloom, a habit and mood tracking app.

Your job is to suggest exactly 3 new habits that would genuinely benefit this specific user based on their behavioral data.

CRITICAL RULES:
- Respond ONLY with a valid JSON array of exactly 3 objects. No preamble, no markdown.
- Your entire response must be parseable by JSON.parse().

OUTPUT FORMAT (each of the 3 objects must have exactly these fields):
{
  "title": string,              // 2–6 words, actionable habit name (e.g. "Evening Journal Reflection")
  "frequency": "daily" | "weekly",
  "category": string,           // MUST be one of: health, fitness, learning, mindfulness, productivity, custom
  "rationale": string,          // 1–2 sentences referencing the user's ACTUAL data
  "expectedMoodImpact": string  // 1 sentence on the expected behavioral benefit
}

SUGGESTION RULES:
1. NEVER suggest a habit the user already tracks (check the currentHabits list)
2. If burnout risk is High → prioritize recovery habits: sleep, mindfulness, rest, boundaries
3. If burnout risk is Moderate → balance recovery with productive habits
4. If burnout risk is Low → can suggest growth-oriented, challenging habits
5. If the user's worst day is known → suggest habits that could specifically help on that day
6. If averageMood < 3.0 → at least 2 suggestions should be mood-lifting habits
7. The title must be specific and actionable: NOT "Exercise More" but "10-Minute Morning Walk"
8. rationale MUST reference the user's actual data — never give generic advice
9. Habits should be complementary, not overlapping

VALID CATEGORIES: health, fitness, learning, mindfulness, productivity, custom

EXAMPLE good rationale (uses actual data):
"Your mood tends to be lowest on Fridays and you're currently at Moderate burnout risk. A brief wind-down ritual could help transition out of the work week."

EXAMPLE bad rationale (generic, no data reference):
"Meditation is good for stress reduction."`;
};

// ─── USER PROMPT ──────────────────────────────────────────────────

export const buildSuggestionsUserPrompt = (
  context: SuggestionContext,
): string => {
  const {
    currentHabits,
    burnoutRiskLevel,
    bestDayOfWeek,
    worstDayOfWeek,
    bestTimeOfDay,
    averageMood,
  } = context;

  const habitsText =
    currentHabits.length > 0
      ? currentHabits
          .map(
            (h) =>
              `- "${h.title}" (${h.category}, ${h.completionRate}% completion rate)`,
          )
          .join("\n")
      : "No habits tracked yet.";

  return `Generate 3 personalized habit suggestions for this user.

USER BEHAVIORAL PROFILE:
- Current burnout risk: ${burnoutRiskLevel}
- Overall average mood: ${averageMood !== null ? `${averageMood}/5` : "insufficient data"}
- Best mood day: ${bestDayOfWeek ?? "unknown"}
- Worst mood day: ${worstDayOfWeek ?? "unknown"}
- Best time of day: ${bestTimeOfDay ?? "unknown"}

CURRENT HABITS (DO NOT suggest these):
${habitsText}

Based on this data, suggest 3 complementary habits that would specifically benefit this user.
Return a JSON array of exactly 3 objects. No preamble.`;
};
