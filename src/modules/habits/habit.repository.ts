import { prisma } from "../../config/db";

/**
 * Create new habit record
 */
export const createHabitRecord = async (data: {
  title: string;
  description?: string;
  frequency: "daily" | "weekly";
  userId: string;
}) => {
  return prisma.habit.create({
    data,
  });
};

/**
 * Fetch all habits for a user
 */
export const getHabitsByUser = async (userId: string) => {
  return prisma.habit.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Create habit log
 */
export const createHabitLog = async (habitId: string, date: Date) => {
  return prisma.habitLog.create({
    data: {
      habitId,
      date,
    },
  });
};

/**
 * Fetch logs for streak calculation
 */
export const getHabitLogs = async (habitId: string) => {
  return prisma.habitLog.findMany({
    where: { habitId },
    orderBy: { date: "desc" },
  });
};

/**
 * Find habit by ID (ownership check)
 */
export const findHabitById = async (habitId: string) => {
  return prisma.habit.findUnique({
    where: { id: habitId },
  });
};

/**
 * Fetch habit with logs
 */
export const getHabitWithLogs = async (habitId: string) => {
  return prisma.habit.findUnique({
    where: { id: habitId },
    include: {
      logs: {
        orderBy: { date: "asc" },
      },
    },
  });
};


