-- DropIndex
DROP INDEX "ShiftTemplate_departmentId_name_key";

-- AlterTable
ALTER TABLE "EmployeeType" ADD COLUMN     "requiresDepartmentMatch" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ShiftTemplate" DROP COLUMN "endTime",
DROP COLUMN "name",
DROP COLUMN "nightShift",
DROP COLUMN "startTime",
ADD COLUMN     "shiftTypeId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ShiftTemplate_departmentId_shiftTypeId_key" ON "ShiftTemplate"("departmentId", "shiftTypeId");

-- AddForeignKey
ALTER TABLE "ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_shiftTypeId_fkey" FOREIGN KEY ("shiftTypeId") REFERENCES "ShiftType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
