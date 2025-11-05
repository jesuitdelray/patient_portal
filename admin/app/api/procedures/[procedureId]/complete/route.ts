import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ procedureId: string }> }
) {
  try {
    const { procedureId } = await params;

    const procedure = await prisma.procedure.findUnique({
      where: { id: procedureId },
      include: {
        treatmentPlan: {
          include: {
            patient: true,
          },
        },
      },
    });

    if (!procedure) {
      return NextResponse.json(
        { error: "Procedure not found" },
        { status: 404 }
      );
    }

    if (procedure.status === "completed") {
      return NextResponse.json(
        { error: "Procedure already completed" },
        { status: 400 }
      );
    }

    const updated = await prisma.procedure.update({
      where: { id: procedureId },
      data: {
        status: "completed",
        completedDate: new Date(),
      },
      include: {
        treatmentPlan: {
          include: {
            patient: true,
          },
        },
      },
    });

    // Emit socket event
    const io = (global as any).__io;
    if (io && updated.treatmentPlan?.patient) {
      io.to(`patient:${updated.treatmentPlan.patient.id}`).emit(
        "procedure:completed",
        {
          procedure: updated,
        }
      );
      io.to("admin").emit("procedure:completed", {
        procedure: updated,
      });
    }

    return NextResponse.json({ procedure: updated });
  } catch (error: any) {
    console.error("Complete procedure error:", error);
    return NextResponse.json(
      { error: "Failed to complete procedure" },
      { status: 500 }
    );
  }
}


