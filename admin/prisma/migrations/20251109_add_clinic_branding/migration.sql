-- CreateTable
CREATE TABLE "ClinicBranding" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "clinicName" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "faviconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicBranding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClinicBranding_doctorId_key" ON "ClinicBranding"("doctorId");

-- CreateIndex
CREATE INDEX "ClinicBranding_doctorId_idx" ON "ClinicBranding"("doctorId");

-- AddForeignKey
ALTER TABLE "ClinicBranding" ADD CONSTRAINT "ClinicBranding_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

