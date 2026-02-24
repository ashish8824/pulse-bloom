-- CreateEnum
CREATE TYPE "HabitCategory" AS ENUM ('health', 'fitness', 'learning', 'mindfulness', 'productivity', 'custom');

-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "category" "HabitCategory" NOT NULL DEFAULT 'custom',
ADD COLUMN     "color" TEXT,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "reminderOn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderTime" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "targetPerWeek" INTEGER;

-- CreateIndex
CREATE INDEX "Habit_userId_idx" ON "Habit"("userId");

-- CreateIndex
CREATE INDEX "HabitLog_habitId_idx" ON "HabitLog"("habitId");
