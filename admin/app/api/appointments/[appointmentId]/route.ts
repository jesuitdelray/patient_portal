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

    // Get appointment details before marking as cancelled
    const appointmentDetails = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { title: true, datetime: true },
    });

    // Mark appointment as cancelled instead of deleting
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { isCancelled: true },
    });

    // Update messages in DB with cancelled appointment info
    const messages = await prisma.message.findMany({
      where: { patientId: appointment.patientId, sender: "doctor" },
    });

    const appointmentActions = [
      "view_upcoming_appointments",
      "view_next_appointment",
      "reschedule_appointment",
    ];

    const formatDate = (date: Date) => {
      const d = new Date(date);
      return d.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
    };

    const cancelledTitle = appointmentDetails
      ? `Appointment for ${appointmentDetails.title || "Appointment"}${
          appointmentDetails.datetime
            ? ` on ${formatDate(appointmentDetails.datetime)}`
            : ""
        } was cancelled.`
      : "Cancelled appointment";

    for (const msg of messages) {
      try {
        const parsed = JSON.parse(msg.content);
        if (!parsed?.action || !parsed?.data) continue;
        if (!appointmentActions.includes(parsed.action)) continue;

        // Check if this message contains the cancelled appointment
        const appointmentIds = Array.isArray(parsed.data)
          ? parsed.data.map((apt: any) => apt?.id).filter(Boolean)
          : parsed.data?.id
          ? [parsed.data.id]
          : [];

        const hasCancelledAppointment = appointmentIds.includes(appointmentId);

        if (hasCancelledAppointment) {
          // Check if this is the only appointment in the message
          const isOnlyAppointment = appointmentIds.length === 1;

          let updatedContent;
          if (isOnlyAppointment) {
            // Only one appointment - replace with cancelled message
            updatedContent = JSON.stringify({
              ...parsed,
              title: cancelledTitle,
              data: null,
            });
          } else {
            // Multiple appointments - filter out the cancelled one, keep the rest
            const filteredData = Array.isArray(parsed.data)
              ? parsed.data.filter((apt: any) => apt.id !== appointmentId)
              : null;

            // Check if any appointments remain
            const isEmpty =
              !filteredData ||
              (Array.isArray(filteredData) && filteredData.length === 0);

            const emptyStateMessages: Record<string, string> = {
              view_upcoming_appointments: "No appointments found",
              view_next_appointment: "No appointments found",
              reschedule_appointment: "No appointments found",
            };

            updatedContent = JSON.stringify({
              ...parsed,
              title: isEmpty && emptyStateMessages[parsed.action]
                ? emptyStateMessages[parsed.action]
                : parsed.title,
              data: filteredData,
            });
          }

          const updatedMessage = await prisma.message.update({
            where: { id: msg.id },
            data: {
              content: updatedContent,
            },
          });

          // Emit updated message through socket
          const io = (global as any).__io;
          if (io) {
            io.to(`patient:${appointment.patientId}`).emit("message:update", {
              message: updatedMessage,
            });
          }
        }
      } catch (e) {
        // Not JSON, skip
      }
    }

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
