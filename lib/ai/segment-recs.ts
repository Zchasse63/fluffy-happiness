/*
 * AI per-segment outreach recommendation. Takes a segment id + sample of
 * people in it, asks Claude Sonnet to draft one outreach campaign tuned
 * to that cohort: subject, email body, short SMS variant, recommended
 * channel.
 *
 * Cached for 1h via ai_cache (segments shift faster than the daily
 * briefing). Per-studio + per-segment cache key.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { CLAUDE_MODELS, getClaude } from "@/lib/ai/claude";
import { readAiCache, writeAiCache } from "@/lib/cache";
import type { Database } from "@/lib/supabase/database.types";

const TTL_SECONDS = 60 * 60; // 1h

export type SegmentRecommendation = {
  segmentId: string;
  segmentName: string;
  subject: string;
  emailBody: string;
  smsVariant: string;
  recommendedChannel: "email" | "sms" | "both";
  rationale: string;
  /** "P0" | "P1" | "P2" — operator priority, mirrors the segment metadata. */
  priority: string;
};

type SegmentSample = {
  id: string;
  name: string;
  description: string;
  priority: string;
  totalPeople: number;
  samplePeople: Array<{
    fullName: string | null;
    membershipTier: string | null;
    visits30d: number;
    lastVisitAt: string | null;
    totalSpendCents: number;
  }>;
};

const SYSTEM_PROMPT = [
  "You write short, on-brand outreach for The Sauna Guys, a Tampa sauna + cold plunge studio.",
  "Voice: warm, direct, never pushy. No emojis. No exclamation marks more than once per message.",
  "Always reference one or two concrete behavioral signals from the segment so the recipient feels seen, not blasted.",
  "Email body: 3 short paragraphs maximum. Plain text, no markdown headers.",
  "SMS variant: 160 chars max, single sentence + CTA.",
  "Subject lines: under 50 chars, no clickbait.",
  "If the segment is high-conversion-likelihood (e.g. Hooked - urgent), include a specific 10% off membership offer with no expiration date called out.",
  "If the segment hasn't bought anything (cold lead, sampler, first-class-free), invite them in for a free intro session — never offer money discounts.",
  "Output ONLY valid JSON matching this exact shape:",
  '{"subject": "...", "emailBody": "...", "smsVariant": "...", "recommendedChannel": "email|sms|both", "rationale": "..."}',
  "rationale = one sentence on why this approach for this segment.",
].join("\n");

function buildUserPrompt(sample: SegmentSample): string {
  const peopleLines = sample.samplePeople
    .slice(0, 8)
    .map((p) => {
      const last =
        p.lastVisitAt == null
          ? "never"
          : `${Math.floor((Date.now() - new Date(p.lastVisitAt).getTime()) / (24 * 60 * 60 * 1000))}d ago`;
      return `- ${p.fullName ?? "(no name)"} · tier: ${p.membershipTier ?? "—"} · 30d visits: ${p.visits30d} · last visit: ${last} · ltv: $${(p.totalSpendCents / 100).toFixed(0)}`;
    })
    .join("\n");

  return [
    `Segment: ${sample.name}`,
    `Priority: ${sample.priority}`,
    `Total people in segment: ${sample.totalPeople}`,
    `Description: ${sample.description}`,
    "",
    `Sample of up to 8 people in this segment:`,
    peopleLines,
    "",
    `Draft one outreach campaign for this segment. Follow the system rules. Return ONLY the JSON.`,
  ].join("\n");
}

export async function generateSegmentRecommendation(
  supabase: SupabaseClient<Database>,
  studioId: string,
  sample: SegmentSample,
  options: { force?: boolean } = {},
): Promise<SegmentRecommendation> {
  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = `segment_rec:${studioId}:${sample.id}:${today}`;

  if (!options.force) {
    const cached = await readAiCache<SegmentRecommendation>(supabase, cacheKey);
    if (cached) return cached;
  }

  const claude = getClaude();
  const result = await claude.messages.create({
    model: CLAUDE_MODELS.briefing,
    max_tokens: 800,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserPrompt(sample) }],
  });

  const text = result.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");

  // Pull the JSON block out — sometimes Claude emits prose around it.
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`Segment rec parse failed: no JSON in response`);
  }
  const parsed = JSON.parse(match[0]) as Partial<SegmentRecommendation>;

  const rec: SegmentRecommendation = {
    segmentId: sample.id,
    segmentName: sample.name,
    subject: parsed.subject ?? "",
    emailBody: parsed.emailBody ?? "",
    smsVariant: parsed.smsVariant ?? "",
    recommendedChannel:
      parsed.recommendedChannel === "sms" || parsed.recommendedChannel === "both"
        ? parsed.recommendedChannel
        : "email",
    rationale: parsed.rationale ?? "",
    priority: sample.priority,
  };

  await writeAiCache(supabase, studioId, cacheKey, rec, TTL_SECONDS);

  return rec;
}
