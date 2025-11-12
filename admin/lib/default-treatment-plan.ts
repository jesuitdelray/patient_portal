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
      title: "Comprehensive restoration",
      status: "presented",
      steps: {
        description: "Mr. Wilson presents with moderate decay on teeth #19 and #30, and a fractured tooth #14 requiring endodontic therapy and crown restoration. The treatment plan is designed to address the most urgent needs first (decay), followed by the more complex root canal and crown procedure.\n\nPatient has expressed interest in whitening options after restorative work is complete - this can be discussed during the follow-up appointment. Patient should maintain good oral hygiene throughout the treatment process, with special attention to flossing around the new crown once placed.",
        phases: [
          {
            title: "Phase 1",
            description: "Initial assessment and diagnostics",
            weeks: "Weeks 1-2",
          },
          {
            title: "Phase 2: Restorative Work",
            description: "Addressing decay and cavities",
            weeks: "Weeks 3-4",
          },
          {
            title: "Phase 3: Major Restoration",
            description: "Root canal and crown placement",
            weeks: "Weeks 5-8",
          },
        ],
      },
      procedures: {
        create: [
          // Phase 1
          {
            title: "D1110 Prophylaxis - adult",
            description: "Tooth 21 - Professional cleaning and oral hygiene assessment",
            status: "completed",
            completedDate: new Date(),
            phase: 1,
            tooth: "21",
            price: 95.0,
            discount: 10.0,
            quantity: 1,
          },
          {
            title: "D0210 Full mouth X-ray",
            description: "Tooth 21 - Complete radiographic examination",
            status: "planned",
            phase: 1,
            tooth: "21",
            price: 95.0,
            discount: 10.0,
            quantity: 1,
          },
          {
            title: "D0150 Comprehensive oral evaluation",
            description: "Tooth 21 - Complete dental examination and treatment planning",
            status: "planned",
            phase: 1,
            tooth: "21",
            price: 95.0,
            discount: 10.0,
            quantity: 1,
          },
          // Phase 2
          {
            title: "D0150 Resin-based composite - two surfaces, posterior",
            description: "Tooth 19 - Composite filling for two-surface cavity",
            status: "planned",
            phase: 2,
            tooth: "19",
            price: 200.0,
            discount: 10.0,
            quantity: 1,
          },
          {
            title: "D0210 Resin-based composite - one surface, posterior",
            description: "Tooth 30 - Composite filling for single-surface cavity",
            status: "planned",
            phase: 2,
            tooth: "30",
            price: 180.0,
            discount: 10.0,
            quantity: 1,
          },
          // Phase 3
          {
            title: "D0210 Prefabricated post and core",
            description: "Tooth 14 - Post placement for crown foundation",
            status: "planned",
            phase: 3,
            tooth: "14",
            price: 350.0,
            discount: 10.0,
            quantity: 1,
          },
          {
            title: "D0150 Root canal therapy - molar",
            description: "Tooth 14 - Endodontic treatment for infected tooth",
            status: "planned",
            phase: 3,
            tooth: "14",
            price: 800.0,
            discount: 10.0,
            quantity: 1,
          },
          {
            title: "D0210 Crown - porcelain fused to high noble metal",
            description: "Tooth 14 - Porcelain crown restoration",
            status: "planned",
            phase: 3,
            tooth: "14",
            price: 1200.0,
            discount: 10.0,
            quantity: 1,
          },
        ],
      },
    },
  });
}

