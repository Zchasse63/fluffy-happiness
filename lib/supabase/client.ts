/*
 * Browser Supabase client — uses the publishable key + cookie-based session.
 * Anything that mutates data must still go through a server route so RLS
 * has a real auth context (we never call the service-role key here).
 */

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";

export function createSupabaseBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
