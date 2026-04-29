/*
 * PATCH /api/settings — update one or more settings KV pairs and/or
 * studio top-level fields. Owner-only.
 *
 * Body:
 *   {
 *     business?: {
 *       name?: string;
 *       slug?: string;
 *       timezone?: string;
 *       currency?: string;
 *       tax_rate?: number;
 *     };
 *     bookingRules?: {
 *       booking_window_days?: number;
 *       cancellation_policy_hours?: number;
 *       late_cancel_fee_cents?: number;
 *       no_show_fee_cents?: number;
 *       waitlist_auto_promote?: boolean;
 *     };
 *   }
 */

import { z } from "zod";

import { authErrorResponse, requireRole } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

const Body = z.object({
  business: z
    .object({
      name: z.string().min(1).max(120).optional(),
      slug: z
        .string()
        .min(1)
        .max(80)
        .regex(/^[a-z0-9-]+$/, "lowercase + dashes only")
        .optional(),
      timezone: z.string().max(40).optional(),
      currency: z.string().length(3).optional(),
      tax_rate: z.number().min(0).max(1).optional(),
    })
    .optional(),
  bookingRules: z
    .object({
      booking_window_days: z.number().int().min(1).max(365).optional(),
      cancellation_policy_hours: z.number().int().min(0).max(168).optional(),
      late_cancel_fee_cents: z.number().int().min(0).max(100_00).optional(),
      no_show_fee_cents: z.number().int().min(0).max(100_00).optional(),
      waitlist_auto_promote: z.boolean().optional(),
    })
    .optional(),
});

export async function PATCH(request: Request) {
  try {
    const profile = await requireRole("owner");
    const supabase = await createSupabaseServer();

    const parsed = Body.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.business && Object.keys(parsed.data.business).length) {
      const { error } = await supabase
        .from("studios")
        .update(parsed.data.business)
        .eq("id", profile.studio_id);
      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }
    }

    if (parsed.data.bookingRules) {
      const upserts = Object.entries(parsed.data.bookingRules).map(
        ([key, value]) => ({
          studio_id: profile.studio_id,
          key,
          value: value as never,
          updated_at: new Date().toISOString(),
        }),
      );
      if (upserts.length) {
        const { error } = await supabase
          .from("settings")
          .upsert(upserts, { onConflict: "studio_id,key" });
        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
