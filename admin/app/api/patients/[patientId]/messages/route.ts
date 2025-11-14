import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { broadcast } from "@/lib/events";
import { wsBroadcast } from "@/lib/ws";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const messages = await prisma.message.findMany({
      where: { patientId },
      orderBy: { createdAt: "asc" },
    });

    // Check for cancelled appointments and replace with "Cancelled appointment" title
    const appointmentActions = [
      "view_upcoming_appointments",
      "view_next_appointment",
      "reschedule_appointment",
    ];

    // Fetch all appointments for this patient to check isCancelled
    const appointments = await prisma.appointment.findMany({
      where: { patientId },
      select: { id: true, isCancelled: true, title: true, datetime: true },
    });
    const appointmentMap = new Map(
      appointments.map((apt) => [apt.id, apt])
    );

    const formatDate = (date: Date) => {
      const d = new Date(date);
      return d.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
    };

    const validatedMessages = messages.map((msg) => {
      if (msg.sender !== "doctor") {
        return msg;
      }

      try {
        const parsed = JSON.parse(msg.content);
        if (!parsed?.action || !parsed?.data) {
          return msg;
        }

        if (!appointmentActions.includes(parsed.action)) {
          return msg;
        }

        // Find cancelled appointments
        const appointmentIds = Array.isArray(parsed.data)
          ? parsed.data.map((apt: any) => apt?.id).filter(Boolean)
          : parsed.data?.id
          ? [parsed.data.id]
          : [];

        if (appointmentIds.length > 0) {
          // Check which appointments are cancelled
          const cancelledIds = new Set(
            appointmentIds.filter((id: string) => appointmentMap.get(id)?.isCancelled)
          );

          if (cancelledIds.size > 0) {
            // Only replace if ALL appointments in the message are cancelled
            // If only some are cancelled, keep the message but filter them out
            const allCancelled = cancelledIds.size === appointmentIds.length;

            if (allCancelled) {
              // All appointments are cancelled - replace with cancelled message
              const cancelledAppts = appointmentIds
                .map((id: string) => {
                  const dbApt = appointmentMap.get(id);
                  const originalApt = Array.isArray(parsed.data)
                    ? parsed.data.find((a: any) => a.id === id)
                    : parsed.data;
                  return dbApt?.isCancelled && originalApt
                    ? { ...originalApt, ...dbApt }
                    : null;
                })
                .filter(Boolean);

              let cancelledTitle = "";
              if (cancelledAppts.length === 1) {
                const apt = cancelledAppts[0];
                const dateStr = apt.datetime ? formatDate(apt.datetime) : "";
                const title = apt.title || "Appointment";
                cancelledTitle = `Appointment for ${title}${dateStr ? ` on ${dateStr}` : ""} was cancelled.`;
              } else if (cancelledAppts.length > 1) {
                cancelledTitle = `${cancelledAppts.length} appointments were cancelled.`;
              }

              return {
                ...msg,
                content: JSON.stringify({
                  ...parsed,
                  title: cancelledTitle || "Cancelled appointment",
                  data: null,
                }),
              };
            } else {
              // Some appointments are cancelled - filter them out, keep active ones
              const filteredData = Array.isArray(parsed.data)
                ? parsed.data.filter((apt: any) => !cancelledIds.has(apt.id))
                : cancelledIds.has(parsed.data?.id)
                ? null
                : parsed.data;

              // If no active appointments left, use empty state message
              const isEmpty =
                !filteredData ||
                (Array.isArray(filteredData) && filteredData.length === 0);
              const emptyStateMessages: Record<string, string> = {
                view_upcoming_appointments: "No appointments found",
                view_next_appointment: "No appointments found",
                reschedule_appointment: "No appointments found",
              };

              return {
                ...msg,
                content: JSON.stringify({
                  ...parsed,
                  title: isEmpty && emptyStateMessages[parsed.action]
                    ? emptyStateMessages[parsed.action]
                    : parsed.title,
                  data: filteredData,
                }),
              };
            }
          }
        }

        return msg;
      } catch (e) {
        // Not JSON, return as is
        return msg;
      }
    });

    return NextResponse.json({ messages: validatedMessages });
  } catch (error: any) {
    console.error("Messages GET error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch messages",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const { sender, content, manual } = await req.json();
    const message = await prisma.message.create({
      data: {
        patientId,
        sender,
        content,
        manual: Boolean(manual),
      },
    });
    broadcast("message.new", { message }, { patientId });
    wsBroadcast("message.new", { message }, { patientId });
    return NextResponse.json({ message });
  } catch (error: any) {
    console.error("Messages POST error:", error);
    return NextResponse.json(
      {
        error: "Failed to create message",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;

    // Delete all messages for this patient
    await prisma.message.deleteMany({
      where: { patientId },
    });

    // Emit socket event to notify both doctor and patient
    const io = (global as any).__io;
    if (io) {
      io.to(`patient:${patientId}`).emit("messages:cleared", { patientId });
      io.to(`doctor:*`).emit("messages:cleared", { patientId });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Messages DELETE error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete messages",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
