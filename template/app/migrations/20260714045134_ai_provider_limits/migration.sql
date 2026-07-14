-- AlterTable
ALTER TABLE "AiProviderConfig" ADD COLUMN     "hourlyTokenLimit" INTEGER NOT NULL DEFAULT 100000,
ADD COLUMN     "maxCompletionTokens" INTEGER NOT NULL DEFAULT 12000;
