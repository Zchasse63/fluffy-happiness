/*
 * POST /api/bookings — atomic booking via book_class_atomic RPC. The
 * RPC handles capacity check + duplicate detection in a single
 * transaction, returning specific sqlstates for each failure mode.
 */

import { z } from "zod";

import { authErrorResponse, requireProfile } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

const Body = z.object({
  classInstanceId: z.string().uuid(),
  memberId: z.string().uuid(),
  creditType: z
    .enum(["membership", "flex", "guest_pass", "wallet"])
    .optional(),
  source: z
    .enum(["meridian", "walk_in", "staff_added"])
    .default("meridian"),
});

const ERROR_TO_STATUS: Record<string, number> = {
  class_not_found: 404,
  duplicate_booking: 409,
  class_full: 409,
};

export async function POST(request: Request) {
  try {
    const profile = await requireProfile();
    const body = Body.parse(await request.json());
    const supabase = await createSupabaseServer();

    const { data, error } = await supabase.rpc("book_class_atomic", {
      p_class_instance_id: body.classInstanceId,
      p_member_id: body.memberId,
      p_studio_id: profile.studio_id,
      p_credit_type: body.creditType ?? null,
      p_source: body.source,
    });
    if (error) {
      const status = ERROR_TO_STATUS[error.message] ?? 500;
      return Response.json({ error: error.message }, { status });
    }
    return Response.json({ bookingId: data });
  } catch (err) {
    return authErrorResponse(err);
  }
}
