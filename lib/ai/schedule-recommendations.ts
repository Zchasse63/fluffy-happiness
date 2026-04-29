/*
 * AI schedule optimization — feeds a snapshot of the studio's recent
 * scheduling data to Claude Sonnet and asks for three IDA-shaped
 * recommendations the operator can act on.
 *
 * Cached for 24h via `ai_cache` (keyed on studio + date) so repeat
 * loads don't burn Anthropic quota.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { CLAUDE_MODELS, getClaude } from "@/lib/ai/claude";
import { readAiCache, writeAiCache } from "@/lib/cache";
import { STUDIO_ID } from "@/lib/constants";
import type { Database } from "@/lib/supabase/database.types";

const DAY_MS = 24 * 60 * 60 * 1000;
const TTL_SECONDS = 22 * 60 * 60; // ~daily

export type ScheduleRecommendation = {
  rank: "P1" | "P2" | "P3";
  tone: "neg" | "warn" | "info" | "pos";
  kicker: string;
  headline: string;
  data: Array<[string, string]>;
  body: string;
  action: string;
  altAction?: string;
};

export type ScheduleSnapshot = {
  windowDays: number;
  classCount: number;
  byDayHourFill: Array<{
    dayOfWeek: number; // 0=Mon..6=Sun
    hour: number;
    avgFill: number;
    count: number;
    capacity: number;
  }>;
  underbookedClasses: Array<{
    title: string;
    weekday: string;
    hour: string;
    avgFill: number;
    occurrences: number;
    capacity: number;
  }>;
  topPerformers: Array<{
    title: string;
    weekday: string;
    hour: string;
    avgFill: number;
    occurrences: number;
  }>;
};

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmtHour(hour: number): string {
  const ampm = hour < 12 ? "AM" : "PM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${ampm}`;
}

export async function buildScheduleSnapshot(
  supabase: SupabaseClient<Database>,
  studioId: string,
  windowDays = 30,
): Promise<ScheduleSnapshot> {
  const since = new Date(Date.now() - windowDays * DAY_MS).toISOString();
  const { data } = await supabase
    .from("class_instances")
    .select("title, starts_at, capacity, booked_count")
    .eq("studio_id", studioId)
    .gte("starts_at", since);

  const rows = data ?? [];

  type Bucket = { fillSum: number; count: number; capacity: number };
  const dayHour = new Map<string, Bucket>();
  const slotKey = new Map<
    string,
    { title: string; dayOfWeek: number; hour: number; bucket: Bucket }
  >();

  for (const r of rows) {
    const cap = r.capacity ?? 0;
    if (!cap) continue;
    const fill = Math.min(1, (r.booked_count ?? 0) / cap);
    const d = new Date(r.starts_at);
    const dow = (d.getDay() + 6) % 7;
    const hour = d.getHours();

    const dhKey = `${dow}-${hour}`;
    const dh = dayHour.get(dhKey) ?? { fillSum: 0, count: 0, capacity: 0 };
    dh.fillSum += fill;
    dh.count += 1;
    dh.capacity += cap;
    dayHour.set(dhKey, dh);

    const sKey = `${r.title ?? "Class"}::${dow}::${hour}`;
    const slot =
      slotKey.get(sKey) ??
      ({
        title: r.title ?? "Class",
        dayOfWeek: dow,
        hour,
        bucket: { fillSum: 0, count: 0, capacity: cap },
      });
    slot.bucket.fillSum += fill;
    slot.bucket.count += 1;
    slotKey.set(sKey, slot);
  }

  const byDayHourFill = Array.from(dayHour.entries()).map(([k, v]) => {
    const [dow, h] = k.split("-").map(Number);
    return {
      dayOfWeek: dow,
      hour: h,
      avgFill: v.count ? Math.round((v.fillSum / v.count) * 100) : 0,
      count: v.count,
      capacity: Math.round(v.capacity / v.count),
    };
  });

  const slots = Array.from(slotKey.values()).map((s) => ({
    title: s.title,
    weekday: DOW[s.dayOfWeek],
    hour: fmtHour(s.hour),
    avgFill: s.bucket.count
      ? Math.round((s.bucket.fillSum / s.bucket.count) * 100)
      : 0,
    occurrences: s.bucket.count,
    capacity: s.bucket.capacity,
  }));

  const underbookedClasses = slots
    .filter((s) => s.occurrences >= 3 && s.avgFill < 50)
    .sort((a, b) => a.avgFill - b.avgFill)
    .slice(0, 8);

  const topPerformers = slots
    .filter((s) => s.occurrences >= 3 && s.avgFill >= 80)
    .sort((a, b) => b.avgFill - a.avgFill)
    .slice(0, 8)
    .map(({ title, weekday, hour, avgFill, occurrences }) => ({
      title,
      weekday,
      hour,
      avgFill,
      occurrences,
    }));

  return {
    windowDays,
    classCount: rows.length,
    byDayHourFill,
    underbookedClasses,
    topPerformers,
  };
}

const SYSTEM = `You are an operations analyst for a single boutique sauna studio in Tampa ("The Sauna Guys"). The operator runs the place hands-on; they want concrete schedule changes, not strategy framing.

Output exactly 3 ranked schedule recommendations:
- P1 (info tone): a capacity OPPORTUNITY — a slot where demand consistently exceeds capacity (waitlist, full classes); recommend adding capacity.
- P2 (warn tone): a misallocation — a UNDERBOOKED slot that should be moved or merged; reference adjacent slots with high fill as the destination.
- P3 (neg tone): a LOW-ROI slot to pause or remove — pick the slot with the lowest fill rate and explain.

For each recommendation, return:
- kicker (2-4 words category, e.g. "Capacity opportunity")
- headline (one declarative sentence with the key number embedded)
- data: 3 [label, value] pairs for the inline metric strip — units belong in the value (e.g. "94%", "8/wk", "+$210/wk")
- body: 1-2 sentences explaining the why. Reference specific weekdays / times.
- action: 2-4 word imperative CTA (e.g. "Add Wed 5 PM")
- altAction (optional): a softer alternative (e.g. "Show data")

Tone: warm, direct, operator-focused. No marketing fluff. Match the studio's voice.

Return JSON only: {"recommendations": [...]}`;

export async function generateScheduleRecommendations(
  supabase: SupabaseClient<Database>,
  studioId: string = STUDIO_ID,
): Promise<ScheduleRecommendation[]> {
  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = `schedule_recs:${studioId}:${today}`;
  const cached = await readAiCache<ScheduleRecommendation[]>(supabase, cacheKey);
  if (cached) return cached;

  const snapshot = await buildScheduleSnapshot(supabase, studioId, 30);
  // No data ≠ valuable AI call; bail early.
  if (snapshot.classCount === 0) return [];

  const claude = getClaude();
  const userBlock = JSON.stringify(snapshot, null, 2);
  const message = await claude.messages.create({
    model: CLAUDE_MODELS.briefing,
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Schedule snapshot for the last ${snapshot.windowDays} days:\n\n${userBlock}\n\nReturn JSON: {"recommendations": [...]}`,
          },
        ],
      },
    ],
  });

  const text = message.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("");
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as {
    recommendations: ScheduleRecommendation[];
  };

  await writeAiCache(supabase, studioId, cacheKey, parsed.recommendations, TTL_SECONDS);
  return parsed.recommendations;
}
