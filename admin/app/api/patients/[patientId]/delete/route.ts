import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { patientId } = await params;

    // Only allow patients to delete their own account, or doctors to delete any patient
    if (auth.role === "patient" && auth.userId !== patientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete all related data for GDPR compliance
    await prisma.$transaction(async (tx) => {
      // Delete messages
      await tx.message.deleteMany({
        where: { patientId },
      });

      // Delete reschedule requests for this patient's appointments
      const appointments = await tx.appointment.findMany({
        where: { patientId },
        select: { id: true },
      });
      const appointmentIds = appointments.map((a) => a.id);
      if (appointmentIds.length > 0) {
        await tx.rescheduleRequest.deleteMany({
          where: { appointmentId: { in: appointmentIds } },
        });
      }

      // Disconnect procedures from appointments (don't delete procedures)
      await tx.procedure.updateMany({
        where: {
          OR: [
            { treatmentPlan: { patientId } },
            { appointment: { patientId } },
          ],
        },
        data: {
          appointmentId: null,
          treatmentPlanId: null,
        },
      });

      // Delete appointments
      await tx.appointment.deleteMany({
        where: { patientId },
      });

      // Delete treatment plans (procedures are already disconnected)
      await tx.treatmentPlan.deleteMany({
        where: { patientId },
      });

      // Finally, delete the patient
      await tx.patient.delete({
        where: { id: patientId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete patient error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
