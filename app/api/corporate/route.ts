/*
 * POST /api/corporate — create a new corporate account. Owner/manager.
 */

import { z } from "zod";

import { authErrorResponse, requireRole } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

const Body = z.object({
  name: z.string().min(1).max(120),
  contact_name: z.string().max(120).nullable().optional(),
  contact_email: z.string().email().nullable().optional(),
  contact_phone: z.string().max(40).nullable().optional(),
  monthly_fee_cents: z.number().int().min(0).max(1_000_000).optional(),
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
      .from("corporate_accounts")
      .insert({
        studio_id: profile.studio_id,
        name: parsed.data.name,
        contact_name: parsed.data.contact_name ?? null,
        contact_email: parsed.data.contact_email ?? null,
        contact_phone: parsed.data.contact_phone ?? null,
        monthly_fee_cents: parsed.data.monthly_fee_cents ?? 0,
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
