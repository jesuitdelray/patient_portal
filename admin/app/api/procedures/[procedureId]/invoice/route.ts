import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ procedureId: string }> }
) {
  try {
    const { procedureId } = await params;
    const body = await req.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Amount is required and must be positive" },
        { status: 400 }
      );
    }

    const procedure = await prisma.procedure.findUnique({
      where: { id: procedureId },
      include: {
        treatmentPlan: {
          include: {
            patient: true,
          },
        },
        invoice: true,
      },
    });

    if (!procedure) {
      return NextResponse.json(
        { error: "Procedure not found" },
        { status: 404 }
      );
    }

    if (procedure.status !== "completed") {
      return NextResponse.json(
        { error: "Procedure must be completed before creating invoice" },
        { status: 400 }
      );
    }

    if (procedure.invoice) {
      return NextResponse.json(
        { error: "Invoice already exists for this procedure" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.create({
      data: {
        procedureId,
        amount: parseFloat(amount),
        status: "unpaid",
      },
      include: {
        procedure: {
          include: {
            treatmentPlan: {
              include: {
                patient: true,
              },
            },
          },
        },
      },
    });

    // Emit socket event
    const io = (global as any).__io;
    if (io && invoice.procedure.treatmentPlan?.patient) {
      const patientId = invoice.procedure.treatmentPlan.patient.id;
      io.to(`patient:${patientId}`).emit("invoice:created", {
        invoice,
      });
      io.to("admin").emit("invoice:created", {
        invoice,
      });
    }

    return NextResponse.json({ invoice });
  } catch (error: any) {
    console.error("Create invoice error:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}


