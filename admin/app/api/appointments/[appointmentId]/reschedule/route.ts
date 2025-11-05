import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { broadcast } from "@/lib/events";
import { getIO } from "@/lib/io";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const { appointmentId } = await params;
  const { datetime } = await req.json();
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { datetime: new Date(datetime) },
  });
  broadcast(
    "appointment.update",
    { appointment: updated },
    { patientId: updated.patientId }
  );
  try {
    const io = getIO();
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
  } catch {}
  return Response.json({ appointment: updated });
}
