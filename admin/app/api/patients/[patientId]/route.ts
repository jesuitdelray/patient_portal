import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        doctorLinks: {
          include: {
            doctor: {
              select: {
                id: true,
                name: true,
                email: true,
                picture: true,
              },
            },
          },
        },
      },
    });
    
    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }
    
    const doctor = patient?.doctorLinks?.[0]?.doctor || null;
    
    const plans = await prisma.treatmentPlan.findMany({
      where: { patientId },
      include: {
        procedures: {
          include: {
            appointment: {
              select: {
                id: true,
                title: true,
                datetime: true,
              },
            },
            invoice: {
              select: {
                id: true,
                amount: true,
                status: true,
              },
            },
          },
          orderBy: [{ phase: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const appointments = await prisma.appointment.findMany({
      where: { patientId },
      include: {
        procedures: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
          },
        },
      },
      orderBy: { datetime: "asc" },
    });
    const messages = await prisma.message.findMany({
      where: { patientId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ patient, doctor, plans, appointments, messages });
  } catch (error: any) {
    console.error("Patient detail API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch patient data",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
