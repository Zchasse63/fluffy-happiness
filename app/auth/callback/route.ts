/*
 * Auth callback — Supabase magic-link lands here with a `code` query
 * param. We exchange it for a session, then link the new auth.uid() to
 * an existing unlinked profile (matched by email), then redirect to
 * ?next= or /.
 *
 * - Validates `next` is a same-origin relative path (closes open
 *   redirect vector — see rebuild-handoff §3.2 F10).
 * - Magic-link verifies the email is controlled by the requester, so
 *   linking by email here is verified-safe.
 * - We only LINK existing profiles — never auto-create. An unknown email
 *   bounces to /login?error=not_authorized so random sign-ups can't
 *   self-provision an owner role.
 *
 * Race-safe pattern: single atomic UPDATE first, then disambiguate the
 * "no row updated" case (already-linked vs not-authorized) with a
 * follow-up SELECT. Avoids a TOCTOU window where two simultaneous
 * first-sign-in clicks would race past a SELECT-then-UPDATE check and
 * one of them gets booted as not_authorized despite owning the profile.
 */

import { NextResponse, type NextRequest } from "next/server";

import { STUDIO_ID } from "@/lib/constants";
import { createSupabaseServer } from "@/lib/supabase/server";

// Actively clear the @supabase/ssr session cookies on the redirect
// response. Calling supabase.auth.signOut() alone leaves the cookies
// on the browser because the redirect NextResponse is a fresh object
// that doesn't carry the @supabase/ssr cookie-store mutations.
function clearAuthCookies(req: NextRequest, res: NextResponse) {
  for (const cookie of req.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      res.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.redirect(`${origin}/login?error=missing_email`);
  }
  const email = user.email.toLowerCase();

  // Atomic link-or-fail. .ilike() with no wildcards = case-insensitive
  // equality, matches the `idx_profiles_email` index on LOWER(email)
  // so the comparison stays index-friendly even if a Glofox import ever
  // landed mixed-case emails.
  const { data: linked } = await supabase
    .from("profiles")
    .update({ auth_user_id: user.id })
    .eq("studio_id", STUDIO_ID)
    .ilike("email", email)
    .is("auth_user_id", null)
    .select("id")
    .maybeSingle();

  if (linked) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // No row updated: either (a) we're already linked from a prior sign-in
  // (re-login path — proceed) or (b) the email isn't on the allowlist
  // (deny + clear session). Disambiguate with a follow-up SELECT.
  const { data: alreadyLinked } = await supabase
    .from("profiles")
    .select("id")
    .eq("studio_id", STUDIO_ID)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (alreadyLinked) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  await supabase.auth.signOut();
  const denied = NextResponse.redirect(`${origin}/login?error=not_authorized`);
  clearAuthCookies(request, denied);
  return denied;
}
