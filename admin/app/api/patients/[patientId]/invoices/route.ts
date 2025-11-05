import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;

    // Get all procedures for this patient through treatment plans
    const procedures = await prisma.procedure.findMany({
      where: {
        treatmentPlan: {
          patientId,
        },
      },
      include: {
        invoice: true,
        treatmentPlan: {
          include: {
            patient: true,
          },
        },
      },
    });

    const invoices = procedures
      .filter((p) => p.invoice)
      .map((p) => ({
        ...p.invoice!,
        procedure: {
          id: p.id,
          title: p.title,
          description: p.description,
          completedDate: p.completedDate,
        },
      }));

    return NextResponse.json({ invoices });
  } catch (error: any) {
    console.error("Get patient invoices error:", error);
    return NextResponse.json(
      { error: "Failed to get invoices" },
      { status: 500 }
    );
  }
}


