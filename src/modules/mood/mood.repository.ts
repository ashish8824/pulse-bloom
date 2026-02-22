import { prisma } from "../../config/db";

/**
 * Save mood entry to PostgreSQL
 */
export const createMoodEntry = async (data: {
  moodScore: number;
  emoji: string;
  journalId?: string;
  userId: string;
}) => {
  return prisma.moodEntry.create({
    data,
  });
};

/**
 * Fetch paginated moods with optional date filtering
 */
export const getUserMoods = async (
  userId: string,
  page: number,
  limit: number,
  startDate?: string,
  endDate?: string,
) => {
  const skip = (page - 1) * limit;

  const whereClause: any = {
    userId,
  };

  // Add date filtering if provided
  if (startDate || endDate) {
    whereClause.createdAt = {};

    if (startDate) {
      whereClause.createdAt.gte = new Date(startDate);
    }

    if (endDate) {
      whereClause.createdAt.lte = new Date(endDate);
    }
  }

  const [data, total] = await Promise.all([
    prisma.moodEntry.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.moodEntry.count({
      where: whereClause,
    }),
  ]);

  return { data, total };
};

/**
 * Get mood analytics with optional date filtering
 */
export const getMoodAnalytics = async (
  userId: string,
  startDate?: string,
  endDate?: string,
) => {
  const whereClause: any = { userId };

  if (startDate || endDate) {
    whereClause.createdAt = {};

    if (startDate) {
      whereClause.createdAt.gte = new Date(startDate);
    }

    if (endDate) {
      whereClause.createdAt.lte = new Date(endDate);
    }
  }

  const moods = await prisma.moodEntry.findMany({
    where: whereClause,
  });

  return moods;
};

/**
 * Fetch moods for weekly trend calculation
 */
export const getMoodsForTrend = async (
  userId: string,
  startDate?: string,
  endDate?: string,
) => {
  const whereClause: any = { userId };

  if (startDate || endDate) {
    whereClause.createdAt = {};

    if (startDate) {
      whereClause.createdAt.gte = new Date(startDate);
    }

    if (endDate) {
      whereClause.createdAt.lte = new Date(endDate);
    }
  }

  return prisma.moodEntry.findMany({
    where: whereClause,
    orderBy: { createdAt: "asc" },
  });
};
