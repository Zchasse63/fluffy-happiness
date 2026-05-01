/*
 * Tiny helper: log a Supabase query error before silently falling
 * through to fixture data. Cartographer L-03 — pages were rendering
 * fixtures both for "DB returned 0 rows" and "DB errored" with no way
 * to tell them apart in the operator's view, and no log on the server.
 *
 * Sentry / OTEL replaces this once observability lands; the log line
 * format is stable so a future log shipper can pattern-match on it.
 */

export function logQueryError(label: string, error: unknown): void {
  if (!error) return;
  // Pretty-print for human review; collapse to one line for shippers.
  // eslint-disable-next-line no-console -- this IS the observability hook
  console.error(`[data:${label}]`, error);
}
