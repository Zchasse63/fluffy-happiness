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

  // Link via SECURITY DEFINER RPC. The RPC reads auth.email() +
  // auth.uid() server-side so a client can't ask to link a different
  // profile, but it bypasses the first-sign-in chicken-and-egg in RLS:
  // a brand-new auth user has no linked profile yet, so
  // current_studio_id() returns NULL and the policy on profiles fails.
  // See migration 0017.
  const { data: linkRows, error: linkErr } = await supabase.rpc(
    "link_my_profile",
  );
  const link = Array.isArray(linkRows) ? linkRows[0] : linkRows;

  if (linkErr) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(linkErr.message)}`,
    );
  }

  // Both happy paths — freshly linked OR already linked — get redirected.
  if (link?.linked_profile_id) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // No matching profile: email isn't on the allowlist. Clear session.
  await supabase.auth.signOut();
  const denied = NextResponse.redirect(`${origin}/login?error=not_authorized`);
  clearAuthCookies(request, denied);
  return denied;
}
