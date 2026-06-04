-- CreateEnum
CREATE TYPE "RecipientRole" AS ENUM ('SIGNER', 'CC', 'VIEWER');

-- AlterTable
ALTER TABLE "recipients" ADD COLUMN     "role" "RecipientRole" NOT NULL DEFAULT 'SIGNER';
