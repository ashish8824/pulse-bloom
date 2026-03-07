-- AlterTable
ALTER TABLE "AiInsight" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'insights';

-- CreateIndex
CREATE INDEX "AiInsight_userId_type_idx" ON "AiInsight"("userId", "type");
