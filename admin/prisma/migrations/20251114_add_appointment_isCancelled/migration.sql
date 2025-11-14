-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "isCancelled" BOOLEAN NOT NULL DEFAULT false;

