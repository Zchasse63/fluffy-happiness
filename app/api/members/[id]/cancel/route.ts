/*
 * POST /api/members/[id]/cancel — cancel a membership.
 *
 * Owner/manager only. Marks the member cancelled, sets cancelled_at,
 * logs activity. Stripe subscription cancellation happens in the
 * Inngest write-back queue (so the API call returns immediately).
 */

import { z } from "zod";

import { authErrorResponse, requireRole } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

const Body = z.object({
  reason: z.string().min(1).max(500),
  effectiveImmediately: z.boolean().default(false),
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

    const update = body.effectiveImmediately
      ? {
          membership_status: "cancelled" as const,
          cancelled_at: new Date().toISOString(),
        }
      : {
          membership_status: "cancelled" as const,
          pending_change_at: null,
        };

    const { data, error } = await supabase
      .from("members")
      .update(update)
      .eq("id", id)
      .eq("studio_id", profile.studio_id)
      .select("id")
      .single();
    if (error) throw error;

    await supabase.from("activity_log").insert({
      studio_id: profile.studio_id,
      actor_id: profile.id,
      subject_id: id,
      subject_type: "member",
      type: "membership_cancelled",
      payload: { reason: body.reason, effective_immediately: body.effectiveImmediately },
    });

    return Response.json({ memberId: data.id, cancelled: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
