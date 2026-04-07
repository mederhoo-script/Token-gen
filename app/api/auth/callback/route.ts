import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/auth/callback
 *
 * Handles the OAuth / magic-link / email verification redirect from Supabase.
 * Supabase appends `code` (PKCE) or `token_hash` + `type` to the redirect URL.
 * We exchange those for a session and then redirect the user into the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  // Allow callers to pass a custom next param; fall back to /dashboard
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  if (code) {
    // PKCE OAuth flow
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  } else if (tokenHash && type) {
    // Email OTP / magic-link / email confirmation flow
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as
        | "email"
        | "signup"
        | "recovery"
        | "invite"
        | "magiclink"
        | "email_change",
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // Neither flow succeeded — send user back to login with an error flag
  return NextResponse.redirect(new URL("/login?error=auth_callback_failed", origin));
}
