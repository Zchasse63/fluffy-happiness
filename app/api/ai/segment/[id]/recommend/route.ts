/*
 * POST /api/ai/segment/[id]/recommend — generate an AI outreach
 * recommendation for a behavioral segment. Pulls a sample of people in
 * the segment + segment metadata, calls Claude, returns subject + email
 * body + SMS variant + recommended channel + rationale.
 *
 * Cached for 1h via ai_cache (per studio + segment + date).
 *
 * Auth + rate limit pattern mirrors /api/ai/ask:
 *   - requireRole('owner','manager')
 *   - 20 calls per actor per hour
 */

import { AnthropicNotConfigured } from "@/lib/ai/claude";
import { generateSegmentRecommendation } from "@/lib/ai/segment-recs";
import { authErrorResponse, requireRole } from "@/lib/auth";
import { loadSegmentPeople } from "@/lib/data/people";
import { loadSegmentCounts } from "@/lib/data/segments";
import { SEGMENTS } from "@/lib/fixtures";
import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { createSupabaseServer } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

export async function POST(
  request: Request,
  { params }: { params: Params },
) {
  try {
    const profile = await requireRole("owner", "manager");
    const { id } = await params;

    const segment = SEGMENTS.find((s) => s.id === id);
    if (!segment) {
      return Response.json({ error: "Unknown segment" }, { status: 404 });
    }

    const rl = await checkRateLimit({
      studioId: profile.studio_id,
      key: `ai:segment-rec:${profile.id}`,
      max: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.allowed) return rateLimitedResponse(rl);

    const force =
      new URL(request.url).searchParams.get("force") === "1";

    const supabase = await createSupabaseServer();

    // Fetch segment metadata + people in parallel.
    const [counts, people] = await Promise.all([
      loadSegmentCounts(),
      loadSegmentPeople(id, 8),
    ]);

    try {
      const rec = await generateSegmentRecommendation(
        supabase,
        profile.studio_id,
        {
          id: segment.id,
          name: segment.name,
          description: segment.description,
          priority: segment.priority,
          totalPeople: counts[segment.id] ?? 0,
          samplePeople: people.map((p) => ({
            fullName: p.fullName,
            membershipTier: p.membershipTier,
            visits30d: p.visits30d,
            lastVisitAt: p.lastVisitAt,
            totalSpendCents: p.totalSpendCents,
          })),
        },
        { force },
      );
      return Response.json(rec);
    } catch (err) {
      if (err instanceof AnthropicNotConfigured) {
        return Response.json(
          {
            error: err.message,
            fallback: true,
            segmentId: segment.id,
            segmentName: segment.name,
            subject: "AI not configured",
            emailBody:
              "Set ANTHROPIC_API_KEY to enable per-segment outreach drafts.",
            smsVariant: "",
            recommendedChannel: "email",
            rationale: "AI disabled.",
            priority: segment.priority,
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
