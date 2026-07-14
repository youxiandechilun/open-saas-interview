CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR', 'CREATOR');

ALTER TABLE "User"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'CREATOR',
ADD COLUMN "isDisabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "role" = 'ADMIN'
WHERE "isAdmin" = true;

CREATE INDEX "User_role_isDisabled_idx" ON "User"("role", "isDisabled");
