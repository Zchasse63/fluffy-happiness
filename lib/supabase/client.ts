/*
 * Browser Supabase client — uses the publishable key + cookie-based session.
 * Anything that mutates data must still go through a server route so RLS
 * has a real auth context (we never call the service-role key here).
 */

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
