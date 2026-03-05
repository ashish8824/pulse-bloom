-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('FIRST_STEP', 'WEEK_ONE', 'IRON_WILL', 'MINDFUL_MONTH', 'RESILIENT', 'CENTURION');

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BadgeType" NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Badge_userId_idx" ON "Badge"("userId");

-- CreateIndex
CREATE INDEX "Badge_userId_earnedAt_idx" ON "Badge"("userId", "earnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_userId_type_key" ON "Badge"("userId", "type");

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
