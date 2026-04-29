/*
 * Cookie-aware Supabase client used by the Next.js 16 proxy
 * (formerly middleware). It refreshes the auth session on every
 * navigation, redirects unauthenticated users to /login, and returns
 * the response so the proxy can forward set-cookie headers.
 */

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/lib/supabase/database.types";

const PUBLIC_PREFIXES = [
  "/login",
  "/auth",
  "/api/webhooks", // Stripe / Resend POST here without our cookie
  "/api/inngest", // Inngest signing-key verifies; cookie auth is wrong layer
  "/api/health",
];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Hard prod guard mirrored from lib/auth.ts.
if (
  process.env.TEST_AUTH_BYPASS === "1" &&
  process.env.NODE_ENV === "production"
) {
  throw new Error(
    "TEST_AUTH_BYPASS=1 is not allowed in production. Remove it from your environment immediately.",
  );
}

export async function refreshSupabaseSession(request: NextRequest) {
  // Test-mode short-circuit: skip Supabase auth entirely. The
  // application code in lib/auth.ts injects a fake test profile, so
  // every gated route renders as if the test owner were signed in.
  if (process.env.TEST_AUTH_BYPASS === "1") {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          for (const { name, value } of toSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // Public routes: don't gate, just pass through (with refreshed cookies).
  if (isPublic(pathname)) {
    return response;
  }

  // Authenticated routes: kick to /login if no user.
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + (search ?? ""))}`;
    return NextResponse.redirect(url);
  }

  return response;
}
