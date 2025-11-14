import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const status = searchParams.get("status") || "all"; // all, upcoming, past, missed
  const patientId = searchParams.get("patientId");

  try {
    const where: any = {
      // Include cancelled appointments for admin view
      // Frontend can filter them if needed
    };

    // Filter by patientId if provided
    if (patientId) {
      where.patientId = patientId;
    }

    // Search by patient name or email
    if (search) {
      where.patient = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    // Filter by status
    const now = new Date();
    if (status === "upcoming") {
      where.datetime = { gte: now };
    } else if (status === "past") {
      where.datetime = { lt: now };
    } else if (status === "missed") {
      // Missed: past appointments without reschedule requests or with declined requests
      where.datetime = { lt: now };
      where.NOT = {
        requests: {
          some: {
            status: { in: ["approved", "pending"] },
          },
        },
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
          },
        },
        requests: {
          where: {
            status: "pending",
          },
          orderBy: {
            requestedAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        datetime: "desc",
      },
    });

    // Calculate statistics
    const allAppointments = await prisma.appointment.findMany({
      select: {
        datetime: true,
        requests: {
          select: {
            status: true,
          },
        },
      },
    });

    const scheduled = allAppointments.length;
    const upcoming = allAppointments.filter(
      (apt) => new Date(apt.datetime) > now
    ).length;
    const missed = allAppointments.filter((apt) => {
      const aptDate = new Date(apt.datetime);
      return (
        aptDate < now &&
        !apt.requests.some(
          (r) => r.status === "approved" || r.status === "pending"
        )
      );
    }).length;
    const completed = allAppointments.filter((apt) => {
      const aptDate = new Date(apt.datetime);
      return aptDate < now && apt.requests.some((r) => r.status === "approved");
    }).length;

    return Response.json({
      appointments,
      stats: {
        scheduled,
        upcoming,
        missed,
        completed,
      },
    });
  } catch (error) {
    console.error("Appointments API error:", error);
    return new Response(JSON.stringify({ error: "Database unavailable" }), {
      status: 500,
    });
  }
}
