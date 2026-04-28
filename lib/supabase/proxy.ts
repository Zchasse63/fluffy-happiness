/*
 * Cookie-aware Supabase client used by the Next.js 16 proxy
 * (formerly middleware). It refreshes the auth session on every
 * navigation, redirects unauthenticated users to /login, and returns
 * the response so the proxy can forward set-cookie headers.
 */

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PREFIXES = [
  "/login",
  "/auth",
  "/api/webhooks", // Stripe / Resend POST here without our cookie
  "/api/health",
];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function refreshSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
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
