/*
 * POST /api/glofox/sync — incremental Glofox → Supabase sync.
 *
 * Streams NDJSON progress lines (rebuild-handoff §4.3 pattern E) so
 * Netlify's serverless functions don't time out on long imports.
 *
 * The actual sync logic lives in `lib/glofox/sync-engine.ts` so the
 * Inngest hourly cron can run the same code path without streaming.
 */

import { STUDIO_ID } from "@/lib/constants";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { GlofoxClient, GlofoxNotConfigured } from "@/lib/glofox";
import { runGlofoxSync } from "@/lib/glofox/sync-engine";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Netlify Pro can run 5 min

/** Constant-time compare so a CRON_SECRET probe can't be timed. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: Request) {
  try {
    // Two trigger paths, same code path beneath:
    //   1. Authed owner/manager via the dashboard (or curl with cookie).
    //   2. `Authorization: Bearer <CRON_SECRET>` for cron jobs and
    //      one-off ops backfills. The secret is generated via
    //      `openssl rand -base64 32` and stored as CRON_SECRET — only
    //      the operator + Netlify env have it.
    // Both paths use the service-role admin client so upserts aren't
    // gated by per-row RLS (audit M-05).
    const cronSecret = process.env.CRON_SECRET;
    const auth = request.headers.get("authorization") ?? "";
    const presentedSecret = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const isCronAuthed =
      cronSecret !== undefined &&
      cronSecret.length > 0 &&
      presentedSecret.length > 0 &&
      timingSafeEqual(presentedSecret, cronSecret);

    let studioId: string;
    if (isCronAuthed) {
      studioId = STUDIO_ID;
    } else {
      const profile = await requireRole("owner", "manager");
      studioId = profile.studio_id;
    }

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
          studioId,
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
