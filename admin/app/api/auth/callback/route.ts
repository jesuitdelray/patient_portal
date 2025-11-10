import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { ensureDefaultTreatmentPlan } from "@/lib/default-treatment-plan";

export async function GET(request: NextRequest) {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL;
  const PATIENT_PORTAL_URL = process.env.PATIENT_PORTAL_URL;
  
  console.log("[OAuth Callback] PATIENT_PORTAL_URL from env:", PATIENT_PORTAL_URL);
  console.log("[OAuth Callback] ADMIN_BASE_URL from env:", ADMIN_BASE_URL);

  if (!ADMIN_BASE_URL) {
    const fallbackUrl = PATIENT_PORTAL_URL || "http://localhost:8081";
    return NextResponse.redirect(
      `${fallbackUrl}?error=config_missing&msg=ADMIN_BASE_URL`
    );
  }
  if (!PATIENT_PORTAL_URL) {
    return NextResponse.json(
      { error: "PATIENT_PORTAL_URL environment variable is required" },
      { status: 500 }
    );
  }
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");

  if (!code || !stateParam) {
    return NextResponse.redirect(
      `${PATIENT_PORTAL_URL}?error=oauth_missing_params`
    );
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      `${PATIENT_PORTAL_URL}?error=oauth_not_configured`
    );
  }

  let state: { role: string; redirectAfter?: string };
  try {
    state = JSON.parse(Buffer.from(stateParam, "base64").toString());
  } catch {
    return NextResponse.redirect(`${PATIENT_PORTAL_URL}?error=invalid_state`);
  }

  const { role, redirectAfter } = state;

  // Only allow patient role via OAuth
  if (role !== "patient") {
    return NextResponse.redirect(
      `${PATIENT_PORTAL_URL}?error=oauth_patients_only`
    );
  }

  // Detect if request is from mobile browser (iOS/Android)
  // We need to redirect to deep link so app can open
  const userAgent = request.headers.get("user-agent") || "";
  const isMobileBrowser = /iPhone|iPad|iPod|Android/i.test(userAgent);
  console.log("[OAuth Callback] User-Agent:", userAgent);
  console.log("[OAuth Callback] isMobileBrowser:", isMobileBrowser);
  console.log("[OAuth Callback] redirectAfter:", redirectAfter);

  try {
    const client = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      `${ADMIN_BASE_URL}/api/auth/callback`
    );

    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;

    if (!idToken) {
      return NextResponse.redirect(`${PATIENT_PORTAL_URL}?error=no_id_token`);
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.redirect(`${PATIENT_PORTAL_URL}?error=invalid_token`);
    }

    const { email, name, picture, sub: googleId } = payload;

    // Find or create patient
    let patient = await prisma.patient.findUnique({
      where: { email },
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          email,
          name: name || email.split("@")[0],
          googleId,
          picture: picture || null,
        },
      });
    } else if (googleId && patient.googleId !== googleId) {
      patient = await prisma.patient.update({
        where: { id: patient.id },
        data: { googleId, picture: picture || patient.picture },
      });
    }

    await ensureDefaultTreatmentPlan(patient.id);

    // Generate JWT token for patient
    const token = await signToken({
      userId: patient.id,
      email: patient.email,
      role: "patient",
      googleId: patient.googleId || undefined,
    });

    // First, determine if this is a web browser request or native app request
    // Web browsers always pass redirectAfter with http/https protocol
    // Native apps either don't pass redirectAfter or pass it without protocol
    const isWebRequest = redirectAfter && (
      redirectAfter.startsWith("http://") ||
      redirectAfter.startsWith("https://")
    );
    
    console.log("[OAuth Callback] isWebRequest:", isWebRequest);
    console.log("[OAuth Callback] redirectAfter:", redirectAfter);
    
    // Only use deep link for native mobile apps, NOT for web browsers
    // If redirectAfter starts with http/https, it's definitely a web browser
    if (isMobileBrowser && !isWebRequest) {
      // Deep link for native app - WebBrowser will handle this automatically
      const deepLink = `patient-portal://auth?token=${encodeURIComponent(
        token
      )}`;
      console.log("[OAuth Callback] Using deep link for native app:", deepLink.substring(0, 50) + "...");
      return NextResponse.redirect(deepLink);
    }
    
    // For web browsers, determine redirect URL - prioritize redirectAfter (preserves localhost and correct production URL)
    let redirectUrl = PATIENT_PORTAL_URL!;

    // If redirectAfter is provided, use it (especially for localhost and web browsers)
    if (redirectAfter && isWebRequest) {
      try {
        const redirectUrlObj = new URL(redirectAfter);

        // Always use localhost if that's where user came from
        if (
          redirectUrlObj.hostname === "localhost" ||
          redirectUrlObj.hostname === "127.0.0.1" ||
          redirectUrlObj.hostname.includes("localhost")
        ) {
          redirectUrl = redirectAfter;
          console.log("[OAuth Callback] Using localhost redirectAfter");
        } else {
          // For web browsers, always use redirectAfter if it's a valid http/https URL
          // This ensures users are redirected back to the correct URL they came from
          redirectUrl = redirectAfter;
          console.log("[OAuth Callback] Using redirectAfter for web browser:", redirectAfter);
        }
      } catch (e) {
        // Invalid URL, use default patient portal
        console.warn("Invalid redirectAfter URL:", redirectAfter, e);
      }
    } else if (redirectAfter && !isWebRequest) {
      // For native apps, check if redirectAfter matches PATIENT_PORTAL_URL origin
      try {
        const redirectUrlObj = new URL(redirectAfter);
        const patientPortalUrlObj = new URL(PATIENT_PORTAL_URL!);
        console.log("[OAuth Callback] redirectUrlObj.origin:", redirectUrlObj.origin);
        console.log("[OAuth Callback] patientPortalUrlObj.origin:", patientPortalUrlObj.origin);
        if (redirectUrlObj.origin === patientPortalUrlObj.origin) {
          console.log("[OAuth Callback] Origins match, using redirectAfter");
          redirectUrl = redirectAfter;
        } else {
          console.log("[OAuth Callback] Origins don't match, using PATIENT_PORTAL_URL");
        }
      } catch (e) {
        console.warn("Invalid redirectAfter URL:", redirectAfter, e);
      }
    }
    
    console.log("[OAuth Callback] Using HTTP redirect for web browser");
    console.log("[OAuth Callback] redirectUrl:", redirectUrl);

    // Check if redirect URL is cross-domain (different origin)
    const redirectOrigin = redirectUrl ? new URL(redirectUrl).origin : null;
    const adminOrigin = new URL(ADMIN_BASE_URL!).origin;
    const isCrossDomain = redirectOrigin !== adminOrigin;

    console.log("[OAuth Callback] redirectOrigin:", redirectOrigin);
    console.log("[OAuth Callback] adminOrigin:", adminOrigin);
    console.log("[OAuth Callback] isCrossDomain:", isCrossDomain);

    // Create response
    const response = NextResponse.redirect(redirectUrl);

    if (isCrossDomain) {
      // Cross-domain: add token to URL as fallback (will be saved to localStorage)
      const url = new URL(redirectUrl);
      url.searchParams.set("_auth_token", token);
      console.log("[OAuth Callback] Cross-domain redirect with token in URL:", url.toString().substring(0, 100) + "...");
      return NextResponse.redirect(url.toString());
    } else {
      // Same-domain: set HTTP-only cookie
      console.log("[OAuth Callback] Same-domain redirect with HTTP-only cookie");
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
    console.error("OAuth callback error:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    // Ensure PATIENT_PORTAL_URL is set before redirecting
    const errorRedirect = PATIENT_PORTAL_URL || "http://localhost:8081";
    return NextResponse.redirect(
      `${errorRedirect}?error=oauth_failed&details=${encodeURIComponent(
        error?.message || "Unknown error"
      )}`
    );
  }
}
