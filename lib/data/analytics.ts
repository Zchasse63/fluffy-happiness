/*
 * Analytics-page server loaders. Computes the cohort-retention curve
 * and the 7-state engagement-health breakdown from real data so the
 * Analytics page no longer ships hardcoded numbers
 * (specs/audits/qa-discovery-2026-05-08.md §B.1).
 *
 * Both queries are heavy enough to deserve a kpi_cache wrapper but
 * we're keeping them direct for now — once the daily Inngest cron is
 * live, these can move to the briefing-task.ts pre-compute path.
 */

import { STUDIO_ID } from "@/lib/constants";
import { logQueryError } from "@/lib/data/_log";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { EngagementBadge } from "@/lib/fixtures";

const DAY_MS = 24 * 60 * 60 * 1000;

/* ─── Cohort retention ─────────────────────────────────────────────

 * Group members by signup month. For each cohort, count the share
 * still booking N months later (any check-in within month N from
 * signup date). Returns the rolling-12-month average so the chart
 * remains stable as cohorts age in.
 */

export type CohortPoint = {
  monthsSinceSignup: number;
  retention: number; // 0..100
};

export async function loadCohortRetention(
  monthsOut = 12,
): Promise<CohortPoint[]> {
  const supabase = await createSupabaseServer();
  const oldestCohortStart = new Date();
  // Pull cohorts back to (monthsOut + 12) months so we have a full
  // rolling window — 12-month-old cohort is still maturing through
  // months 0..12.
  oldestCohortStart.setMonth(oldestCohortStart.getMonth() - (monthsOut + 12));

  const { data: members, error: memErr } = await supabase
    .from("members")
    .select("id, created_at")
    .eq("studio_id", STUDIO_ID)
    .gte("created_at", oldestCohortStart.toISOString())
    .returns<Array<{ id: string; created_at: string | null }>>();
  logQueryError("analytics.cohort.members", memErr);
  if (!members?.length) {
    return Array.from({ length: monthsOut + 1 }, (_, i) => ({
      monthsSinceSignup: i,
      retention: 0,
    }));
  }

  // Map memberId → signup epoch
  const signup = new Map<string, number>();
  for (const m of members) {
    if (!m.created_at) continue;
    signup.set(m.id, new Date(m.created_at).getTime());
  }
  const memberIds = [...signup.keys()];

  // Pull every checked-in booking for these members. We bucket each
  // booking into "months since member signup" and tally unique
  // (member, month) pairs.
  const { data: checkins, error: ciErr } = await supabase
    .from("bookings")
    .select("member_id, created_at")
    .eq("studio_id", STUDIO_ID)
    .eq("status", "checked_in")
    .in("member_id", memberIds)
    .returns<Array<{ member_id: string | null; created_at: string | null }>>();
  logQueryError("analytics.cohort.bookings", ciErr);

  // (memberId, monthIndex) seen set
  const seen = new Set<string>();
  for (const r of checkins ?? []) {
    if (!r.member_id || !r.created_at) continue;
    const startMs = signup.get(r.member_id);
    if (!startMs) continue;
    const monthsSince = Math.floor(
      (new Date(r.created_at).getTime() - startMs) / (30 * DAY_MS),
    );
    if (monthsSince < 0 || monthsSince > monthsOut) continue;
    seen.add(`${r.member_id}|${monthsSince}`);
  }

  // For each month bucket, denominator is the count of cohorts that
  // are at least `m` months old.
  const now = Date.now();
  const points: CohortPoint[] = [];
  for (let m = 0; m <= monthsOut; m++) {
    let denom = 0;
    let numer = 0;
    for (const [memberId, startMs] of signup) {
      const ageMonths = Math.floor((now - startMs) / (30 * DAY_MS));
      if (ageMonths < m) continue;
      denom += 1;
      if (seen.has(`${memberId}|${m}`)) numer += 1;
    }
    points.push({
      monthsSinceSignup: m,
      retention: denom ? Math.round((numer / denom) * 100) : 0,
    });
  }
  return points;
}

/* ─── Engagement health breakdown ─────────────────────────────────

 * Run the same `inferEngagement` logic the directory uses, but as an
 * aggregate over every member. Returns a count per badge.
 *
 * NOTE: this duplicates a chunk of `listMembers` logic in
 * lib/data/members.ts. The right long-term fix is one shared
 * `loadEngagementByMember(studioId)` that both call. For now, keeping
 * this self-contained avoids an import cycle.
 */

export type EngagementBreakdown = Record<EngagementBadge, number>;

export async function loadEngagementHealthBreakdown(): Promise<EngagementBreakdown> {
  const supabase = await createSupabaseServer();

  const [
    { data: members, error: memErr },
    { data: checkins, error: ciErr },
  ] = await Promise.all([
    supabase
      .from("members")
      .select("id, membership_status, created_at")
      .eq("studio_id", STUDIO_ID)
      .returns<
        Array<{
          id: string;
          membership_status: string | null;
          created_at: string | null;
        }>
      >(),
    supabase
      .from("bookings")
      .select("member_id, created_at")
      .eq("studio_id", STUDIO_ID)
      .eq("status", "checked_in")
      .gte(
        "created_at",
        new Date(Date.now() - 28 * DAY_MS).toISOString(),
      )
      .returns<Array<{ member_id: string | null; created_at: string | null }>>(),
  ]);
  logQueryError("analytics.health.members", memErr);
  logQueryError("analytics.health.checkins", ciErr);

  const recentSince = Date.now() - 14 * DAY_MS;
  const recent = new Map<string, number>();
  const prior = new Map<string, number>();
  for (const r of checkins ?? []) {
    if (!r.member_id || !r.created_at) continue;
    const t = new Date(r.created_at).getTime();
    const map = t >= recentSince ? recent : prior;
    map.set(r.member_id, (map.get(r.member_id) ?? 0) + 1);
  }

  const out: EngagementBreakdown = {
    Power: 0,
    Active: 0,
    Engaged: 0,
    Cooling: 0,
    "At risk": 0,
    New: 0,
    Lapsed: 0,
  };

  for (const m of members ?? []) {
    const recentCheckins = recent.get(m.id) ?? 0;
    const priorCheckins = prior.get(m.id) ?? 0;
    const badge = classifyMember(
      m.membership_status,
      m.created_at,
      recentCheckins,
      priorCheckins,
    );
    out[badge] += 1;
  }
  return out;
}

function classifyMember(
  status: string | null,
  createdAt: string | null,
  recentCheckins: number,
  priorCheckins: number,
): EngagementBadge {
  if (status === "cancelled") return "Lapsed";
  if (status === "trialing") return "New";
  const joinedRecently =
    createdAt && Date.now() - new Date(createdAt).getTime() < 30 * DAY_MS;
  if (joinedRecently) return "New";
  if (status === "paused") return "At risk";
  if (recentCheckins >= 4) return "Power";
  if (recentCheckins >= 2) return "Active";
  if (recentCheckins === 1) return "Engaged";
  if (priorCheckins >= 1) return "Cooling";
  return "At risk";
}
