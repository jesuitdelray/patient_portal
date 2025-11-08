import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthPayload } from "@/lib/auth";

const prisma = new PrismaClient();

const EMPTY_BRANDING = {
  clinicName: null,
  logoUrl: null,
  primaryColor: null,
  secondaryColor: null,
  accentColor: null,
  faviconUrl: null,
  updatedAt: null,
};

function serializeBranding(branding: any) {
  if (!branding) {
    return EMPTY_BRANDING;
  }

  return {
    clinicName: branding.clinicName || null,
    logoUrl: branding.logoUrl || null,
    primaryColor: branding.primaryColor || null,
    secondaryColor: branding.secondaryColor || null,
    accentColor: branding.accentColor || null,
    faviconUrl: branding.faviconUrl || null,
    updatedAt: branding.updatedAt ? branding.updatedAt.toISOString() : null,
  };
}

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
    return serializeBranding(doctorLink.doctor.branding);
  }

  const fallback = await prisma.clinicBranding.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  return serializeBranding(fallback);
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

    if (!patientId || patientId === "public") {
      const fallback = await prisma.clinicBranding.findFirst({
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json(serializeBranding(fallback));
    }

    const branding = await getBrandingForPatient(patientId);
    return NextResponse.json(branding);
  } catch (error) {
    console.error("[Patient Branding] GET failed:", error);
    return NextResponse.json(EMPTY_BRANDING);
  }
}

