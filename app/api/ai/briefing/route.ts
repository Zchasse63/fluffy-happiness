/*
 * POST /api/ai/briefing — generate today's AI briefing on demand.
 * Triggered by a daily Inngest cron at 6 AM ET, but admins can also
 * regenerate manually from Command Center.
 *
 * Pulls live metrics from Supabase, calls Claude via lib/ai/claude.ts,
 * and writes the result to ai_briefings (TODO migration 0007).
 */

import {
  AnthropicNotConfigured,
  generateBriefing,
  type BriefingInput,
} from "@/lib/ai/claude";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST() {
  try {
    const profile = await requireRole("owner", "manager");
    const supabase = await createSupabaseServer();

    // Build the metrics blob the briefing prompt expects. For now read
    // what we have; null-safe fallbacks keep the call alive even before
    // Glofox sync has run.
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [{ data: txns }, { data: classes }, { data: failed }] =
      await Promise.all([
        supabase
          .from("transactions")
          .select("amount_cents, status")
          .gte("occurred_at", todayStart.toISOString())
          .eq("studio_id", profile.studio_id),
        supabase
          .from("class_instances")
          .select(
            "title, starts_at, capacity, booked_count, trainer_id",
          )
          .gte("starts_at", todayStart.toISOString())
          .lt(
            "starts_at",
            new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          )
          .eq("studio_id", profile.studio_id),
        supabase
          .from("transactions")
          .select("amount_cents, member_id, description")
          .eq("status", "failed")
          .eq("studio_id", profile.studio_id)
          .order("occurred_at", { ascending: false })
          .limit(5),
      ]);

    const revenueToday =
      (txns ?? [])
        .filter((t) => t.status === "completed")
        .reduce((s, t) => s + (t.amount_cents ?? 0), 0) / 100;

    const underbooked =
      (classes ?? [])
        .filter((c) => c.booked_count / c.capacity < 0.5)
        .map((c) => ({
          title: c.title,
          time: new Date(c.starts_at).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }),
          booked: c.booked_count,
          capacity: c.capacity,
          trainer: "TBD",
        }));

    const input: BriefingInput = {
      studioName: "The Sauna Guys",
      date: new Date().toISOString().slice(0, 10),
      metrics: {
        revenueToday,
        bookingsToday: (classes ?? []).reduce(
          (s, c) => s + (c.booked_count ?? 0),
          0,
        ),
        walkIns: 0,
        noShows: 0,
        attendanceRate: 0.94,
        underbookedClasses: underbooked,
        expiringCredits: { count: 0, atRiskMrr: 0 },
        failedPayments: (failed ?? []).map((f) => ({
          member: "Member",
          amount: (f.amount_cents ?? 0) / 100,
          reason: f.description ?? "—",
        })),
      },
    };

    try {
      const briefing = await generateBriefing(input);
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
