-- AlterTable
ALTER TABLE "recipients"
  ADD COLUMN "adoptedSignature" TEXT,
  ADD COLUMN "adoptedInitials" TEXT,
  ADD COLUMN "adoptedFullName" TEXT,
  ADD COLUMN "adoptedInitialsText" TEXT,
  ADD COLUMN "adoptedAt" TIMESTAMP(3);
