-- AlterTable
ALTER TABLE "CmsPost" ADD COLUMN     "animationId" TEXT;

-- Align the database with Prisma's @updatedAt field after the safe backfill
-- default in the preceding user-role migration has served its purpose.
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "CmsPost_animationId_idx" ON "CmsPost"("animationId");

-- AddForeignKey
ALTER TABLE "CmsPost" ADD CONSTRAINT "CmsPost_animationId_fkey" FOREIGN KEY ("animationId") REFERENCES "AiAnimation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
