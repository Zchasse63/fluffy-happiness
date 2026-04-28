/*
 * Next.js 16 proxy (formerly middleware). Refreshes the Supabase session
 * cookie on every navigation so server components see a valid auth context.
 *
 * Skip static assets and the auth callback — those don't need a refresh
 * and skipping them avoids a needless round-trip.
 */

import type { NextRequest } from "next/server";

import { refreshSupabaseSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return refreshSupabaseSession(request);
}

export const config = {
  matcher: [
    /*
     * Match every request EXCEPT:
     * - _next/static, _next/image, favicon.ico, .well-known
     * - Image / font assets (svg, png, jpg, jpeg, gif, webp, avif, ico)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)).*)",
  ],
};
