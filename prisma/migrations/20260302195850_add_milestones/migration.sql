-- CreateEnum
CREATE TYPE "MilestoneType" AS ENUM ('FIRST_MOOD_ENTRY', 'HABIT_STREAK_7', 'HABIT_STREAK_14', 'HABIT_STREAK_21', 'HABIT_STREAK_30', 'HABIT_STREAK_60', 'HABIT_STREAK_90', 'HABIT_STREAK_100', 'HABIT_STREAK_180', 'HABIT_STREAK_365', 'MOOD_STREAK_7', 'MOOD_STREAK_14', 'MOOD_STREAK_30', 'BEST_WEEK_MOOD', 'BURNOUT_RECOVERY');

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MilestoneType" NOT NULL,
    "habitId" TEXT,
    "value" DOUBLE PRECISION,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Milestone_userId_achievedAt_idx" ON "Milestone"("userId", "achievedAt");

-- CreateIndex
CREATE INDEX "Milestone_userId_type_idx" ON "Milestone"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_userId_type_habitId_key" ON "Milestone"("userId", "type", "habitId");

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
