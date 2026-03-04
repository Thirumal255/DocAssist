/*
  Warnings:

  - The values [scheduled,checked_in,consulting,completed,cancelled,no_show] on the enum `AppointmentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `brandName` on the `medicines` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `medicines` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `medicines` table. All the data in the column will be lost.
  - You are about to drop the column `form` on the `medicines` table. All the data in the column will be lost.
  - You are about to drop the column `genericName` on the `medicines` table. All the data in the column will be lost.
  - You are about to drop the column `manufacturer` on the `medicines` table. All the data in the column will be lost.
  - You are about to drop the column `mrp` on the `medicines` table. All the data in the column will be lost.
  - You are about to drop the column `strength` on the `medicines` table. All the data in the column will be lost.
  - Added the required column `name` to the `medicines` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AppointmentStatus_new" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "appointments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "appointments" ALTER COLUMN "status" TYPE "AppointmentStatus_new" USING ("status"::text::"AppointmentStatus_new");
ALTER TYPE "AppointmentStatus" RENAME TO "AppointmentStatus_old";
ALTER TYPE "AppointmentStatus_new" RENAME TO "AppointmentStatus";
DROP TYPE "AppointmentStatus_old";
ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';
COMMIT;

-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "medicines" DROP COLUMN "brandName",
DROP COLUMN "category",
DROP COLUMN "createdAt",
DROP COLUMN "form",
DROP COLUMN "genericName",
DROP COLUMN "manufacturer",
DROP COLUMN "mrp",
DROP COLUMN "strength",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "drug_interactions" JSONB,
ADD COLUMN     "manufacturer_name" TEXT,
ADD COLUMN     "medicine_desc" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "pack_size_label" TEXT,
ADD COLUMN     "salt_composition" TEXT,
ADD COLUMN     "side_effects" TEXT;
