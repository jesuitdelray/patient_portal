import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const { appointmentId } = await params;
  try {
    const body = await req.json();
    const { title, datetime, location, type } = body;

    // Get appointment before updating to get patientId
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { patientId: true },
    });

    if (!existingAppointment) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
      });
    }

    // Update the appointment
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        ...(title && { title }),
        ...(datetime && { datetime: new Date(datetime) }),
        ...(location !== undefined && { location }),
        ...(type && { type }),
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

    // Emit socket event for real-time updates
    const io = (global as any).__io;
    if (io) {
      io.to(`patient:${updated.patientId}`).emit("appointment:update", {
        appointment: updated,
        by: "doctor",
      });
      io.to("admin").emit("appointment:update", {
        appointment: updated,
        by: "doctor",
      });
    }

    return Response.json({ appointment: updated });
  } catch (error: any) {
    console.error("Update appointment error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update appointment" }),
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const { appointmentId } = await params;
  try {
    // Get appointment before deleting to get patientId
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { patientId: true },
    });

    if (!appointment) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404,
      });
    }

    // Delete the appointment
    await prisma.appointment.delete({
      where: { id: appointmentId },
    });

    // Emit socket event for real-time updates
    const io = (global as any).__io;
    if (io) {
      io.to(`patient:${appointment.patientId}`).emit("appointment:cancelled", {
        appointmentId,
      });
      io.to("admin").emit("appointment:cancelled", {
        appointmentId,
        patientId: appointment.patientId,
      });
    }

    return Response.json({ success: true });
  } catch (error: any) {
    console.error("Delete appointment error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete appointment" }),
      { status: 500 }
    );
  }
}
