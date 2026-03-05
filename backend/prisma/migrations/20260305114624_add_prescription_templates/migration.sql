-- AlterTable
ALTER TABLE "users" ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "PrescriptionTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "watermarkUrl" TEXT,
    "brandColor" TEXT NOT NULL DEFAULT '#0A7B6E',
    "headerStyle" TEXT NOT NULL DEFAULT 'left',
    "paperSize" TEXT NOT NULL DEFAULT 'A4',
    "clinicName" TEXT,
    "clinicAddress" TEXT,
    "clinicContact" TEXT,
    "showVitals" BOOLEAN NOT NULL DEFAULT true,
    "showDiagnosis" BOOLEAN NOT NULL DEFAULT true,
    "showPatientDetails" BOOLEAN NOT NULL DEFAULT true,
    "footerText" TEXT,
    "digitalSignatureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionTemplate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PrescriptionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
