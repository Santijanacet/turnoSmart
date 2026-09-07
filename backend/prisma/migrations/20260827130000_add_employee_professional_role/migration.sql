-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "professionalRoleId" TEXT;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_professionalRoleId_fkey" FOREIGN KEY ("professionalRoleId") REFERENCES "ProfessionalRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
