/*
 * POST /api/members/[id]/credit — issue credits to a member.
 *
 * Wraps apply_credit_ledger so the change is audited + denormalized
 * caches stay consistent. Owner/manager only.
 */

import { z } from "zod";

import { authErrorResponse, requireRole } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

const Body = z.object({
  type: z.enum(["membership", "flex", "guest_pass", "wallet"]),
  /** For credit types: count of credits. For wallet: cents. */
  delta: z.number().int().refine((n) => n !== 0, "delta must be non-zero"),
  reason: z.string().min(1).max(500),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireRole("owner", "manager");
    const { id } = await params;
    const body = Body.parse(await request.json());
    const supabase = await createSupabaseServer();

    const { data, error } = await supabase.rpc("apply_credit_ledger", {
      p_member_id: id,
      p_credit_type: body.type,
      p_delta: body.delta,
      p_reason: body.reason,
      p_actor_id: profile.id,
    });
    if (error) {
      const status =
        error.message === "member_not_found"
          ? 404
          : error.message === "insufficient_balance"
            ? 409
            : 500;
      return Response.json({ error: error.message }, { status });
    }
    return Response.json({ ledgerId: data });
  } catch (err) {
    return authErrorResponse(err);
  }
}
