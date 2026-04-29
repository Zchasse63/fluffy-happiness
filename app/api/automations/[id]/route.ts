/*
 * PATCH /api/automations/[id] — toggle automation status. Owner/manager
 * only. The body accepts { status: 'active' | 'paused' | 'draft' }.
 */

import { z } from "zod";

import { authErrorResponse, requireRole } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

const Body = z.object({
  status: z.enum(["active", "paused", "draft"]),
});

type Params = Promise<{ id: string }>;

export async function PATCH(
  request: Request,
  { params }: { params: Params },
) {
  try {
    const profile = await requireRole("owner", "manager");
    const supabase = await createSupabaseServer();
    const { id } = await params;

    const parsed = Body.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { error } = await supabase
      .from("automation_flows")
      .update({ status: parsed.data.status })
      .eq("id", id)
      .eq("studio_id", profile.studio_id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
