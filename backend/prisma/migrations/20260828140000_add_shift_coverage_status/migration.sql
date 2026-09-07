-- CreateEnum
CREATE TYPE "ShiftCoverageStatus" AS ENUM ('UNCOVERED', 'PARTIALLY_COVERED', 'COVERED');

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "coverageStatus" "ShiftCoverageStatus" NOT NULL DEFAULT 'UNCOVERED';
