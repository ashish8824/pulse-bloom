// src/modules/ai/chat.service.ts
//
// ─────────────────────────────────────────────────────────────────
// AI COACH SERVICE
//
// Orchestrates the full AI coach pipeline:
//
//   getAiCoachResponse(userId, message, conversationId)
//     │
//     ├─► Load or create AiConversation document (MongoDB)
//     ├─► Fetch user's behavioral context (Prisma + mood data)
//     ├─► Build system prompt with injected behavioral context
//     ├─► Build message array: [systemPrompt, ...last10Messages, newUserMsg]
//     ├─► Call Groq API
//     ├─► Save assistant response to conversation history
//     └─► Return { reply, conversationId, messageCount }
//
// CONTEXT INJECTION:
//   Every call rebuilds the system prompt with fresh behavioral data.
//   This means the coach always knows the user's CURRENT state,
//   not a stale snapshot from when the conversation started.
//
// CONVERSATION MANAGEMENT:
//   - Messages stored in MongoDB AiConversation collection
//   - Max 10 messages sent to Groq (to control context window cost)
//   - Max 50 messages stored per conversation (older ones pruned)
//   - Max 20 conversations per user (oldest pruned on overflow)
// ─────────────────────────────────────────────────────────────────

import Groq from "groq-sdk";
import { prisma } from "../../config/db";
import { AiConversationModel } from "./chat.mongo";
import { buildCoachSystemPrompt, CoachContext } from "./chat.prompt";
import {
  getRecentMoodsForAi,
  getHabitsWithRecentLogsForAi,
} from "./ai.repository";

// ─── CONSTANTS ────────────────────────────────────────────────────
const MAX_MESSAGES_IN_CONTEXT = 10; // messages sent to Groq (controls token cost)
const MAX_MESSAGES_STORED = 50; // messages kept in MongoDB per conversation
const MAX_CONVERSATIONS_PER_USER = 20;

// ─── GROQ CLIENT ──────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── MAIN SERVICE FUNCTION ────────────────────────────────────────

/**
 * Get an AI coach response for a user message.
 *
 * @param userId         - Authenticated user ID
 * @param message        - The user's message (already validated, trimmed)
 * @param conversationId - Existing conversation MongoDB _id (null = start new)
 */
export const getAiCoachResponse = async (
  userId: string,
  message: string,
  conversationId: string | null,
): Promise<{
  reply: string;
  conversationId: string;
  messageCount: number;
}> => {
  // ── Step 1: Load or create conversation ───────────────────────
  let conversation = conversationId
    ? await AiConversationModel.findOne({ _id: conversationId, userId })
    : null;

  const isNewConversation = !conversation;

  if (!conversation) {
    // New conversation: prune oldest if user hit the max
    const count = await AiConversationModel.countDocuments({ userId });
    if (count >= MAX_CONVERSATIONS_PER_USER) {
      // Delete the oldest (updatedAt ascending = oldest first)
      const oldest = await AiConversationModel.findOne({ userId }).sort({
        updatedAt: 1,
      });
      if (oldest) await AiConversationModel.deleteOne({ _id: oldest._id });
    }

    // Generate title from first message (truncated)
    const title = message.slice(0, 60) + (message.length > 60 ? "..." : "");

    conversation = await AiConversationModel.create({
      userId,
      title,
      messages: [],
    });
  }

  // ── Step 2: Fetch behavioral context ──────────────────────────
  const context = await buildCoachContext(userId);

  // ── Step 3: Build system prompt with injected context ─────────
  const systemPrompt = buildCoachSystemPrompt(context);

  // ── Step 4: Build message array for Groq ──────────────────────
  // Take the last N messages from history (controls context window size).
  // Always include the new user message at the end.
  const historySlice = conversation.messages
    .slice(-MAX_MESSAGES_IN_CONTEXT)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const groqMessages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[] = [
    { role: "system", content: systemPrompt },
    ...historySlice,
    { role: "user", content: message },
  ];

  // ── Step 5: Call Groq ──────────────────────────────────────────
  // temperature: 0.7 — more conversational than insight generation.
  //   We want natural, varied responses not rigid structured output.
  // max_tokens: 400 — coach responses should be concise.
  //   400 tokens ≈ 4–6 sentences. Enough for helpful advice.
  let reply: string;
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 400,
      messages: groqMessages,
    });
    reply = completion.choices[0]?.message?.content?.trim() ?? "";
  } catch (error: any) {
    throw new Error(`Groq API call failed: ${error.message}`);
  }

  if (!reply) {
    throw new Error("Groq returned an empty response");
  }

  // ── Step 6: Save both user message + assistant reply ──────────
  // Push to the messages array.
  // If we've hit the max, remove the oldest two (one user + one assistant pair).
  let messages = [
    ...conversation.messages,
    { role: "user" as const, content: message, timestamp: new Date() },
    { role: "assistant" as const, content: reply, timestamp: new Date() },
  ];

  if (messages.length > MAX_MESSAGES_STORED) {
    // Remove oldest pair (first 2 messages) to stay under cap
    messages = messages.slice(messages.length - MAX_MESSAGES_STORED);
  }

  // Save updated messages + bump updatedAt
  await AiConversationModel.findByIdAndUpdate(conversation._id, {
    $set: { messages },
  });

  return {
    reply,
    conversationId: conversation._id.toString(),
    messageCount: messages.length,
  };
};

// ─── HELPER: Build Coach Context ──────────────────────────────────

/**
 * Fetch all data needed for the system prompt context.
 * Runs DB queries concurrently to minimize latency.
 */
const buildCoachContext = async (userId: string): Promise<CoachContext> => {
  const DAYS = 90;

  const [moods, habits] = await Promise.all([
    getRecentMoodsForAi(userId, DAYS),
    getHabitsWithRecentLogsForAi(userId, DAYS),
  ]);

  // ── Average mood ───────────────────────────────────────────────
  const averageMood =
    moods.length > 0
      ? parseFloat(
          (moods.reduce((s, m) => s + m.moodScore, 0) / moods.length).toFixed(
            2,
          ),
        )
      : null;

  // ── Burnout risk (local calculation, no extra DB call) ─────────
  const burnoutRiskLevel = computeLocalBurnoutLevel(moods);

  // ── Mood streak (last consecutive logged days) ─────────────────
  const currentMoodStreak = computeLocalMoodStreak(moods);

  // ── Low mood days (last 14 days) ───────────────────────────────
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const recentLowMoodDays = moods.filter(
    (m) => m.moodScore <= 2 && new Date(m.createdAt) >= fourteenDaysAgo,
  ).length;

  // ── Active habits summary with streak ─────────────────────────
  const activeHabits = habits.map((h) => {
    const totalPossible = h.frequency === "daily" ? DAYS : Math.ceil(DAYS / 7);
    const completionRate =
      totalPossible > 0
        ? Math.min(100, Math.round((h.logs.length / totalPossible) * 100))
        : 0;

    // Compute current streak for this habit
    const currentStreak = computeHabitStreak(
      h.logs.map((l) => new Date(l.date)),
    );

    return {
      title: h.title,
      category: h.category ?? "custom",
      completionRate,
      currentStreak,
    };
  });

  return {
    averageMood,
    burnoutRiskLevel,
    currentMoodStreak,
    activeHabits,
    recentLowMoodDays,
  };
};

// ─── LOCAL COMPUTATION HELPERS ────────────────────────────────────

const computeLocalBurnoutLevel = (moods: { moodScore: number }[]): string => {
  if (moods.length < 3) return "Insufficient Data";
  const avg = moods.reduce((s, m) => s + m.moodScore, 0) / moods.length;
  const lowMoodDays = moods.filter((m) => m.moodScore <= 2).length;
  const variance =
    moods.reduce((s, m) => s + Math.pow(m.moodScore - avg, 2), 0) /
    moods.length;
  const score =
    lowMoodDays * 2 + Math.max(0, 3.0 - avg) * 3 + Math.sqrt(variance) * 1.5;
  if (score >= 10) return "High";
  if (score >= 5) return "Moderate";
  return "Low";
};

const computeLocalMoodStreak = (moods: { createdAt: Date }[]): number => {
  if (moods.length === 0) return 0;

  const loggedDays = new Set(
    moods.map((m) => new Date(m.createdAt).toISOString().split("T")[0]),
  );

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Streak must include today or yesterday to be "active"
  if (!loggedDays.has(today) && !loggedDays.has(yesterday)) return 0;

  let streak = 0;
  const anchor = loggedDays.has(today)
    ? new Date()
    : new Date(Date.now() - 86400000);

  for (let i = 0; i < 365; i++) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    if (loggedDays.has(dateStr)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

const computeHabitStreak = (dates: Date[]): number => {
  if (dates.length === 0) return 0;

  // Sort DESC (newest first)
  const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime());
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const loggedDays = new Set(sorted.map((d) => d.toISOString().split("T")[0]));

  if (!loggedDays.has(today) && !loggedDays.has(yesterday)) return 0;

  let streak = 0;
  const anchor = loggedDays.has(today)
    ? new Date()
    : new Date(Date.now() - 86400000);

  for (let i = 0; i < 365; i++) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    if (loggedDays.has(d.toISOString().split("T")[0])) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};
