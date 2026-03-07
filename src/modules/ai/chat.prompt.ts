// src/modules/ai/chat.prompt.ts
//
// ─────────────────────────────────────────────────────────────────
// AI COACH PROMPT BUILDER
//
// This file builds the SYSTEM PROMPT for the AI coach.
// The system prompt is rebuilt on EVERY chat call so it always
// reflects the user's CURRENT behavioral data (not stale snapshots).
//
// WHY INJECT BEHAVIORAL CONTEXT INTO EVERY CALL?
//   Without context, the AI gives generic wellness advice.
//   With context, it can say: "Given your mood has been 2.8 on average
//   this week and you've missed your meditation habit for 5 days..."
//   This is the core value proposition of the AI coach feature.
//
// WHAT GETS INJECTED:
//   - 90-day behavioral summary (same data as ai.service.ts insights)
//   - Current burnout risk level
//   - Current streaks
//   - Active habits overview
//
// WHAT DOES NOT GET INJECTED:
//   - Raw mood entries (too verbose, not necessary)
//   - Journal text (privacy — user hasn't explicitly shared it with coach)
//   - Personal identifiers beyond userId (the AI doesn't need the user's name)
// ─────────────────────────────────────────────────────────────────

// ─── TYPES ────────────────────────────────────────────────────────

export type CoachContext = {
  averageMood: number | null;
  burnoutRiskLevel: string;
  currentMoodStreak: number;
  activeHabits: {
    title: string;
    category: string;
    completionRate: number;
    currentStreak: number;
  }[];
  recentLowMoodDays: number; // count of days with mood ≤ 2 in last 14 days
};

// ─── SYSTEM PROMPT BUILDER ────────────────────────────────────────

/**
 * Builds the system prompt with injected behavioral context.
 *
 * This prompt is sent as the `system` role on every Groq call.
 * It sets the AI's persona, capabilities, and constraints.
 *
 * KEY DESIGN DECISIONS:
 * 1. Empathetic but evidence-based — not a therapist, not a generic bot.
 * 2. Must reference the user's actual data in responses when relevant.
 * 3. Knows its limits — recommends professionals for clinical concerns.
 * 4. Concise responses — users are on mobile, not reading essays.
 */
export const buildCoachSystemPrompt = (context: CoachContext): string => {
  const {
    averageMood,
    burnoutRiskLevel,
    currentMoodStreak,
    activeHabits,
    recentLowMoodDays,
  } = context;

  const habitsSummary =
    activeHabits.length > 0
      ? activeHabits
          .map(
            (h) =>
              `- ${h.title} (${h.category}, ${h.completionRate}% completion, ${h.currentStreak}-day streak)`,
          )
          .join("\n")
      : "No active habits tracked.";

  return `You are PulseBloom Coach, a warm and evidence-informed behavioral wellness AI.

YOUR ROLE:
- Help users understand their mood patterns and habit behaviors
- Offer practical, actionable advice grounded in behavioral science
- Reference the user's ACTUAL data in your responses when relevant
- Be supportive and empathetic, but honest about patterns you see
- Keep responses concise (2–4 sentences unless a longer answer is clearly needed)

WHAT YOU ARE NOT:
- Not a therapist or clinical psychologist
- Not a medical advisor
- If the user seems to be in genuine distress or crisis, always recommend
  they speak with a mental health professional

THIS USER'S CURRENT BEHAVIORAL DATA (90-day window):
- Average mood score: ${averageMood !== null ? `${averageMood}/5` : "not enough data yet"}
- Burnout risk level: ${burnoutRiskLevel}
- Current mood logging streak: ${currentMoodStreak} days
- Low mood days (last 14 days): ${recentLowMoodDays}

ACTIVE HABITS:
${habitsSummary}

RESPONSE STYLE:
- Use plain, warm, human language. No bullet points unless listing steps.
- When you reference their data, be specific: "Your mood has averaged 2.8 this past week..."
- If you don't have enough data to make a specific observation, say so honestly.
- Never fabricate data or make up statistics about the user.
- Responses should feel like a knowledgeable friend, not a chatbot.`;
};
