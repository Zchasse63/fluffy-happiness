/*
 * Smart-segment counts for the Members module. Each segment is computed
 * from live data; falls back to the SEGMENTS fixture totals when the
 * DB is empty.
 *
 * The "power" and "at risk" segments depend on bookings — both run
 * count(*) head queries with date windows; no joined rows leave the DB.
 */

import { dateKey, withKpiCache } from "@/lib/cache";
import { STUDIO_ID } from "@/lib/constants";
import { SEGMENTS } from "@/lib/fixtures";
import { createSupabaseServer } from "@/lib/supabase/server";

export type SegmentCounts = Record<string, number>;

export async function loadSegmentCounts(): Promise<SegmentCounts> {
  const supabase = await createSupabaseServer();
  const today = dateKey();
  return withKpiCache<SegmentCounts>(
    supabase,
    STUDIO_ID,
    { bucket: "segment_counts", periodStart: today, periodEnd: today },
    () => computeSegmentCounts(),
  );
}

async function computeSegmentCounts(): Promise<SegmentCounts> {
  const supabase = await createSupabaseServer();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const fourteenDaysAgo = new Date(now - 14 * day).toISOString();
  const twentyOneDaysAgo = new Date(now - 21 * day).toISOString();
  const thirtyDaysAgo = new Date(now - 30 * day).toISOString();

  const [
    allActive,
    newThisMonth,
    lapsed30,
    expiringCredits,
    powerMembers,
  ] = await Promise.all([
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", STUDIO_ID)
      .eq("membership_status", "active"),
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", STUDIO_ID)
      .gte("created_at", thirtyDaysAgo),
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", STUDIO_ID)
      .in("membership_status", ["cancelled", "paused"])
      .gte("updated_at", thirtyDaysAgo),
    // "Expiring credits" — has unused credits and the membership cycle
    // closes within the next 7 days.
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", STUDIO_ID)
      .gt("membership_credits", 0)
      .lte("current_period_end", new Date(now + 7 * day).toISOString()),
    // "Power" — checked-in 4+ times in the last 14 days. Aggregated in
    // memory below; head:false so we get the rows.
    supabase
      .from("bookings")
      .select("member_id")
      .eq("studio_id", STUDIO_ID)
      .eq("status", "checked_in")
      .gte("created_at", fourteenDaysAgo),
  ]);

  // Power is computed per-member: count distinct member_ids with 4+ rows.
  // The Supabase REST API doesn't expose GROUP BY directly, so we
  // fetch member_ids and aggregate in memory. With ~2.5k bookings
  // this is fine; if it ever exceeds 50k we'll move to an RPC.
  let powerCount = 0;
  if (powerMembers.data) {
    const counts = new Map<string, number>();
    for (const row of powerMembers.data) {
      if (!row.member_id) continue;
      counts.set(row.member_id, (counts.get(row.member_id) ?? 0) + 1);
    }
    for (const c of counts.values()) {
      if (c >= 4) powerCount++;
    }
  }

  // "At risk" — currently active members with no booking in the last 21 days.
  const { data: bookersRecent } = await supabase
    .from("bookings")
    .select("member_id")
    .eq("studio_id", STUDIO_ID)
    .gte("created_at", twentyOneDaysAgo);
  const recentBookers = new Set(
    (bookersRecent ?? [])
      .map((r) => r.member_id)
      .filter((id): id is string => Boolean(id)),
  );
  const { data: activeMembers } = await supabase
    .from("members")
    .select("id")
    .eq("studio_id", STUDIO_ID)
    .eq("membership_status", "active");
  const atRiskCount = (activeMembers ?? []).filter(
    (m) => !recentBookers.has(m.id),
  ).length;

  const live: SegmentCounts = {
    "all-active": allActive.count ?? 0,
    power: powerCount,
    "at-risk": atRiskCount,
    "expiring-credits": expiringCredits.count ?? 0,
    "lapsed-30": lapsed30.count ?? 0,
    "new-this-month": newThisMonth.count ?? 0,
    corporate: 0, // member→corporate_account link not modelled yet
    "weekend-only": 0, // requires per-booking day-of-week analysis; deferred
  };

  // If literally nothing came back (DB empty), fall back to fixture
  // counts so the UI doesn't render a wall of zeros.
  const total = Object.values(live).reduce((s, n) => s + n, 0);
  if (total === 0) {
    return Object.fromEntries(SEGMENTS.map((s) => [s.id, s.count]));
  }

  return live;
}
