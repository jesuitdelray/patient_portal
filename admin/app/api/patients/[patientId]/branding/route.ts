import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import {
  buildClinicTheme,
  clinicBrandingToInput,
  defaultBrandingInput,
} from "@/lib/branding";

async function getBrandingForPatient(patientId: string) {
  const doctorLink = await prisma.doctorPatient.findFirst({
    where: { patientId },
    include: {
      doctor: {
        include: {
          branding: true,
        },
      },
    },
  });

  if (doctorLink?.doctor?.branding) {
    return doctorLink.doctor.branding;
  }

  return await prisma.clinicBranding.findFirst({
    orderBy: { updatedAt: "desc" },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const auth = await getAuthPayload(request);

    if (auth && auth.role === "patient" && auth.userId !== patientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let brandingRecord = null;

    if (patientId && patientId !== "public") {
      brandingRecord = await getBrandingForPatient(patientId);
    } else {
      brandingRecord = await prisma.clinicBranding.findFirst({
        orderBy: { updatedAt: "desc" },
      });
    }

    const brandingInput = brandingRecord
      ? clinicBrandingToInput(brandingRecord)
      : defaultBrandingInput;
    const theme = buildClinicTheme(brandingInput);

    return NextResponse.json({
      clinicName: brandingInput.clinicName,
      logoUrl: brandingInput.logoUrl,
      faviconUrl: brandingInput.faviconUrl,
      colors: brandingInput.colors,
      theme,
      updatedAt: brandingRecord?.updatedAt
        ? brandingRecord.updatedAt.toISOString()
        : null,
    });
  } catch (error) {
    console.error("[Patient Branding] GET failed:", error);
    const theme = buildClinicTheme(defaultBrandingInput);
    return NextResponse.json({
      clinicName: defaultBrandingInput.clinicName,
      logoUrl: defaultBrandingInput.logoUrl,
      faviconUrl: defaultBrandingInput.faviconUrl,
      colors: defaultBrandingInput.colors,
      theme,
      updatedAt: null,
      error: "Failed to fetch branding",
    });
  }
}
