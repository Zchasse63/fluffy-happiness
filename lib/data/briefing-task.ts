/*
 * Briefing builder — pulls today's metrics from Supabase, calls
 * `generateBriefing()` against Claude, and persists the result to
 * `ai_briefings`. Called by both:
 *   • POST /api/ai/briefing (manual regen from Command Center)
 *   • Daily 6 AM ET Inngest cron
 *
 * Returns the generated briefing payload. Throws AnthropicNotConfigured
 * when the SDK key is missing — callers decide whether to fall back.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { generateBriefing, type BriefingInput } from "@/lib/ai/claude";
import { readAiCache, writeAiCache } from "@/lib/cache";
import type { Database } from "@/lib/supabase/database.types";

const DAY_MS = 24 * 60 * 60 * 1000;
const BRIEFING_MODEL = "claude-sonnet-4-6";
const BRIEFING_TTL_SECONDS = 22 * 60 * 60; // 22h — slightly under a full day

export type BriefingResult = Awaited<ReturnType<typeof generateBriefing>>;

export type RunBriefingOptions = {
  /**
   * If true, ignore the ai_cache hit and force a fresh Anthropic call.
   * Used by the manual "Regenerate" trigger from Command Center.
   */
  force?: boolean;
};

export async function runBriefingForStudio(
  supabase: SupabaseClient<Database>,
  studioId: string,
  studioName = "The Sauna Guys",
  options: RunBriefingOptions = {},
): Promise<BriefingResult> {
  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = `briefing:${studioId}:${today}`;

  if (!options.force) {
    const cached = await readAiCache<BriefingResult>(supabase, cacheKey);
    if (cached) return cached;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + DAY_MS);
  const weekAgo = new Date(todayStart.getTime() - 7 * DAY_MS);

  const [
    { data: txns },
    { data: classes },
    { data: failed },
    { count: walkInsCount },
    { count: noShowCount },
    { data: weekBookings },
    { data: expiringCredits },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount_cents, status")
      .eq("studio_id", studioId)
      .gte("occurred_at", todayStart.toISOString()),
    supabase
      .from("class_instances")
      .select("id, title, starts_at, capacity, booked_count, trainer_id")
      .eq("studio_id", studioId)
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", todayEnd.toISOString()),
    supabase
      .from("transactions")
      .select(
        "amount_cents, member_id, description, members!left(profiles!left(full_name))",
      )
      .eq("studio_id", studioId)
      .eq("status", "failed")
      .order("occurred_at", { ascending: false })
      .limit(5),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", studioId)
      .eq("status", "completed")
      .eq("type", "walk_in")
      .gte("occurred_at", todayStart.toISOString()),
    supabase
      .from("bookings")
      .select(
        "id, class_instances!inner(starts_at, studio_id)",
        { count: "exact", head: true },
      )
      .eq("status", "no_show")
      .eq("class_instances.studio_id", studioId)
      .gte("class_instances.starts_at", todayStart.toISOString())
      .lt("class_instances.starts_at", todayEnd.toISOString()),
    supabase
      .from("bookings")
      .select("status")
      .eq("studio_id", studioId)
      .gte("created_at", weekAgo.toISOString())
      .neq("status", "cancelled"),
    supabase
      .from("members")
      .select("id, plan_price_cents, membership_credits, current_period_end")
      .eq("studio_id", studioId)
      .eq("membership_status", "active")
      .gt("membership_credits", 0)
      .lte(
        "current_period_end",
        new Date(Date.now() + 7 * DAY_MS).toISOString(),
      ),
  ]);

  const revenueToday =
    (txns ?? [])
      .filter((t) => t.status === "completed")
      .reduce((s, t) => s + (t.amount_cents ?? 0), 0) / 100;

  const todayClasses = classes ?? [];
  const underbooked = todayClasses
    .filter((c) => c.capacity && c.booked_count / c.capacity < 0.5)
    .map((c) => ({
      title: c.title,
      time: new Date(c.starts_at).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      booked: c.booked_count,
      capacity: c.capacity,
      trainer: "TBD",
    }));

  const weekRows = weekBookings ?? [];
  const checkedIn = weekRows.filter((r) => r.status === "checked_in").length;
  const attendanceRate = weekRows.length
    ? Number((checkedIn / weekRows.length).toFixed(2))
    : 0;

  const expiringRows = expiringCredits ?? [];
  const expiringMrr = expiringRows.reduce(
    (s, r) => s + (r.plan_price_cents ?? 0),
    0,
  );

  type FailedRow = {
    amount_cents: number | null;
    description: string | null;
    members: { profiles: { full_name: string | null } | null } | null;
  };
  const failedRows = (failed ?? []) as unknown as FailedRow[];

  const input: BriefingInput = {
    studioName,
    date: new Date().toISOString().slice(0, 10),
    metrics: {
      revenueToday,
      bookingsToday: todayClasses.reduce(
        (s, c) => s + (c.booked_count ?? 0),
        0,
      ),
      walkIns: walkInsCount ?? 0,
      noShows: noShowCount ?? 0,
      attendanceRate,
      underbookedClasses: underbooked,
      expiringCredits: {
        count: expiringRows.length,
        atRiskMrr: expiringMrr / 100,
      },
      failedPayments: failedRows.map((f) => ({
        member: f.members?.profiles?.full_name ?? "Unknown member",
        amount: (f.amount_cents ?? 0) / 100,
        reason: f.description ?? "Payment failed",
      })),
    },
  };

  const briefing = await generateBriefing(input);

  await Promise.all([
    supabase.from("ai_briefings").upsert(
      {
        studio_id: studioId,
        date: input.date,
        generated_at: briefing.generatedAt,
        insights: briefing.insights,
        model: BRIEFING_MODEL,
      },
      { onConflict: "studio_id,date" },
    ),
    writeAiCache(supabase, studioId, cacheKey, briefing, BRIEFING_TTL_SECONDS),
  ]);

  return briefing;
}
