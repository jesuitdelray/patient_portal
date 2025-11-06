import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDoctor } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDoctor(req);

    const { id } = await params;
    const body = await req.json();

    const updated = await (prisma as any).priceList.update({
      where: { id },
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

    return NextResponse.json({ item: updated });
  } catch (error: any) {
    console.error("Update price list item error:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireDoctor(req);

    const { id } = await params;

    await (prisma as any).priceList.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete price list item error:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}

