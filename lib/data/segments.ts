/*
 * Smart-segment counts for the Members module.
 *
 * Backed by migration 0019: the `segment_assignments` view assigns each
 * person to one or more of the 13 behavioral segments and the
 * `segment_counts(studio_id)` RPC returns per-segment counts plus the
 * stale-credit liability total in one round trip.
 *
 * Segment definitions are in the migration; UI metadata (display name,
 * actionable description) lives in lib/fixtures.ts as the SEGMENTS array.
 *
 * The loader is cached for 1h via withKpiCache because the underlying
 * view does several aggregations across bookings + transactions; cheap
 * but not free at >1k people.
 */

import { dateKey, withKpiCache } from "@/lib/cache";
import { STUDIO_ID } from "@/lib/constants";
import { fixtureFallback } from "@/lib/data/_log";
import { SEGMENTS } from "@/lib/fixtures";
import { createSupabaseServer } from "@/lib/supabase/server";

export type SegmentCounts = Record<string, number>;

export type SegmentMetrics = {
  counts: SegmentCounts;
  /** Stale-credit liability in cents — sum of unused credits × $40 */
  staleCreditLiabilityCents: number;
};

export async function loadSegmentCounts(): Promise<SegmentCounts> {
  const m = await loadSegmentMetrics();
  return m.counts;
}

export async function loadSegmentMetrics(): Promise<SegmentMetrics> {
  const supabase = await createSupabaseServer();
  const today = dateKey();
  return withKpiCache<SegmentMetrics>(
    supabase,
    STUDIO_ID,
    { bucket: "segment_counts", periodStart: today, periodEnd: today },
    () => computeSegmentMetrics(),
  );
}

async function computeSegmentMetrics(): Promise<SegmentMetrics> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("segment_counts", {
    p_studio_id: STUDIO_ID,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[data:segments.counts]", error);
  }

  const rows = (data ?? []) as Array<{
    segment_id: string;
    member_count: number;
    stale_credit_value: number;
  }>;

  if (!rows.length) {
    // No live data — render the fixture demo set under bypass, or all
    // zeros in live mode (the Segments page will show the empty state).
    return fixtureFallback(
      {
        counts: Object.fromEntries(SEGMENTS.map((s) => [s.id, s.count])),
        staleCreditLiabilityCents: 0,
      },
      {
        counts: Object.fromEntries(SEGMENTS.map((s) => [s.id, 0])),
        staleCreditLiabilityCents: 0,
      },
    );
  }

  const counts: SegmentCounts = {};
  let staleCreditLiabilityCents = 0;
  for (const r of rows) {
    counts[r.segment_id] = r.member_count;
    if (r.segment_id === "stale-credits") {
      staleCreditLiabilityCents = r.stale_credit_value ?? 0;
    }
  }
  // Backfill zeros for any segment we didn't see — keeps the UI grid
  // stable instead of cards disappearing as the data shifts.
  for (const s of SEGMENTS) {
    if (counts[s.id] == null) counts[s.id] = 0;
  }
  return { counts, staleCreditLiabilityCents };
}
