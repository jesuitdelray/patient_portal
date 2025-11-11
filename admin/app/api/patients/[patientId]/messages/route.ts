import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { broadcast } from "@/lib/events";
import { wsBroadcast } from "@/lib/ws";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const messages = await prisma.message.findMany({
      where: { patientId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("Messages GET error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch messages",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const { sender, content, manual } = await req.json();
    const message = await prisma.message.create({
      data: {
        patientId,
        sender,
        content,
        manual: Boolean(manual),
      },
    });
    broadcast("message.new", { message }, { patientId });
    wsBroadcast("message.new", { message }, { patientId });
    return NextResponse.json({ message });
  } catch (error: any) {
    console.error("Messages POST error:", error);
    return NextResponse.json(
      {
        error: "Failed to create message",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;

    // Delete all messages for this patient
    await prisma.message.deleteMany({
      where: { patientId },
    });

    // Emit socket event to notify both doctor and patient
    const io = (global as any).__io;
    if (io) {
      io.to(`patient:${patientId}`).emit("messages:cleared", { patientId });
      io.to(`doctor:*`).emit("messages:cleared", { patientId });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Messages DELETE error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete messages",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
