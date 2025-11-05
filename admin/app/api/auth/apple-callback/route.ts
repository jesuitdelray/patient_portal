import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/jwt";

// Apple OAuth callback - handles form_post response from Apple
export async function POST(req: NextRequest) {
  const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
  const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL;
  const PATIENT_PORTAL_URL = process.env.PATIENT_PORTAL_URL;

  if (!APPLE_CLIENT_ID) {
    return NextResponse.redirect(
      `${PATIENT_PORTAL_URL}?error=apple_oauth_not_configured`
    );
  }

  if (!ADMIN_BASE_URL || !PATIENT_PORTAL_URL) {
    return NextResponse.redirect(
      `${PATIENT_PORTAL_URL || "http://localhost:8081"}?error=config_missing`
    );
  }

  try {
    // Apple uses form_post, so data comes in form data
    const formData = await req.formData();
    const code = formData.get("code")?.toString();
    const idToken = formData.get("id_token")?.toString();
    const state = formData.get("state")?.toString();

    if (!code && !idToken) {
      return NextResponse.redirect(
        `${PATIENT_PORTAL_URL}?error=apple_oauth_missing_token`
      );
    }

    let stateData: { role?: string; redirectAfter?: string } = {};
    if (state) {
      try {
        stateData = JSON.parse(Buffer.from(state, "base64").toString());
      } catch {
        // Invalid state, continue with defaults
      }
    }

    const { role = "patient", redirectAfter } = stateData;

    // Only allow patient role via OAuth
    if (role !== "patient") {
      return NextResponse.redirect(
        `${ADMIN_BASE_URL}/auth/login?error=oauth_patients_only`
      );
    }

    let email: string | null = null;
    let sub: string | null = null;

    // If we have id_token, decode it
    if (idToken) {
      try {
        const tokenParts = idToken.split(".");
        if (tokenParts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(tokenParts[1], "base64").toString("utf-8")
          );
          email = payload.email || null;
          sub = payload.sub || null;
        }
      } catch (e) {
        console.error("Failed to decode id_token:", e);
      }
    }

    // If we have code but no id_token, we need to exchange code for token
    // This requires Apple's token endpoint and private key - simplified for now
    if (code && !idToken) {
      // TODO: Exchange code for token using Apple's token endpoint
      // For now, return error - this requires full Apple OAuth setup
      return NextResponse.redirect(
        `${PATIENT_PORTAL_URL}?error=apple_oauth_code_exchange_not_implemented`
      );
    }

    if (!email || !sub) {
      return NextResponse.redirect(
        `${PATIENT_PORTAL_URL}?error=apple_oauth_missing_email`
      );
    }

    // Find or create patient
    let patient = await prisma.patient.findUnique({
      where: { email },
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          email,
          name: email.split("@")[0],
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

    // Detect if request is from mobile browser (iOS/Android)
    const userAgent = req.headers.get("user-agent") || "";
    const isMobileBrowser = /iPhone|iPad|iPod|Android/i.test(userAgent);

    // For mobile browsers/apps using WebBrowser, redirect to deep link
    // WebBrowser.openAuthSessionAsync expects a redirect to the deep link scheme
    if (isMobileBrowser) {
      // Deep link for app - WebBrowser will handle this automatically
      const deepLink = `patient-portal://auth?token=${encodeURIComponent(
        token
      )}`;
      return NextResponse.redirect(deepLink);
    }

    // Determine redirect URL - prioritize redirectAfter (preserves localhost)
    let redirectUrl = PATIENT_PORTAL_URL;

    if (redirectAfter) {
      try {
        const redirectUrlObj = new URL(redirectAfter);

        // Always use localhost if that's where user came from
        if (
          redirectUrlObj.hostname === "localhost" ||
          redirectUrlObj.hostname === "127.0.0.1" ||
          redirectUrlObj.hostname.includes("localhost")
        ) {
          // Preserve full URL with path and port
          redirectUrl = redirectAfter;
        } else {
          // For production URLs, only use redirectAfter if it's from the same origin
          const patientPortalUrlObj = new URL(PATIENT_PORTAL_URL);
          if (redirectUrlObj.origin === patientPortalUrlObj.origin) {
            redirectUrl = redirectAfter;
          }
        }
      } catch (e) {
        console.warn("Invalid redirectAfter URL:", redirectAfter, e);
        // Fallback: try to preserve at least the hostname from redirectAfter
        try {
          const parsed = new URL(redirectAfter);
          if (
            parsed.hostname === "localhost" ||
            parsed.hostname.includes("localhost")
          ) {
            // Construct URL with localhost but default path
            redirectUrl = `${parsed.protocol}//${parsed.host}/dashboard`;
          }
        } catch {
          // Use default
        }
      }
    }

    // Check if redirect URL is cross-domain
    const redirectOrigin = redirectUrl ? new URL(redirectUrl).origin : null;
    const adminOrigin = new URL(ADMIN_BASE_URL).origin;
    const isCrossDomain = redirectOrigin !== adminOrigin;

    // Create response
    const response = NextResponse.redirect(redirectUrl);

    if (isCrossDomain) {
      // Cross-domain: add token to URL as fallback
      const url = new URL(redirectUrl);
      url.searchParams.set("_auth_token", token);
      return NextResponse.redirect(url.toString());
    } else {
      // Same-domain: set HTTP-only cookie
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
    console.error("Apple OAuth callback error:", error);
    return NextResponse.redirect(
      `${PATIENT_PORTAL_URL}?error=apple_oauth_failed&details=${encodeURIComponent(
        error?.message || "Unknown error"
      )}`
    );
  }
}
