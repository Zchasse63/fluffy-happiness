/*
 * Auth callback — Supabase magic-link lands here with a `code` query
 * param. We exchange it for a session, then redirect to ?next= or /.
 *
 * Validates `next` is a same-origin relative path (closes open redirect
 * vector — see rebuild-handoff §3.2 F10).
 */

import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServer } from "@/lib/supabase/server";

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

  return NextResponse.redirect(`${origin}${next}`);
}
