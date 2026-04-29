/*
 * POST /api/campaigns — create a new campaign in draft status.
 *
 * Owner/manager only. Returns the new campaign id; the UI redirects
 * to the builder route (which is currently a placeholder pending the
 * Resend integration — see DEFERRED.md).
 */

import { z } from "zod";

import { authErrorResponse, requireRole } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

const Body = z.object({
  name: z.string().min(1).max(120),
  channel: z.enum(["email", "sms", "both"]).default("email"),
  segment_id: z.string().nullable().optional(),
  subject: z.string().max(200).nullable().optional(),
  body_html: z.string().nullable().optional(),
  body_text: z.string().nullable().optional(),
  sms_body: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const profile = await requireRole("owner", "manager");
    const supabase = await createSupabaseServer();

    const parsed = Body.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        studio_id: profile.studio_id,
        status: "draft",
        name: parsed.data.name,
        channel: parsed.data.channel,
        segment_id: parsed.data.segment_id ?? null,
        subject: parsed.data.subject ?? null,
        body_html: parsed.data.body_html ?? null,
        body_text: parsed.data.body_text ?? null,
        sms_body: parsed.data.sms_body ?? null,
        created_by: profile.id,
      })
      .select("id")
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ id: data.id });
  } catch (err) {
    return authErrorResponse(err);
  }
}
