-- Prescription suggestions: trigram search, medicine links, learning loop.

-- Trigram matching for fast, typo-tolerant search (supported on Cloud SQL).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "SuggestionKind" AS ENUM ('medicine_search', 'dose_default', 'diagnosis_regimen', 'ai_regimen', 'safety_warning');

-- CreateEnum
CREATE TYPE "SuggestionOutcome" AS ENUM ('accepted', 'edited', 'rejected', 'ignored');

-- AlterTable: notes were sent by the app but had no column, which made
-- prescription creation fail whenever a note was included.
ALTER TABLE "prescriptions" ADD COLUMN "notes" TEXT;

-- AlterTable
ALTER TABLE "prescription_items" ADD COLUMN "medicineId" TEXT;

-- Backfill: link existing items to the medicine database by exact name.
UPDATE "prescription_items" pi
SET "medicineId" = m."id"
FROM "medicines" m
WHERE pi."medicineId" IS NULL AND lower(pi."medicineName") = lower(m."name");

-- CreateTable
CREATE TABLE "suggestion_events" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT,
    "kind" "SuggestionKind" NOT NULL,
    "outcome" "SuggestionOutcome" NOT NULL,
    "suggestion" JSONB NOT NULL,
    "final" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggestion_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suggestion_events_doctorId_kind_createdAt_idx" ON "suggestion_events"("doctorId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "medicines_name_idx" ON "medicines" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "medicines_salt_composition_idx" ON "medicines" USING GIN ("salt_composition" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "prescriptions_doctorId_createdAt_idx" ON "prescriptions"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "prescriptions_patientId_createdAt_idx" ON "prescriptions"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "prescriptions_diagnosis_idx" ON "prescriptions" USING GIN ("diagnosis" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "prescription_items_prescriptionId_idx" ON "prescription_items"("prescriptionId");

-- CreateIndex
CREATE INDEX "prescription_items_medicineId_idx" ON "prescription_items"("medicineId");

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestion_events" ADD CONSTRAINT "suggestion_events_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
