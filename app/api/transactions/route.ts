/*
 * GET /api/transactions — paginated transaction log.
 */

import { z } from "zod";

import { authErrorResponse, requireProfile } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

const Query = z.object({
  status: z
    .enum(["pending", "completed", "failed", "refunded", "disputed"])
    .optional(),
  type: z
    .enum([
      "membership",
      "class_pack",
      "retail",
      "gift_card",
      "walk_in",
      "refund",
      "adjustment",
      "corporate",
    ])
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export async function GET(request: Request) {
  try {
    await requireProfile();
    const url = new URL(request.url);
    const params = Query.parse(Object.fromEntries(url.searchParams));
    const supabase = await createSupabaseServer();

    let query = supabase
      .from("transactions")
      .select(
        "id, occurred_at, type, status, amount_cents, currency, description, member_id, glofox_id, stripe_payment_intent",
      )
      .order("occurred_at", { ascending: false })
      .limit(params.limit);
    if (params.status) query = query.eq("status", params.status);
    if (params.type) query = query.eq("type", params.type);
    if (params.from) query = query.gte("occurred_at", params.from);
    if (params.to) query = query.lte("occurred_at", params.to);

    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ transactions: data ?? [] });
  } catch (err) {
    return authErrorResponse(err);
  }
}
