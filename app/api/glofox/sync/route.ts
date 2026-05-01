/*
 * POST /api/glofox/sync — incremental Glofox → Supabase sync.
 *
 * Streams NDJSON progress lines (rebuild-handoff §4.3 pattern E) so
 * Netlify's serverless functions don't time out on long imports.
 *
 * The actual sync logic lives in `lib/glofox/sync-engine.ts` so the
 * Inngest hourly cron can run the same code path without streaming.
 */

import { authErrorResponse, requireRole } from "@/lib/auth";
import { GlofoxClient, GlofoxNotConfigured } from "@/lib/glofox";
import { runGlofoxSync } from "@/lib/glofox/sync-engine";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Netlify Pro can run 5 min

export async function POST() {
  try {
    // Sync writes are system-level: require an authed owner/manager at the
    // boundary, but use the service-role client so the upserts aren't
    // gated by per-row RLS evaluation. The Inngest hourly cron uses the
    // same admin client (lib/inngest/sync.ts) — keeping the manual and
    // automated paths semantically identical (audit M-05).
    const profile = await requireRole("owner", "manager");
    const supabase = createSupabaseAdmin();

    if (!GlofoxClient.isConfigured()) {
      throw new GlofoxNotConfigured();
    }
    const glofox = GlofoxClient.fromEnv();

    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const send = (msg: object) =>
      writer.write(encoder.encode(JSON.stringify(msg) + "\n"));

    (async () => {
      try {
        await runGlofoxSync({
          supabase,
          studioId: profile.studio_id,
          glofox,
          onProgress: (event) => send(event),
        });
      } catch (err) {
        await send({
          stage: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
