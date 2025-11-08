-- AlterTable
ALTER TABLE "ClinicBranding"
  DROP COLUMN "primaryColor",
  DROP COLUMN "secondaryColor",
  DROP COLUMN "accentColor",
  ADD COLUMN "brandColor" TEXT,
  ADD COLUMN "navColor" TEXT,
  ADD COLUMN "ctaColor" TEXT,
  ADD COLUMN "highlightColor" TEXT,
  ADD COLUMN "promoColor" TEXT,
  ADD COLUMN "dangerColor" TEXT;

