import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { requireDoctor } from "@/lib/auth";
import { ensureDefaultTreatmentPlan } from "@/lib/default-treatment-plan";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10) || 10)
  );

  const where: Prisma.PatientWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
          { email: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
          { phone: { contains: q, mode: "insensitive" as Prisma.QueryMode } },
        ],
      }
    : {};

  try {
    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      patients,
      total,
      page,
      pageSize,
      hasNext: page * pageSize < total,
      hasPrev: page > 1,
    });
  } catch (e) {
    return NextResponse.json({ error: "Database unavailable" }, {
      status: 500,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireDoctor(req);
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone =
      typeof body?.phone === "string" && body.phone.trim().length > 0
        ? body.phone.trim()
        : null;
    const password = typeof body?.password === "string" ? body.password : "";

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.trim().length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    const existing = await prisma.patient.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A patient with this email already exists" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password.trim(), 10);

    const patient = await prisma.patient.create({
      data: {
        name,
        email,
        phone,
        password: hashed,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    await ensureDefaultTreatmentPlan(patient.id);

    return NextResponse.json({ patient }, { status: 201 });
  } catch (error: any) {
    console.error("Create patient error:", error);
    const message =
      typeof error?.message === "string"
        ? error.message
        : "Failed to create patient";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
