/*
 * Tiny helpers shared by the lib/data/* loaders.
 *
 * `logQueryError` — log a Supabase error before silently falling through
 *   to fixture data (cartographer L-03). Sentry replaces this once
 *   observability lands; the log line format is stable so a future log
 *   shipper can pattern-match on it.
 *
 * `inBypassMode` — true when TEST_AUTH_BYPASS=1 (e2e + local dev).
 *   The data layer uses this to decide whether to fall back to fixtures
 *   when a query returns zero rows. In bypass mode we render the demo
 *   personas so the test suite has stable data; in live mode (real
 *   operator session) we return [] so the UI's EmptyState surfaces
 *   instead of fictional names — that's the "fixture leaking into
 *   prod" fix the operator flagged on the first real walk-through.
 */

export function logQueryError(label: string, error: unknown): void {
  if (!error) return;
  // Pretty-print for human review; collapse to one line for shippers.
  // eslint-disable-next-line no-console -- this IS the observability hook
  console.error(`[data:${label}]`, error);
}

export function inBypassMode(): boolean {
  return process.env.TEST_AUTH_BYPASS === "1";
}

/**
 * Convenience: pick `fixture` only when running under TEST_AUTH_BYPASS,
 * otherwise return the empty value (`[]` or whatever the caller passes).
 *
 * Usage:
 *   const rows = data ?? [];
 *   if (!rows.length) return fixtureFallback(MEMBERS, []);
 */
export function fixtureFallback<T>(fixture: T, empty: T): T {
  return inBypassMode() ? fixture : empty;
}
