-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_professionalRoleId_fkey";

-- DropForeignKey
ALTER TABLE "ProfessionalRole" DROP CONSTRAINT "ProfessionalRole_tenantId_fkey";

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "professionalRoleId";

-- DropTable
DROP TABLE "ProfessionalRole";
