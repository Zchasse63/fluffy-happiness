/*
 * GET /api/glofox/status — last successful sync per entity, plus
 * unresolved-conflict count.
 */

import { authErrorResponse, requireRole } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await requireRole("owner", "manager");
    const supabase = await createSupabaseServer();
    const [{ data: state }, { data: conflicts, count }] = await Promise.all([
      supabase
        .from("glofox_sync_state")
        .select("entity_type, last_synced_at, status, records_synced")
        .eq("studio_id", profile.studio_id),
      supabase
        .from("glofox_sync_conflicts")
        .select("id", { count: "exact" })
        .eq("studio_id", profile.studio_id)
        .is("resolved_at", null)
        .limit(0),
    ]);
    return Response.json({
      state: state ?? [],
      unresolvedConflicts: count ?? (conflicts ?? []).length,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
