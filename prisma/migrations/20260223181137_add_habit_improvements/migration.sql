/*
  Warnings:

  - A unique constraint covering the columns `[userId,title,frequency]` on the table `Habit` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Habit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "HabitLog" ADD COLUMN     "note" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Habit_userId_title_frequency_key" ON "Habit"("userId", "title", "frequency");
