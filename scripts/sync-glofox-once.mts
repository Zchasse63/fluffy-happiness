/*
 * One-off: run the Glofox → Supabase sync engine against the env-pointed
 * Supabase project using the service-role admin client. Same code path
 * the Inngest hourly cron uses, just kicked off manually for the
 * first-time backfill before the cron is wired (Wave G).
 *
 * Run: npx tsx scripts/sync-glofox-once.mts
 *
 * Reads .env.local from the repo root; aborts if any required Glofox or
 * Supabase env var is missing. Glofox stays read-only — every method on
 * GlofoxClient is enumerated in tests/glofox/SAFETY.md.
 */

import "dotenv/config";

import { GlofoxClient } from "../lib/glofox/client";
import { runGlofoxSync, type SyncProgress } from "../lib/glofox/sync-engine";
import { createSupabaseAdmin } from "../lib/supabase/admin";

const STUDIO_ID = "11111111-1111-1111-1111-111111111111";

async function main() {
  if (!GlofoxClient.isConfigured()) {
    console.error("Glofox env not configured — refusing to run.");
    process.exit(1);
  }

  const glofox = GlofoxClient.fromEnv();
  const supabase = createSupabaseAdmin();
  const startedAt = Date.now();

  console.log("Starting Glofox → Supabase sync against",
    process.env.NEXT_PUBLIC_SUPABASE_URL);

  const counts = await runGlofoxSync({
    supabase,
    studioId: STUDIO_ID,
    glofox,
    onProgress: (event: SyncProgress) => {
      const ts = ((Date.now() - startedAt) / 1000).toFixed(1);
      if (event.stage === "error") {
        console.error(`[+${ts}s] ERROR ${event.message}`);
      } else if ("count" in event) {
        console.log(`[+${ts}s] ${event.stage.padEnd(14)} ${event.count}`);
      } else {
        console.log(`[+${ts}s] ${event.stage}`);
      }
    },
  });

  console.log("");
  console.log("Final counts:", JSON.stringify(counts, null, 2));
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
