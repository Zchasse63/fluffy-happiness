/*
 * POST /api/ai/briefing — generate today's AI briefing on demand.
 * Triggered by a daily Inngest cron at 6 AM ET, but admins can also
 * regenerate manually from Command Center.
 *
 * Both paths run through `runBriefingForStudio` in lib/data/briefing-task.ts.
 */

import { AnthropicNotConfigured } from "@/lib/ai/claude";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { runBriefingForStudio } from "@/lib/data/briefing-task";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const profile = await requireRole("owner", "manager");
    // ?force=1 bypasses the ai_cache and forces a fresh Anthropic call.
    const force = new URL(request.url).searchParams.get("force") === "1";

    // M-08: cap forced regenerations to 5/day/studio. Cache-hit calls
    // are free (no Anthropic spend) so they stay unrate-limited.
    if (force) {
      const rl = await checkRateLimit({
        studioId: profile.studio_id,
        key: `ai:briefing:force:${profile.studio_id}`,
        max: 5,
        windowMs: 24 * 60 * 60 * 1000,
      });
      if (!rl.allowed) return rateLimitedResponse(rl);
    }

    const supabase = await createSupabaseServer();

    try {
      const briefing = await runBriefingForStudio(
        supabase,
        profile.studio_id,
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
