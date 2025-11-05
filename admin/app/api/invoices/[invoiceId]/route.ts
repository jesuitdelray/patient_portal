import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !["unpaid", "paid"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'unpaid' or 'paid'" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
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

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status,
        ...(status === "paid" && !invoice.paidAt
          ? { paidAt: new Date() }
          : {}),
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
    if (io && updated.procedure.treatmentPlan?.patient) {
      const patientId = updated.procedure.treatmentPlan.patient.id;
      io.to(`patient:${patientId}`).emit("invoice:paid", {
        invoice: updated,
      });
      io.to("admin").emit("invoice:paid", {
        invoice: updated,
      });
    }

    return NextResponse.json({ invoice: updated });
  } catch (error: any) {
    console.error("Update invoice error:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
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

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ invoice });
  } catch (error: any) {
    console.error("Get invoice error:", error);
    return NextResponse.json(
      { error: "Failed to get invoice" },
      { status: 500 }
    );
  }
}


