import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDoctor } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.trim() || "";
    const includeInactive = searchParams.get("includeInactive") === "true"; // For admin panel

    const where: any = {};

    // Only filter by isActive for patient-facing requests (not admin)
    if (!includeInactive) {
      where.isActive = true;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const priceList = await (prisma as any).priceList.findMany({
      where,
      orderBy: [{ order: "asc" }, { category: "asc" }, { title: "asc" }],
    });

    // Group by category
    const grouped = priceList.reduce(
      (acc: Record<string, any[]>, item: any) => {
        const cat = item.category || "Other";
        if (!acc[cat]) {
          acc[cat] = [];
        }
        acc[cat].push(item);
        return acc;
      },
      {} as Record<string, any[]>
    );

    // Get unique categories
    const categories = Array.from(
      new Set(priceList.map((item: any) => item.category || "Other"))
    ).sort();

    return NextResponse.json({
      priceList,
      grouped,
      categories,
    });
  } catch (error: any) {
    console.error("Price list API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch price list",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireDoctor(req);

    const body = await req.json();

    const newItem = await (prisma as any).priceList.create({
      data: {
        title: body.title,
        description: body.description || null,
        price: body.price,
        category: body.category || null,
        duration: body.duration || null,
        order: body.order || 0,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    });

    return NextResponse.json({ item: newItem });
  } catch (error: any) {
    console.error("Create price list item error:", error);
    return NextResponse.json(
      { error: "Failed to create item" },
      { status: 500 }
    );
  }
}
