import { prisma } from "@/lib/db";

export async function ensureDefaultTreatmentPlan(patientId: string) {
  if (!patientId) return;

  const existingPlans = await prisma.treatmentPlan.count({
    where: { patientId },
  });

  if (existingPlans > 0) return;

  await prisma.treatmentPlan.create({
    data: {
      patientId,
      title: "Comprehensive Smile Plan",
      status: "active",
      steps: [
        {
          title: "Initial Wellness Check",
          description: "Baseline oral health assessment and X-rays.",
          status: "completed",
        },
        {
          title: "Deep Cleaning Session",
          description: "Scheduled cleaning to remove plaque build-up.",
          status: "scheduled",
        },
        {
          title: "Whitening & Follow-up",
          description: "Whitening treatment and final review with dentist.",
          status: "upcoming",
        },
      ],
      procedures: {
        create: [
          {
            title: "Initial Consultation",
            description: "Comprehensive exam with photos and X-rays.",
            status: "completed",
            completedDate: new Date(),
          },
          {
            title: "Professional Cleaning",
            description: "Remove plaque build-up and polish teeth.",
            status: "planned",
            scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
          {
            title: "Whitening Session",
            description: "In-office whitening to brighten your smile.",
            status: "planned",
            scheduledDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });
}

