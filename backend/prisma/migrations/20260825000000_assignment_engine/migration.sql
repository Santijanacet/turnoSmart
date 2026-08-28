-- Additive migration for the automatic shift assignment engine.
-- Adds: Department.maxStaff, Shift.shiftTypeId, SchedulingPolicy, ShiftStaffRequirement.

ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "maxStaff" INTEGER;

ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "shiftTypeId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Shift_shiftTypeId_fkey'
  ) THEN
    ALTER TABLE "Shift" ADD CONSTRAINT "Shift_shiftTypeId_fkey"
      FOREIGN KEY ("shiftTypeId") REFERENCES "ShiftType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "SchedulingPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "maxHoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "maxHoursPerWeek" DOUBLE PRECISION NOT NULL DEFAULT 48,
    "minRestHours" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "maxNightShiftsPerPeriod" INTEGER NOT NULL DEFAULT 2,
    "nightShiftPeriodDays" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulingPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchedulingPolicy_tenantId_key" ON "SchedulingPolicy"("tenantId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'SchedulingPolicy_tenantId_fkey'
  ) THEN
    ALTER TABLE "SchedulingPolicy" ADD CONSTRAINT "SchedulingPolicy_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ShiftStaffRequirement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "employeeTypeId" TEXT NOT NULL,
    "requiredCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftStaffRequirement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShiftStaffRequirement_shiftId_employeeTypeId_key" ON "ShiftStaffRequirement"("shiftId", "employeeTypeId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ShiftStaffRequirement_tenantId_fkey'
  ) THEN
    ALTER TABLE "ShiftStaffRequirement" ADD CONSTRAINT "ShiftStaffRequirement_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ShiftStaffRequirement_shiftId_fkey'
  ) THEN
    ALTER TABLE "ShiftStaffRequirement" ADD CONSTRAINT "ShiftStaffRequirement_shiftId_fkey"
      FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ShiftStaffRequirement_employeeTypeId_fkey'
  ) THEN
    ALTER TABLE "ShiftStaffRequirement" ADD CONSTRAINT "ShiftStaffRequirement_employeeTypeId_fkey"
      FOREIGN KEY ("employeeTypeId") REFERENCES "EmployeeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
