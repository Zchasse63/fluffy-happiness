/*
 * Service-role Supabase client. Bypasses RLS — use ONLY in trusted
 * server contexts where there is no authenticated user (Inngest crons,
 * webhook handlers, internal scripts). Never import this from a route
 * that runs on user input.
 *
 * The `server-only` import causes a build-time error if this module is
 * transitively imported by any client bundle, making the boundary
 * machine-enforced rather than comment-enforced.
 */

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

export class SupabaseAdminNotConfigured extends Error {
  constructor() {
    super(
      "SUPABASE_SERVICE_ROLE_KEY missing — set it in .env.local to enable cron jobs and other service-context writes.",
    );
    this.name = "SupabaseAdminNotConfigured";
  }
}

export function createSupabaseAdmin(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new SupabaseAdminNotConfigured();
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
