/*
  Warnings:

  - You are about to drop the column `chief_complaint` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `created_by_id` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_id` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `patient_id` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_at` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `brand_name` on the `medicines` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `medicines` table. All the data in the column will be lost.
  - You are about to drop the column `generic_name` on the `medicines` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `medicines` table. All the data in the column will be lost.
  - You are about to drop the column `blood_group` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `chronic_conditions` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `emergency_contact` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `generic_name` on the `prescription_items` table. All the data in the column will be lost.
  - You are about to drop the column `medicine_id` on the `prescription_items` table. All the data in the column will be lost.
  - You are about to drop the column `medicine_name` on the `prescription_items` table. All the data in the column will be lost.
  - You are about to drop the column `prescription_id` on the `prescription_items` table. All the data in the column will be lost.
  - The `timing` column on the `prescription_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `ai_suggestion_used` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_id` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `patient_id` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `pdf_url` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `visit_id` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_url` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `hospital_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password_hash` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `registration_number` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `users` table. All the data in the column will be lost.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `appointment_id` on the `visits` table. All the data in the column will be lost.
  - You are about to drop the column `chief_complaint` on the `visits` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `visits` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_id` on the `visits` table. All the data in the column will be lost.
  - You are about to drop the column `patient_id` on the `visits` table. All the data in the column will be lost.
  - You are about to drop the column `visited_at` on the `visits` table. All the data in the column will be lost.
  - You are about to drop the column `recorded_at` on the `vitals` table. All the data in the column will be lost.
  - You are about to drop the column `visit_id` on the `vitals` table. All the data in the column will be lost.
  - You are about to alter the column `spo2` on the `vitals` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the `sms_logs` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[phone]` on the table `patients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[visitId]` on the table `prescriptions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[appointmentId]` on the table `visits` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[visitId]` on the table `vitals` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `doctorId` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientId` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledAt` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `brandName` to the `medicines` table without a default value. This is not possible if the table is not empty.
  - Added the required column `genericName` to the `medicines` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `patients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `medicineName` to the `prescription_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prescriptionId` to the `prescription_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `doctorId` to the `prescriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientId` to the `prescriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `visitId` to the `prescriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `doctorId` to the `visits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientId` to the `visits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `visitId` to the `vitals` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'doctor');

-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'no_show';

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "prescription_items" DROP CONSTRAINT "prescription_items_medicine_id_fkey";

-- DropForeignKey
ALTER TABLE "prescription_items" DROP CONSTRAINT "prescription_items_prescription_id_fkey";

-- DropForeignKey
ALTER TABLE "prescriptions" DROP CONSTRAINT "prescriptions_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "prescriptions" DROP CONSTRAINT "prescriptions_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "prescriptions" DROP CONSTRAINT "prescriptions_visit_id_fkey";

-- DropForeignKey
ALTER TABLE "sms_logs" DROP CONSTRAINT "sms_logs_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "visits" DROP CONSTRAINT "visits_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "visits" DROP CONSTRAINT "visits_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "visits" DROP CONSTRAINT "visits_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "vitals" DROP CONSTRAINT "vitals_visit_id_fkey";

-- DropIndex
DROP INDEX "appointments_doctor_id_scheduled_at_idx";

-- DropIndex
DROP INDEX "appointments_patient_id_idx";

-- DropIndex
DROP INDEX "appointments_scheduled_at_idx";

-- DropIndex
DROP INDEX "medicines_brand_name_idx";

-- DropIndex
DROP INDEX "medicines_generic_name_idx";

-- DropIndex
DROP INDEX "patients_name_idx";

-- DropIndex
DROP INDEX "patients_phone_idx";

-- DropIndex
DROP INDEX "prescriptions_doctor_id_idx";

-- DropIndex
DROP INDEX "prescriptions_patient_id_idx";

-- DropIndex
DROP INDEX "prescriptions_visit_id_key";

-- DropIndex
DROP INDEX "visits_appointment_id_key";

-- DropIndex
DROP INDEX "visits_doctor_id_idx";

-- DropIndex
DROP INDEX "visits_patient_id_idx";

-- DropIndex
DROP INDEX "visits_visited_at_idx";

-- DropIndex
DROP INDEX "vitals_visit_id_key";

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "chief_complaint",
DROP COLUMN "created_at",
DROP COLUMN "created_by_id",
DROP COLUMN "doctor_id",
DROP COLUMN "patient_id",
DROP COLUMN "scheduled_at",
DROP COLUMN "updated_at",
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "chiefComplaint" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "doctorId" TEXT NOT NULL,
ADD COLUMN     "patientId" TEXT NOT NULL,
ADD COLUMN     "rescheduledFrom" TIMESTAMP(3),
ADD COLUMN     "scheduledAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "medicines" DROP COLUMN "brand_name",
DROP COLUMN "created_at",
DROP COLUMN "generic_name",
DROP COLUMN "is_active",
ADD COLUMN     "brandName" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "genericName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "patients" DROP COLUMN "blood_group",
DROP COLUMN "chronic_conditions",
DROP COLUMN "created_at",
DROP COLUMN "emergency_contact",
DROP COLUMN "updated_at",
ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "chronicConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "prescription_items" DROP COLUMN "generic_name",
DROP COLUMN "medicine_id",
DROP COLUMN "medicine_name",
DROP COLUMN "prescription_id",
ADD COLUMN     "genericName" TEXT,
ADD COLUMN     "medicineName" TEXT NOT NULL,
ADD COLUMN     "prescriptionId" TEXT NOT NULL,
ALTER COLUMN "frequency" SET DEFAULT 'daily',
DROP COLUMN "timing",
ADD COLUMN     "timing" TEXT NOT NULL DEFAULT 'after_food',
ALTER COLUMN "days" SET DEFAULT 30;

-- AlterTable
ALTER TABLE "prescriptions" DROP COLUMN "ai_suggestion_used",
DROP COLUMN "created_at",
DROP COLUMN "doctor_id",
DROP COLUMN "patient_id",
DROP COLUMN "pdf_url",
DROP COLUMN "visit_id",
ADD COLUMN     "aiSuggestionUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "doctorId" TEXT NOT NULL,
ADD COLUMN     "patientId" TEXT NOT NULL,
ADD COLUMN     "pdfUrl" TEXT,
ADD COLUMN     "visitId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "avatar_url",
DROP COLUMN "created_at",
DROP COLUMN "hospital_id",
DROP COLUMN "is_active",
DROP COLUMN "password_hash",
DROP COLUMN "registration_number",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "registrationNo" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'doctor';

-- AlterTable
ALTER TABLE "visits" DROP COLUMN "appointment_id",
DROP COLUMN "chief_complaint",
DROP COLUMN "created_at",
DROP COLUMN "doctor_id",
DROP COLUMN "patient_id",
DROP COLUMN "visited_at",
ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "chiefComplaint" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "doctorId" TEXT NOT NULL,
ADD COLUMN     "patientId" TEXT NOT NULL,
ADD COLUMN     "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "vitals" DROP COLUMN "recorded_at",
DROP COLUMN "visit_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "visitId" TEXT NOT NULL,
ALTER COLUMN "spo2" SET DATA TYPE INTEGER;

-- DropTable
DROP TABLE "sms_logs";

-- DropEnum
DROP TYPE "MedicineTiming";

-- DropEnum
DROP TYPE "SmsStatus";

-- DropEnum
DROP TYPE "SmsType";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "doctor_availability" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDuration" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doctor_availability_doctorId_dayOfWeek_key" ON "doctor_availability"("doctorId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "patients_phone_key" ON "patients"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_visitId_key" ON "prescriptions"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "visits_appointmentId_key" ON "visits"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "vitals_visitId_key" ON "vitals"("visitId");

-- AddForeignKey
ALTER TABLE "doctor_availability" ADD CONSTRAINT "doctor_availability_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
