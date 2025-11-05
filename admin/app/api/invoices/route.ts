import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (search) {
      where.procedure = {
        title: {
          contains: search,
          mode: "insensitive",
        },
      };
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        procedure: {
          include: {
            treatmentPlan: {
              include: {
                patient: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate stats
    const total = await prisma.invoice.count();
    const paid = await prisma.invoice.count({ where: { status: "paid" } });
    const unpaid = await prisma.invoice.count({ where: { status: "unpaid" } });

    return NextResponse.json({
      invoices,
      stats: {
        total,
        paid,
        unpaid,
      },
    });
  } catch (error: any) {
    console.error("Get invoices error:", error);
    return NextResponse.json(
      { error: "Failed to get invoices" },
      { status: 500 }
    );
  }
}

