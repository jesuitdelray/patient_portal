import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;
  try {
    const plans = await prisma.treatmentPlan.findMany({
      where: { patientId },
      include: {
        procedures: {
          include: {
            invoice: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ plans });
  } catch (error) {
    console.error("Treatment plans API error:", error);
    return new Response(JSON.stringify({ error: "Database unavailable" }), {
      status: 500,
    });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;
  try {
    const body = await req.json();
    const { title, status, steps } = body;

    if (!title) {
      return new Response(JSON.stringify({ error: "Title is required" }), {
        status: 400,
      });
    }

    const plan = await prisma.treatmentPlan.create({
      data: {
        patientId,
        title,
        status: status || "active",
        steps: steps || {},
      },
      include: {
        procedures: true,
      },
    });

    return Response.json({ plan });
  } catch (error: any) {
    console.error("Create treatment plan error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create treatment plan" }),
      { status: 500 }
    );
  }
}
