/*
 * Cache helpers for `kpi_cache` and `ai_cache`. Both tables existed
 * pre-this commit but had no application reads/writes — the audit's
 * LOW-7 finding. Now used to short-circuit:
 *
 *   • Command Center metric loaders → `kpi_cache` (5-min TTL)
 *   • AI briefing generation        → `ai_cache`  (24-hour TTL on date)
 *
 * Cache misses are silent fallthroughs — never surface as errors. A
 * cache that fails to read or write should never break the page.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

const KPI_TTL_MS = 5 * 60 * 1000;

export type KpiBucket =
  | "revenue_snapshot"
  | "directory_kpis"
  | "segment_counts"
  | "revenue_overview_30d"
  | "revenue_overview_7d"
  | "revenue_overview_90d"
  | "revenue_overview_365d";

export type KpiCacheKey = {
  bucket: KpiBucket;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
};

/**
 * Read a kpi_cache entry. Returns null if not found, expired, or any
 * read error (the read is best-effort — never blocks the request).
 */
export async function readKpiCache<T>(
  supabase: SupabaseClient<Database>,
  studioId: string,
  key: KpiCacheKey,
): Promise<T | null> {
  try {
    const { data } = await supabase
      .from("kpi_cache")
      .select("metrics, computed_at")
      .eq("studio_id", studioId)
      .eq("bucket", key.bucket)
      .eq("period_start", key.periodStart)
      .eq("period_end", key.periodEnd)
      .maybeSingle();

    if (!data) return null;
    const ageMs = Date.now() - new Date(data.computed_at).getTime();
    if (ageMs > KPI_TTL_MS) return null;
    return data.metrics as T;
  } catch {
    return null;
  }
}

/**
 * Write a kpi_cache entry. Failures are swallowed so a cache write
 * problem can't take down a page render.
 */
export async function writeKpiCache<T>(
  supabase: SupabaseClient<Database>,
  studioId: string,
  key: KpiCacheKey,
  metrics: T,
): Promise<void> {
  try {
    await supabase.from("kpi_cache").upsert(
      {
        studio_id: studioId,
        bucket: key.bucket,
        period_start: key.periodStart,
        period_end: key.periodEnd,
        metrics: metrics as never,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "studio_id,bucket,period_start,period_end" },
    );
  } catch {
    // Cache writes are best-effort.
  }
}

/**
 * Convenience helper: try cache, fall through to compute, write on
 * miss. Returns the value either way.
 */
export async function withKpiCache<T>(
  supabase: SupabaseClient<Database>,
  studioId: string,
  key: KpiCacheKey,
  compute: () => Promise<T>,
): Promise<T> {
  const cached = await readKpiCache<T>(supabase, studioId, key);
  if (cached !== null) return cached;
  const fresh = await compute();
  await writeKpiCache(supabase, studioId, key, fresh);
  return fresh;
}

/* ─── ai_cache (TTL via expires_at column) ──────────────────────── */

export async function readAiCache<T>(
  supabase: SupabaseClient<Database>,
  cacheKey: string,
): Promise<T | null> {
  try {
    const { data } = await supabase
      .from("ai_cache")
      .select("payload, expires_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (!data) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;
    return data.payload as T;
  } catch {
    return null;
  }
}

export async function writeAiCache<T>(
  supabase: SupabaseClient<Database>,
  studioId: string,
  cacheKey: string,
  payload: T,
  ttlSeconds: number,
): Promise<void> {
  try {
    await supabase.from("ai_cache").upsert(
      {
        cache_key: cacheKey,
        studio_id: studioId,
        payload: payload as never,
        expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      },
      { onConflict: "cache_key" },
    );
  } catch {
    // Cache writes are best-effort.
  }
}

/* ─── Helpers ──────────────────────────────────────────────────── */

/**
 * Produce a YYYY-MM-DD date string for "today" + an offset in days.
 * Used to build deterministic cache keys for rolling windows so the
 * key changes daily without recomputing on every minute boundary.
 */
export function dateKey(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}
