import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDoctor } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    await requireDoctor(req);

    const { patientId } = await params;

    // For now, return null as discount is stored in patient's localStorage
    // In the future, this should be stored in the database
    // TODO: Add discount field to Patient model in Prisma schema
    
    return NextResponse.json({ 
      activeDiscount: null,
      discount: null 
    });
  } catch (error: any) {
    console.error("Get patient discount error:", error);
    return NextResponse.json(
      { error: "Failed to get patient discount" },
      { status: 500 }
    );
  }
}

