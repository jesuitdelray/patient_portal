import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDoctor } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    await requireDoctor(req);
    const { patientId } = await params;
    const body = await req.json();
    const { password, email } = body || {};

    if (!password && !email) {
      return NextResponse.json(
        { error: "Nothing to update" },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};

    if (email) {
      updateData.email = email.trim().toLowerCase();
    }

    if (password) {
      if (typeof password !== "string" || password.trim().length < 6) {
        return NextResponse.json(
          {
            error: "Password must be at least 6 characters long",
          },
          { status: 400 }
        );
      }
      const hashed = await bcrypt.hash(password.trim(), 10);
      updateData.password = hashed;
    }

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: updateData,
      select: { id: true, email: true },
    });

    return NextResponse.json({ success: true, patient: updated });
  } catch (error: any) {
    console.error("Update patient credentials error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to update patient credentials",
      },
      { status: 500 }
    );
  }
}

