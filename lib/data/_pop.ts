/*
 * Period-over-period delta helper.
 *
 * Pre-2026-05-08, every KPI strip on the dashboard rendered a hardcoded
 * "+0" / "+0%" delta because no PoP comparison existed. Operators saw
 * a sea of placeholder badges that looked like change-trackers but
 * weren't. This module replaces them with real comparisons.
 *
 * Pattern: the caller specifies a table, an aggregate (count or
 * sum_cents), an optional filter, the date column to bucket on, and a
 * window length. The helper runs two parallel queries — current
 * period and the equal-length prior period — and returns formatted
 * absolute + percent deltas.
 *
 * Returns DeltaResult.label as a presentation-ready string ("+12%",
 * "+25", "—") so KPI cards can drop it straight into KpiCardItem.delta
 * without per-page formatting code.
 */

import { STUDIO_ID } from "@/lib/constants";
import { logQueryError } from "@/lib/data/_log";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * Tables the PoP helper knows how to query. Using a literal union
 * here (rather than `string`) gives us autocomplete + protects against
 * typos at compile time. Add a table name only when you've confirmed
 * the date column you want to bucket on.
 */
export type PoPTable =
  | "members"
  | "transactions"
  | "bookings"
  | "leads"
  | "campaigns";

export type PoPAggregate = "count" | "sum_cents";

export type LoadPoPDeltaParams = {
  table: PoPTable;
  /** Date column to bucket on (default: created_at). */
  dateColumn?: string;
  /** Length of each window in days. */
  periodDays: number;
  aggregate: PoPAggregate;
  /** Column name for sum_cents (default: amount_cents). */
  sumColumn?: string;
  /** Equality filters, e.g. { status: "completed" }. */
  filter?: Record<string, string | boolean>;
  /** Format for the label. "absolute" → "+25"; "percent" → "+12%". */
  display?: "absolute" | "percent";
};

export type DeltaResult = {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number;
  /** Display string ready for KpiCardItem.delta. */
  label: string;
};

/**
 * Format a number as a +/- absolute or percent label. Falls back to
 * "—" when both periods are zero (avoid "+0%" noise).
 */
function formatLabel(
  current: number,
  delta: number,
  deltaPct: number,
  display: "absolute" | "percent",
): string {
  if (current === 0 && delta === 0) return "—";
  if (display === "percent") {
    if (deltaPct === 0) return "+0%";
    const sign = deltaPct > 0 ? "+" : "";
    return `${sign}${deltaPct}%`;
  }
  if (delta === 0) return "+0";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toLocaleString()}`;
}

export async function loadPoPDelta(
  params: LoadPoPDeltaParams,
): Promise<DeltaResult> {
  const {
    table,
    periodDays,
    aggregate,
    filter,
    dateColumn = "created_at",
    sumColumn = "amount_cents",
    display = aggregate === "sum_cents" ? "percent" : "absolute",
  } = params;
  const supabase = await createSupabaseServer();

  const now = new Date();
  const currentStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const previousStart = new Date(
    now.getTime() - 2 * periodDays * 24 * 60 * 60 * 1000,
  );

  // Build a base query for one period. The Supabase typed query
  // builder's `.eq` is strongly typed on column name; we use `as
  // never` to bridge the dynamic-filter case (the filter map is
  // user-provided per call site, not statically typed). The eq
  // checks happen at runtime, so the stricter compile-time type would
  // be over-constraining without preventing real misuse.
  function buildScope(
    start: Date,
    end: Date,
    countOnly: boolean,
  ) {
    let q = supabase
      .from(table)
      .select(countOnly ? "id" : sumColumn, countOnly ? { count: "exact", head: true } : {}) as never as {
      eq: (col: string, val: unknown) => unknown;
      gte: (col: string, val: unknown) => unknown;
      lt: (col: string, val: unknown) => unknown;
      then: <T>(cb: (r: { data: Record<string, unknown>[] | null; count: number | null; error: unknown }) => T) => Promise<T>;
    };
    q = (q.eq("studio_id", STUDIO_ID) as never as typeof q);
    if (filter) {
      for (const [k, v] of Object.entries(filter)) {
        q = (q.eq(k, v) as never as typeof q);
      }
    }
    q = (q.gte(dateColumn, start.toISOString()) as never as typeof q);
    q = (q.lt(dateColumn, end.toISOString()) as never as typeof q);
    return q;
  }

  let currentN: number;
  let previousN: number;

  if (aggregate === "count") {
    const [r1, r2] = await Promise.all([
      buildScope(currentStart, now, true) as unknown as Promise<{
        count: number | null;
        error: unknown;
      }>,
      buildScope(previousStart, currentStart, true) as unknown as Promise<{
        count: number | null;
        error: unknown;
      }>,
    ]);
    logQueryError(`pop.${table}.count.current`, r1.error);
    logQueryError(`pop.${table}.count.previous`, r2.error);
    currentN = r1.count ?? 0;
    previousN = r2.count ?? 0;
  } else {
    const [r1, r2] = await Promise.all([
      buildScope(currentStart, now, false) as unknown as Promise<{
        data: Record<string, unknown>[] | null;
        error: unknown;
      }>,
      buildScope(previousStart, currentStart, false) as unknown as Promise<{
        data: Record<string, unknown>[] | null;
        error: unknown;
      }>,
    ]);
    logQueryError(`pop.${table}.sum.current`, r1.error);
    logQueryError(`pop.${table}.sum.previous`, r2.error);
    currentN = (r1.data ?? []).reduce(
      (s, r) => s + ((r[sumColumn] as number) ?? 0),
      0,
    );
    previousN = (r2.data ?? []).reduce(
      (s, r) => s + ((r[sumColumn] as number) ?? 0),
      0,
    );
  }

  const delta = currentN - previousN;
  const deltaPct = previousN === 0
    ? (currentN > 0 ? 100 : 0)
    : Math.round(((currentN - previousN) / previousN) * 100);

  return {
    current: currentN,
    previous: previousN,
    delta,
    deltaPct,
    label: formatLabel(currentN, delta, deltaPct, display),
  };
}
