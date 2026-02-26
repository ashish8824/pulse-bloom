// src/modules/ai/ai.repository.ts
//
// ─────────────────────────────────────────────────────────────────
// REPOSITORY LAYER — the ONLY place that touches the database.
//
// This file handles:
//   1. Fetching raw mood + habit data needed for AI analysis
//   2. Reading/writing the AiInsight cache record
//
// Why a separate repository for AI?
// The AI module needs data from BOTH mood and habit tables.
// Rather than calling the mood/habit repositories from the AI service
// (which would create cross-module coupling), we have a dedicated
// AI repository that fetches exactly what the AI needs in one place.
// ─────────────────────────────────────────────────────────────────

import { prisma } from "../../config/db";

// ─── DATA FETCHING ────────────────────────────────────────────────

/**
 * Fetch the last N days of mood entries for a user.
 *
 * Why 90 days?
 * - Enough data for meaningful pattern detection
 * - Not so much that the OpenAI prompt becomes enormous (token cost)
 * - Configurable via the `days` param
 *
 * Returns: array of { moodScore, createdAt } sorted ASC (oldest first)
 * Ascending order matters — the AI reads data chronologically.
 */
export const getRecentMoodsForAi = async (
  userId: string,
  days: number = 90,
) => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  return prisma.moodEntry.findMany({
    where: {
      userId,
      createdAt: { gte: since },
    },
    select: {
      moodScore: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
};

/**
 * Fetch active habits WITH their completion logs for the last N days.
 *
 * Why include logs inline?
 * We need both the habit metadata (title, frequency, category) AND
 * the completion history to detect patterns like "you miss this habit
 * on low-mood weeks". Fetching them together is one DB round-trip.
 *
 * Why only active (isArchived: false)?
 * Archived habits are habits the user has "given up on" — including them
 * in AI analysis would skew the data with old, irrelevant history.
 */
export const getHabitsWithRecentLogsForAi = async (
  userId: string,
  days: number = 90,
) => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  return prisma.habit.findMany({
    where: {
      userId,
      isArchived: false,
    },
    select: {
      id: true,
      title: true,
      frequency: true,
      category: true,
      targetPerWeek: true,
      logs: {
        where: {
          date: { gte: since },
        },
        select: {
          date: true,
        },
        orderBy: { date: "asc" },
      },
    },
  });
};

// ─── CACHE OPERATIONS ─────────────────────────────────────────────

/**
 * Read the cached AI insight for this user.
 *
 * Returns null if no insight has been generated yet.
 * The caller checks whether the cached dataHash still matches
 * the current data hash — if yes, returns cache without calling OpenAI.
 */
export const getCachedInsight = async (userId: string) => {
  return prisma.aiInsight.findUnique({
    where: { userId },
  });
};

/**
 * Upsert the AI insight cache for this user.
 *
 * "Upsert" = INSERT if no row exists, UPDATE if it does.
 * Why upsert instead of create/update?
 * - On first call: no row exists → creates it
 * - On subsequent calls: row exists → updates it
 * - One operation handles both cases cleanly
 *
 * generatedAt is explicitly set to now() on every write
 * so the frontend can show "Last updated: 3 hours ago".
 */
export const upsertInsightCache = async (
  userId: string,
  insights: object,
  dataHash: string,
) => {
  return prisma.aiInsight.upsert({
    where: { userId },
    create: {
      userId,
      insights,
      dataHash,
      generatedAt: new Date(),
    },
    update: {
      insights,
      dataHash,
      generatedAt: new Date(),
    },
  });
};
