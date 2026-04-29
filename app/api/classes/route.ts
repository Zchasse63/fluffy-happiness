/*
 * GET /api/classes — class instances within a date range.
 * Defaults to today + next 7 days when no range is supplied.
 */

import { z } from "zod";

import { authErrorResponse, requireProfile } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

const Query = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  try {
    const profile = await requireProfile();
    const url = new URL(request.url);
    const params = Query.parse(Object.fromEntries(url.searchParams));
    const supabase = await createSupabaseServer();

    const from = params.from ?? new Date().toISOString();
    const to =
      params.to ??
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("class_instances")
      .select(
        "id, title, starts_at, ends_at, capacity, booked_count, waitlist_count, status, program_id, trainer_id, location_id",
      )
      .eq("studio_id", profile.studio_id)
      .gte("starts_at", from)
      .lte("starts_at", to)
      .order("starts_at", { ascending: true });
    if (error) throw error;
    return Response.json({ classes: data ?? [] });
  } catch (err) {
    return authErrorResponse(err);
  }
}
