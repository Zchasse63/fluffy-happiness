/*
 * Netlify Scheduled Function — runs hourly and triggers the Glofox
 * → Supabase sync route. Replaces the never-activated Inngest cron
 * (lib/inngest/sync.ts:36) which has been dormant because
 * INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY are not set in production.
 *
 * Authenticates with the same CRON_SECRET that the route already
 * accepts (`Authorization: Bearer <secret>`). The route returns an
 * NDJSON stream of progress events; we don't consume it — fire and
 * forget, the route runs on its own serverless invocation.
 */

import type { Config } from "@netlify/functions";

export default async () => {
  const url = process.env.URL ?? "https://meridian.netlify.app";
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response(
      JSON.stringify({ error: "CRON_SECRET not set" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  const startedAt = Date.now();
  const res = await fetch(`${url}/api/glofox/sync`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  // Drain the NDJSON body so the upstream serverless invocation
  // doesn't hang on backpressure. We don't surface the events back
  // to Netlify — the operator can read them via Supabase logs.
  const text = await res.text();
  const ms = Date.now() - startedAt;
  return new Response(
    JSON.stringify({
      status: res.status,
      durationMs: ms,
      lastLines: text.split("\n").filter(Boolean).slice(-5),
    }),
    { headers: { "content-type": "application/json" } },
  );
};

export const config: Config = {
  // Run at the top of every hour. Same cadence as the dormant
  // Inngest cron at lib/inngest/sync.ts:41.
  schedule: "0 * * * *",
};
