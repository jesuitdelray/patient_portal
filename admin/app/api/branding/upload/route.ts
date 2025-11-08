import { NextRequest, NextResponse } from "next/server";
import { requireDoctor } from "@/lib/auth";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
  "image/webp",
];

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  try {
    const doctorId = await requireDoctor(request);
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const type = formData.get("type");

    if (
      !file ||
      typeof file.arrayBuffer !== "function" ||
      (type !== "logo" && type !== "favicon")
    ) {
      return NextResponse.json(
        { error: "Invalid upload payload" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 2MB)" },
        { status: 400 }
      );
    }

    const uploadDir = join(
      process.cwd(),
      "public",
      "uploads",
      "branding",
      doctorId
    );

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const extension = file.name?.split(".").pop() || "png";
    const filename = `${type}.${extension}`;
    const filepath = join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const publicUrl = `/uploads/branding/${doctorId}/${filename}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error("[Branding Upload] failed:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

