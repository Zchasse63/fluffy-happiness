/*
 * Daily AI briefing cron — runs at 6 AM ET so the Command Center has a
 * fresh briefing waiting before the operator opens the app.
 *
 * Also responds to ad-hoc `studio/briefing.requested` events for
 * regeneration triggers from elsewhere in the app.
 *
 * Trust boundary: the on-request handler runs against
 * `event.data.studioId` with the service-role client, which bypasses
 * RLS. INNGEST_SIGNING_KEY (Wave G) is the primary defense — without
 * it, /api/inngest is open. As a defense-in-depth secondary check we
 * whitelist allowed studio ids so a forged event can't run a briefing
 * for an unknown tenant (audit M-09).
 */

import { AnthropicNotConfigured } from "@/lib/ai/claude";
import { STUDIO_ID } from "@/lib/constants";
import { runBriefingForStudio } from "@/lib/data/briefing-task";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

import { BriefingRequestedEvent, inngest } from "./client";

/** Studio ids the briefing function will accept on-request. Today
 *  this is just the single tenant; expand when multi-tenant lands. */
const ALLOWED_STUDIO_IDS = new Set<string>([STUDIO_ID]);

export const dailyBriefing = inngest.createFunction(
  {
    id: "daily-briefing",
    retries: 2,
    triggers: [{ cron: "TZ=America/New_York 0 6 * * *" }],
  },
  async ({ step }) => {
    return await step.run("generate-briefing", async () => {
      try {
        const supabase = createSupabaseAdmin();
        const briefing = await runBriefingForStudio(supabase, STUDIO_ID);
        return {
          studioId: STUDIO_ID,
          date: briefing.generatedAt.slice(0, 10),
          insightCount: briefing.insights.length,
        };
      } catch (err) {
        if (err instanceof AnthropicNotConfigured) {
          // Soft skip — config gap, not a failure worth retrying.
          return { skipped: true, reason: err.message };
        }
        throw err;
      }
    });
  },
);

export const briefingOnRequest = inngest.createFunction(
  {
    id: "briefing-on-request",
    retries: 2,
    triggers: [{ event: BriefingRequestedEvent }],
  },
  async ({ event, step }) => {
    return await step.run("generate-briefing", async () => {
      // M-09: refuse to run for studios not in the whitelist. This is a
      // defense in depth behind INNGEST_SIGNING_KEY, not a replacement.
      if (!ALLOWED_STUDIO_IDS.has(event.data.studioId)) {
        return {
          skipped: true,
          reason: `studio ${event.data.studioId} not in whitelist`,
        };
      }
      try {
        const supabase = createSupabaseAdmin();
        const briefing = await runBriefingForStudio(
          supabase,
          event.data.studioId,
        );
        return {
          studioId: event.data.studioId,
          date: briefing.generatedAt.slice(0, 10),
          insightCount: briefing.insights.length,
        };
      } catch (err) {
        // Same soft-skip rule as the daily cron — don't burn retries
        // on a config gap that won't resolve between attempts.
        if (err instanceof AnthropicNotConfigured) {
          return { skipped: true, reason: err.message };
        }
        throw err;
      }
    });
  },
);
