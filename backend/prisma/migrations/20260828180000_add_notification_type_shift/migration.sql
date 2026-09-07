-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "shiftId" TEXT,
ADD COLUMN     "type" TEXT;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
