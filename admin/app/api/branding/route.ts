import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireDoctor, getAuthPayload } from "@/lib/auth";
import {
  buildClinicTheme,
  clinicBrandingToInput,
  mapInputToPrismaData,
  validateBrandingInput,
  defaultBrandingInput,
} from "@/lib/branding";

const prisma = new PrismaClient();

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

    const input = branding
      ? clinicBrandingToInput(branding)
      : defaultBrandingInput;
    const theme = buildClinicTheme(input);

    return NextResponse.json({
      clinicName: input.clinicName,
      logoUrl: input.logoUrl,
      faviconUrl: input.faviconUrl,
      colors: input.colors,
      theme,
      updatedAt: branding?.updatedAt
        ? branding.updatedAt.toISOString()
        : null,
    });
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

    if (
      body.clinicName !== undefined &&
      body.clinicName !== null &&
      body.clinicName.length > 50
    ) {
      return NextResponse.json(
        { error: "Clinic name must be 50 characters or less" },
        { status: 400 }
      );
    }

    const input = validateBrandingInput({
      clinicName: body.clinicName ?? null,
      logoUrl: body.logoUrl ?? null,
      faviconUrl: body.faviconUrl ?? null,
      colors: {
        brand: body?.colors?.brand ?? defaultBrandingInput.colors.brand,
        nav: body?.colors?.nav ?? undefined,
        cta:
          body?.colors?.cta ??
          body?.colors?.brand ??
          defaultBrandingInput.colors.cta,
        highlight: body?.colors?.highlight ?? undefined,
        promo: body?.colors?.promo ?? undefined,
        danger: body?.colors?.danger ?? undefined,
      },
    });

    const prismaData = mapInputToPrismaData(input);

    const branding = await prisma.clinicBranding.upsert({
      where: { doctorId },
      create: { doctorId, ...prismaData },
      update: { ...prismaData, updatedAt: new Date() },
    });

    const updatedInput = clinicBrandingToInput(branding);
    const theme = buildClinicTheme(updatedInput);

    return NextResponse.json({
      success: true,
      branding: {
        clinicName: updatedInput.clinicName,
        logoUrl: updatedInput.logoUrl,
        faviconUrl: updatedInput.faviconUrl,
        colors: updatedInput.colors,
        theme,
        updatedAt: branding.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[Branding] PUT failed:", error);
    return NextResponse.json(
      { error: "Failed to update branding" },
      { status: 500 }
    );
  }
}

