/*
 * POST /api/ai/briefing — generate today's AI briefing on demand.
 * Triggered by a daily Inngest cron at 6 AM ET, but admins can also
 * regenerate manually from Command Center.
 *
 * Both paths run through `runBriefingForStudio` in lib/data/briefing-task.ts.
 */

import { AnthropicNotConfigured } from "@/lib/ai/claude";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { STUDIO_ID } from "@/lib/constants";
import { runBriefingForStudio } from "@/lib/data/briefing-task";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Constant-time compare so a CRON_SECRET probe can't be timed. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request) {
  try {
    // Two trigger paths (mirrors /api/glofox/sync):
    //   1. Authed owner/manager via dashboard.
    //   2. Authorization: Bearer <CRON_SECRET> for the daily Inngest
    //      cron AND for ops backfills (initial briefing generation
    //      before Inngest is wired).
    const cronSecret = process.env.CRON_SECRET;
    const auth = request.headers.get("authorization") ?? "";
    const presented = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const isCronAuthed =
      cronSecret !== undefined &&
      cronSecret.length > 0 &&
      presented.length > 0 &&
      timingSafeEqual(presented, cronSecret);

    let studioId: string;
    let supabase;
    if (isCronAuthed) {
      studioId = STUDIO_ID;
      supabase = createSupabaseAdmin();
    } else {
      const profile = await requireRole("owner", "manager");
      studioId = profile.studio_id;
      supabase = await createSupabaseServer();
    }

    // ?force=1 bypasses the ai_cache and forces a fresh Anthropic call.
    const force = new URL(request.url).searchParams.get("force") === "1";

    // M-08: cap forced regenerations to 5/day/studio. Cron-secret callers
    // are trusted (signing-key-equivalent) and skip the cap. Cache-hit
    // calls are free (no Anthropic spend) so they stay unrate-limited.
    if (force && !isCronAuthed) {
      const rl = await checkRateLimit({
        studioId,
        key: `ai:briefing:force:${studioId}`,
        max: 5,
        windowMs: 24 * 60 * 60 * 1000,
      });
      if (!rl.allowed) return rateLimitedResponse(rl);
    }

    try {
      const briefing = await runBriefingForStudio(
        supabase,
        studioId,
        undefined,
        { force },
      );
      return Response.json(briefing);
    } catch (err) {
      if (err instanceof AnthropicNotConfigured) {
        return Response.json(
          {
            error: err.message,
            fallback: true,
            insights: [
              {
                rank: "P1",
                tone: "warn",
                kicker: "AI disabled",
                headline: "Anthropic API key not configured.",
                body: "Set ANTHROPIC_API_KEY in your environment to enable AI briefings.",
                action: "Configure",
              },
            ],
          },
          { status: 503 },
        );
      }
      throw err;
    }
  } catch (err) {
    return authErrorResponse(err);
  }
}
