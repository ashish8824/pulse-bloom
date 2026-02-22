import {
  createMoodEntry,
  getMoodAnalytics,
  getMoodsForTrend,
  getUserMoods,
} from "./mood.repository";
import { JournalModel } from "./mood.mongo";

/**
 * Create mood entry (Postgres + Mongo)
 */
export const addMood = async (
  moodScore: number,
  emoji: string,
  journalText: string,
  userId: string,
) => {
  // Save journal in MongoDB
  const journal = await JournalModel.create({
    userId,
    text: journalText,
  });

  // Save mood in PostgreSQL
  const mood = await createMoodEntry({
    moodScore,
    emoji,
    journalId: journal._id.toString(),
    userId,
  });

  return mood;
};

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

/**
 * Calculate mood analytics
 */
export const calculateMoodAnalytics = async (
  userId: string,
  startDate?: string,
  endDate?: string,
) => {
  const moods = await getMoodAnalytics(userId, startDate, endDate);

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

  const totalEntries = moods.length;

  const scores = moods.map((m) => m.moodScore);

  const sum = scores.reduce((acc, val) => acc + val, 0);
  const averageMood = parseFloat((sum / totalEntries).toFixed(2));

  const highestMood = Math.max(...scores);
  const lowestMood = Math.min(...scores);

  const distribution: Record<string, number> = {};

  scores.forEach((score) => {
    distribution[score] = (distribution[score] || 0) + 1;
  });

  // Find most frequent mood
  const mostFrequentMood = Object.entries(distribution).reduce((prev, curr) =>
    curr[1] > prev[1] ? curr : prev,
  )[0];

  return {
    totalEntries,
    averageMood,
    highestMood,
    lowestMood,
    mostFrequentMood: Number(mostFrequentMood),
    distribution,
  };
};

/**
 * Calculate weekly mood trends
 */
export const calculateWeeklyTrend = async (
  userId: string,
  startDate?: string,
  endDate?: string,
) => {
  const moods = await getMoodsForTrend(userId, startDate, endDate);

  const weeklyMap: Record<string, { total: number; count: number }> = {};

  moods.forEach((mood) => {
    const date = new Date(mood.createdAt);

    // ISO Week calculation
    const year = date.getFullYear();
    const firstDay = new Date(year, 0, 1);
    const week =
      Math.ceil(
        ((date.getTime() - firstDay.getTime()) / 86400000 +
          firstDay.getDay() +
          1) /
          7,
      ) || 1;

    const weekKey = `${year}-W${week}`;

    if (!weeklyMap[weekKey]) {
      weeklyMap[weekKey] = { total: 0, count: 0 };
    }

    weeklyMap[weekKey].total += mood.moodScore;
    weeklyMap[weekKey].count += 1;
  });

  const weeklyTrends = Object.entries(weeklyMap).map(([week, value]) => ({
    week,
    averageMood: parseFloat((value.total / value.count).toFixed(2)),
    entries: value.count,
  }));

  return { weeklyTrends };
};
