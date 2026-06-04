-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FieldType" ADD VALUE 'DROPDOWN';
ALTER TYPE "FieldType" ADD VALUE 'CHECKBOX';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "pageDimensions" JSONB;

-- AlterTable
ALTER TABLE "signature_fields" ADD COLUMN     "options" JSONB;
