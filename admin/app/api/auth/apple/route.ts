import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL;
  const PATIENT_PORTAL_URL = process.env.PATIENT_PORTAL_URL;

  if (!ADMIN_BASE_URL) {
    return NextResponse.json(
      { error: "ADMIN_BASE_URL environment variable is required" },
      { status: 500 }
    );
  }
  if (!PATIENT_PORTAL_URL) {
    return NextResponse.json(
      { error: "PATIENT_PORTAL_URL environment variable is required" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { identityToken, authorizationCode, user } = body;

    if (!identityToken) {
      return NextResponse.json(
        { error: "Identity token is required" },
        { status: 400 }
      );
    }

    // TODO: Verify identityToken with Apple's public keys
    // For now, we'll decode it and extract user info
    // In production, you should verify the token signature

    // Decode JWT token (simple base64 decode for now)
    const tokenParts = identityToken.split(".");
    if (tokenParts.length !== 3) {
      return NextResponse.json(
        { error: "Invalid identity token" },
        { status: 400 }
      );
    }

    const payload = JSON.parse(
      Buffer.from(tokenParts[1], "base64").toString("utf-8")
    );

    const email = payload.email || user?.email;
    const sub = payload.sub; // Apple user ID

    if (!email || !sub) {
      return NextResponse.json(
        { error: "Missing email or user ID" },
        { status: 400 }
      );
    }

    // Import prisma and jwt utilities
    const { prisma } = await import("@/lib/db");
    const { signToken } = await import("@/lib/jwt");

    // Find or create patient
    let patient = await prisma.patient.findUnique({
      where: { email },
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          email,
          name:
            user?.name?.firstName && user?.name?.lastName
              ? `${user.name.firstName} ${user.name.lastName}`
              : email.split("@")[0],
          googleId: sub, // Reuse googleId field for Apple ID
          picture: null,
        },
      });
    } else {
      // Update patient if needed
      if (sub && patient.googleId !== sub) {
        patient = await prisma.patient.update({
          where: { id: patient.id },
          data: { googleId: sub },
        });
      }
    }

    // Generate JWT token
    const token = await signToken({
      userId: patient.id,
      email: patient.email,
      role: "patient",
      googleId: patient.googleId || undefined,
    });

    // Check if redirect URL is cross-domain
    const redirectOrigin = PATIENT_PORTAL_URL
      ? new URL(PATIENT_PORTAL_URL).origin
      : null;
    const adminOrigin = new URL(ADMIN_BASE_URL).origin;
    const isCrossDomain = redirectOrigin !== adminOrigin;

    // Create response
    let redirectUrl = PATIENT_PORTAL_URL!;

    if (isCrossDomain) {
      // Cross-domain: add token to URL as fallback
      const url = new URL(redirectUrl);
      url.searchParams.set("_auth_token", token);
      return NextResponse.json({ token, redirectUrl: url.toString() });
    } else {
      // Same-domain: set HTTP-only cookie
      const response = NextResponse.json({ success: true });
      response.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });
      return response;
    }
  } catch (error: any) {
    console.error("Apple Sign In error:", error);
    return NextResponse.json(
      {
        error: "Apple Sign In failed",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
