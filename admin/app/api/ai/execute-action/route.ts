import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { getIO } from "@/lib/io";

export async function POST(req: NextRequest) {
  try {
    const { action, appointmentId, newDateTime, confirmed } = await req.json();
    
    if (!action || !appointmentId) {
      return NextResponse.json(
        { error: "Action and appointmentId are required" },
        { status: 400 }
      );
    }

    // Get patient ID from auth
    const authPayload = await getAuthPayload(req);
    if (!authPayload || authPayload.role !== "patient" || !authPayload.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const patientId = authPayload.userId;

    // Get appointment to verify it belongs to the patient
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        patientId: true,
        title: true,
        datetime: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    if (appointment.patientId !== patientId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Execute action
    let result;
    const now = new Date();
    const io = getIO();

    if (action === "reschedule_appointment") {
      if (!newDateTime || !confirmed) {
        return NextResponse.json(
          { error: "newDateTime and confirmed are required for reschedule" },
          { status: 400 }
        );
      }

      const newDate = new Date(newDateTime);
      
      // Check if date is in the past
      if (newDate < now) {
        // Find next available appointment slot (example: next day after today)
        const nextAvailable = new Date(now);
        nextAvailable.setDate(nextAvailable.getDate() + 1);
        nextAvailable.setHours(10, 0, 0, 0); // 10 AM

        return NextResponse.json({
          success: false,
          error: "date_in_past",
          message: "The requested date is in the past. I can suggest the next available date.",
          suggestedDate: nextAvailable.toISOString(),
        });
      }

      // Update appointment
      const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { datetime: newDate },
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

      // Emit socket event
      if (io) {
        io.to(`patient:${patientId}`).emit("appointment:update", {
          appointment: updated,
          by: "patient",
        });
        io.to("admin").emit("appointment:update", {
          appointment: updated,
          by: "patient",
        });
      }

      result = {
        success: true,
        appointment: updated,
        message: `Appointment "${updated.title}" has been rescheduled to ${newDate.toLocaleDateString()} at ${newDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      };
    } else if (action === "cancel_appointment") {
      if (!confirmed) {
        return NextResponse.json(
          { error: "confirmed is required for cancel" },
          { status: 400 }
        );
      }

      // Delete appointment
      await prisma.appointment.delete({
        where: { id: appointmentId },
      });

      // Emit socket event
      if (io) {
        io.to(`patient:${patientId}`).emit("appointment:cancelled", {
          appointmentId,
          by: "patient",
        });
        io.to("admin").emit("appointment:cancelled", {
          appointmentId,
          patientId,
          by: "patient",
        });
      }

      result = {
        success: true,
        message: `Appointment "${appointment.title}" has been cancelled.`,
      };
    } else {
      return NextResponse.json(
        { error: "Unknown action" },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Execute action error:", error);
    return NextResponse.json(
      { error: "Failed to execute action", details: error?.message },
      { status: 500 }
    );
  }
}

