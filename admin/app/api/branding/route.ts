import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireDoctor, getAuthPayload } from "@/lib/auth";

const prisma = new PrismaClient();

const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

function serializeBranding(branding: any) {
  if (!branding) {
    return {
      clinicName: null,
      logoUrl: null,
      primaryColor: null,
      secondaryColor: null,
      accentColor: null,
      faviconUrl: null,
      updatedAt: null,
    };
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

export async function GET(request: NextRequest) {
  try {
    const authPayload = await getAuthPayload(request);
    if (!authPayload || authPayload.role !== "doctor") {
      return NextResponse.json(
        { error: "Unauthorized: Doctor authentication required" },
        { status: 401 }
      );
    }

    const branding = await prisma.clinicBranding.findUnique({
      where: { doctorId: authPayload.userId },
    });

    return NextResponse.json(serializeBranding(branding));
  } catch (error) {
    console.error("[Branding] GET failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch branding" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const doctorId = await requireDoctor(request);
    const body = await request.json();

    const {
      clinicName,
      logoUrl,
      primaryColor,
      secondaryColor,
      accentColor,
      faviconUrl,
    } = body;

    if (clinicName !== undefined && clinicName !== null && clinicName.length > 50) {
      return NextResponse.json(
        { error: "Clinic name must be 50 characters or less" },
        { status: 400 }
      );
    }

    const colorsToValidate = [
      { value: primaryColor, label: "primaryColor" },
      { value: secondaryColor, label: "secondaryColor" },
      { value: accentColor, label: "accentColor" },
    ];

    for (const { value, label } of colorsToValidate) {
      if (value && !hexColorRegex.test(value)) {
        return NextResponse.json(
          { error: `${label} must be a valid hex color` },
          { status: 400 }
        );
      }
    }

    const data: Record<string, string | null | undefined> = {};
    if (clinicName !== undefined) data.clinicName = clinicName || null;
    if (logoUrl !== undefined) data.logoUrl = logoUrl || null;
    if (primaryColor !== undefined) data.primaryColor = primaryColor || null;
    if (secondaryColor !== undefined) data.secondaryColor = secondaryColor || null;
    if (accentColor !== undefined) data.accentColor = accentColor || null;
    if (faviconUrl !== undefined) data.faviconUrl = faviconUrl || null;

    const branding = await prisma.clinicBranding.upsert({
      where: { doctorId },
      create: { doctorId, ...data },
      update: { ...data, updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      branding: serializeBranding(branding),
    });
  } catch (error) {
    console.error("[Branding] PUT failed:", error);
    return NextResponse.json(
      { error: "Failed to update branding" },
      { status: 500 }
    );
  }
}

