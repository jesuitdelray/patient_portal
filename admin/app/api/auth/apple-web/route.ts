import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
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

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") || "patient";
  const redirectAfter = searchParams.get("redirect") || "";

  // Only allow patient role via OAuth (admin uses email/password)
  if (role !== "patient") {
    return NextResponse.redirect(
      `${ADMIN_BASE_URL}/auth/login?error=oauth_patients_only`
    );
  }

  // If Apple OAuth is not configured, redirect back to where user came from (preserve localhost)
  // Don't redirect to admin login page!
  if (!APPLE_CLIENT_ID) {
    // Try to preserve original URL (localhost or production)
    let errorUrl: URL;
    try {
      if (redirectAfter) {
        errorUrl = new URL(redirectAfter);
      } else {
        errorUrl = new URL(PATIENT_PORTAL_URL);
      }
    } catch {
      errorUrl = new URL(PATIENT_PORTAL_URL);
    }
    errorUrl.searchParams.set("error", "apple_oauth_not_configured");
    return NextResponse.redirect(errorUrl.toString());
  }

  // Always use admin base URL for callback (OAuth callback always goes to admin backend)
  const redirectUri = `${ADMIN_BASE_URL}/api/auth/apple-callback`;

  // Store redirectAfter and role in state for callback
  const state = Buffer.from(JSON.stringify({ role, redirectAfter })).toString(
    "base64"
  );

  // Apple Sign In web OAuth URL
  // Note: This requires proper Apple Developer setup with:
  // - Service ID configured in Apple Developer Portal
  // - Sign in with Apple enabled
  // - Redirect URI configured
  const appleAuthUrl = new URL("https://appleid.apple.com/auth/authorize");
  appleAuthUrl.searchParams.set("client_id", APPLE_CLIENT_ID);
  appleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  appleAuthUrl.searchParams.set("response_type", "code id_token");
  appleAuthUrl.searchParams.set("scope", "name email");
  appleAuthUrl.searchParams.set("response_mode", "form_post"); // Apple uses form_post
  appleAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(appleAuthUrl.toString());
}
