/*
 * Hourly Glofox sync cron — keeps Supabase in line with Glofox's
 * source-of-truth state without an operator clicking "Sync now".
 *
 * Also responds to `studio/sync.requested` events for ad-hoc triggers
 * (e.g. after a webhook signals significant external state change).
 */

import { STUDIO_ID } from "@/lib/constants";
import { GlofoxClient, GlofoxNotConfigured } from "@/lib/glofox";
import { runGlofoxSync } from "@/lib/glofox/sync-engine";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

import { inngest, SyncRequestedEvent } from "./client";

async function runSync(studioId: string) {
  if (!GlofoxClient.isConfigured()) {
    throw new GlofoxNotConfigured();
  }
  const supabase = createSupabaseAdmin();
  const glofox = GlofoxClient.fromEnv();
  return runGlofoxSync({ supabase, studioId, glofox });
}

// Shared concurrency key so the hourly cron and on-request triggers
// draw from the same single-slot queue. Default scope is per-function;
// without an explicit shared key, two functions each get their own
// limit-of-1 and they will collide if both fire at once (e.g. a manual
// sync request landing during the hourly run).
const SYNC_CONCURRENCY = {
  scope: "env" as const,
  key: '"glofox-sync"',
  limit: 1,
};

export const hourlySync = inngest.createFunction(
  {
    id: "hourly-glofox-sync",
    retries: 2,
    concurrency: SYNC_CONCURRENCY,
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    return await step.run("sync-glofox", () => runSync(STUDIO_ID));
  },
);

export const syncOnRequest = inngest.createFunction(
  {
    id: "sync-on-request",
    retries: 2,
    concurrency: SYNC_CONCURRENCY,
    triggers: [{ event: SyncRequestedEvent }],
  },
  async ({ event, step }) => {
    return await step.run("sync-glofox", () => runSync(event.data.studioId));
  },
);
