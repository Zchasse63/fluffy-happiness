/*
 * GET /api/members — list members visible to the caller's studio,
 * with optional ?status= and ?segment= filters.
 *
 * The proxy already requires auth on /api/* (except /api/webhooks +
 * /api/health). RLS handles the studio_id isolation; the API filters
 * are convenience.
 */

import { z } from "zod";

import { authErrorResponse, requireProfile } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

const Query = z.object({
  status: z
    .enum(["active", "paused", "cancelled", "expired", "trialing", "prospect"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    await requireProfile();
    const url = new URL(request.url);
    const params = Query.parse(Object.fromEntries(url.searchParams));
    const supabase = await createSupabaseServer();

    let query = supabase
      .from("members")
      .select(
        "id, profile_id, membership_status, membership_tier, plan_code, plan_price_cents, membership_credits, flex_credits, wallet_balance_cents, strike_count, glofox_id, profiles!inner(full_name, email, phone)",
      )
      .order("updated_at", { ascending: false })
      .limit(params.limit);

    if (params.status) query = query.eq("membership_status", params.status);
    if (params.cursor) query = query.lt("updated_at", params.cursor);

    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ members: data ?? [] });
  } catch (err) {
    return authErrorResponse(err);
  }
}
