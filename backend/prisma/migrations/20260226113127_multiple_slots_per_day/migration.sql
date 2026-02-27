-- DropIndex
DROP INDEX "doctor_availability_doctorId_dayOfWeek_key";

-- CreateIndex
CREATE INDEX "doctor_availability_doctorId_dayOfWeek_idx" ON "doctor_availability"("doctorId", "dayOfWeek");
