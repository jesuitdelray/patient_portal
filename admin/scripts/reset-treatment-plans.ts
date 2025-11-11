import { PrismaClient } from "@prisma/client";
import { ensureDefaultTreatmentPlan } from "../lib/default-treatment-plan";

const prisma = new PrismaClient();

async function resetTreatmentPlans() {
  console.log("[ResetTreatmentPlans] Fetching patients...");
  const patients = await prisma.patient.findMany({
    select: { id: true, email: true, name: true },
  });

  console.log(
    `[ResetTreatmentPlans] Found ${patients.length} patient(s). Resetting plans...`
  );

  for (const patient of patients) {
    const { id, email, name } = patient;
    const label = email || name || id;

    try {
      console.log(`[ResetTreatmentPlans] Clearing plans for ${label}`);

      await prisma.procedure.deleteMany({
        where: {
          treatmentPlan: {
            patientId: id,
          },
        },
      });

      await prisma.treatmentPlan.deleteMany({
        where: { patientId: id },
      });

      await ensureDefaultTreatmentPlan(id);
      console.log(`[ResetTreatmentPlans] Applied default plan for ${label}`);
    } catch (error) {
      console.error(
        `[ResetTreatmentPlans] Failed for ${label}:`,
        (error as Error)?.message ?? error
      );
    }
  }
}

resetTreatmentPlans()
  .catch((error) => {
    console.error("[ResetTreatmentPlans] Unexpected error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("[ResetTreatmentPlans] Done.");
  });

