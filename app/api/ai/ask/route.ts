/*
 * POST /api/ai/ask — Ask Meridian. Free-form Q&A over the studio's
 * data. We pre-load a compact studio context (active members, today's
 * classes, last-week revenue) and pass it to Claude with the question.
 *
 * Owner/manager only — sensitive data lands in the LLM.
 */

import { z } from "zod";

import {
  AnthropicNotConfigured,
  askMeridian,
} from "@/lib/ai/claude";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const Body = z.object({
  question: z.string().min(2).max(500),
});

const DAY_MS = 24 * 60 * 60 * 1000;

async function buildStudioContext(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  studioId: string,
): Promise<string> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(todayStart.getTime() - 7 * DAY_MS);
  const todayEnd = new Date(todayStart.getTime() + DAY_MS);

  const [
    { count: activeMembers },
    { count: trialMembers },
    { data: classesToday },
    { data: weekTxns },
    { count: failedTxns },
  ] = await Promise.all([
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", studioId)
      .eq("membership_status", "active"),
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", studioId)
      .eq("membership_status", "trialing"),
    supabase
      .from("class_instances")
      .select("title, starts_at, capacity, booked_count")
      .eq("studio_id", studioId)
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", todayEnd.toISOString())
      .order("starts_at"),
    supabase
      .from("transactions")
      .select("amount_cents, status")
      .eq("studio_id", studioId)
      .eq("status", "completed")
      .gte("occurred_at", weekAgo.toISOString()),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", studioId)
      .eq("status", "failed")
      .gte("occurred_at", weekAgo.toISOString()),
  ]);

  const weekRevenue =
    ((weekTxns ?? []) as Array<{ amount_cents: number | null }>).reduce(
      (s, t) => s + (t.amount_cents ?? 0),
      0,
    ) / 100;

  const classes = ((classesToday ?? []) as Array<{
    title: string;
    starts_at: string;
    capacity: number;
    booked_count: number;
  }>)
    .map(
      (c) =>
        `  - ${c.title} @ ${new Date(c.starts_at).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })} · ${c.booked_count}/${c.capacity}`,
    )
    .join("\n");

  return [
    `Studio: The Sauna Guys (Tampa, FL)`,
    `Active members: ${activeMembers ?? 0}`,
    `Trial members:  ${trialMembers ?? 0}`,
    `Failed payments (7d): ${failedTxns ?? 0}`,
    `Revenue (7d, completed): $${weekRevenue.toFixed(2)}`,
    `Classes today (${classesToday?.length ?? 0}):`,
    classes || "  (none scheduled)",
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const profile = await requireRole("owner", "manager");
    const body = Body.parse(await request.json());

    // M-08: cap Anthropic spend per user. 20 calls / hour / actor is
    // generous for genuine operator use, plenty restrictive for a
    // compromised credential or a runaway loop.
    const rl = await checkRateLimit({
      studioId: profile.studio_id,
      key: `ai:ask:${profile.id}`,
      max: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.allowed) return rateLimitedResponse(rl);

    const supabase = await createSupabaseServer();
    const context = await buildStudioContext(supabase, profile.studio_id);

    try {
      const result = await askMeridian(body.question, context);
      return Response.json(result);
    } catch (err) {
      if (err instanceof AnthropicNotConfigured) {
        return Response.json(
          {
            error: err.message,
            answer:
              "AI is not configured — set ANTHROPIC_API_KEY to enable Ask Meridian.",
            followups: [],
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
