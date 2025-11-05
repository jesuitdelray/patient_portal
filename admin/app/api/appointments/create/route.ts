import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, title, datetime, location, type, treatmentPlanId } =
      body;

    if (!patientId || !title || !datetime || !type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        title,
        datetime: new Date(datetime),
        location: location || null,
        type,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If treatmentPlanId is provided, link it (we'll update schema later if needed)
    // For now, we'll just create the appointment

    // Emit socket event for real-time updates
    const io = (global as any).__io;
    if (io) {
      // Emit appointment:new for new appointments
      io.to(`patient:${patientId}`).emit("appointment:new", {
        appointment,
        by: "doctor",
      });
      io.to("admin").emit("appointment:new", {
        appointment,
        by: "doctor",
      });
    }

    return Response.json({ appointment });
  } catch (error: any) {
    console.error("Create appointment error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create appointment" }),
      { status: 500 }
    );
  }
}
