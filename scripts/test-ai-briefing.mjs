/*
 * Test the AI briefing path end-to-end against live Supabase data +
 * Anthropic. Builds a metrics payload from Supabase, calls Claude
 * Sonnet 4.6, prints the structured insights.
 *
 * Usage: node scripts/test-ai-briefing.mjs
 */

import { config as loadEnv } from "dotenv";

// `override: true` because the parent shell can export empty values
// (e.g. Claude Desktop sets ANTHROPIC_API_KEY="") which would otherwise
// shadow the .env.local entry. Default `dotenv/config` reads only `.env`.
loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env" });

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const ANTHROPIC = process.env.ANTHROPIC_API_KEY;

if (!URL || !KEY || !ANTHROPIC) {
  console.error("Missing env:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL:", !!URL);
  console.error("  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:", !!KEY);
  console.error("  ANTHROPIC_API_KEY:", !!ANTHROPIC);
  process.exit(1);
}

const STUDIO_ID = "11111111-1111-1111-1111-111111111111";

const supabase = createClient(URL, KEY);
const claude = new Anthropic({ apiKey: ANTHROPIC });

console.log("=== Live AI briefing test ===\n");

const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);
const tomorrow = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

const [classes, txns, failed, weekTxns] = await Promise.all([
  supabase
    .from("class_instances")
    .select("title, starts_at, capacity, booked_count, status")
    .eq("studio_id", STUDIO_ID)
    .gte("starts_at", todayStart.toISOString())
    .lt("starts_at", tomorrow.toISOString())
    .order("starts_at"),
  supabase
    .from("transactions")
    .select("amount_cents, status")
    .eq("studio_id", STUDIO_ID)
    .gte("occurred_at", todayStart.toISOString()),
  supabase
    .from("transactions")
    .select("amount_cents, description, status")
    .eq("studio_id", STUDIO_ID)
    .eq("status", "failed")
    .order("occurred_at", { ascending: false })
    .limit(5),
  supabase
    .from("transactions")
    .select("amount_cents, status, occurred_at")
    .eq("studio_id", STUDIO_ID)
    .gte("occurred_at", weekAgo.toISOString()),
]);

const todayRevenue =
  (txns.data ?? [])
    .filter((t) => t.status === "completed")
    .reduce((s, t) => s + t.amount_cents, 0) / 100;
const weekRevenue =
  (weekTxns.data ?? [])
    .filter((t) => t.status === "completed")
    .reduce((s, t) => s + t.amount_cents, 0) / 100;

const todayClasses = classes.data ?? [];
const underbooked = todayClasses
  .filter((c) => c.booked_count / c.capacity < 0.5)
  .map((c) => ({
    title: c.title,
    time: new Date(c.starts_at).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    booked: c.booked_count,
    capacity: c.capacity,
  }));

const metrics = {
  date: new Date().toISOString().slice(0, 10),
  todayRevenue,
  weekRevenue,
  classesToday: todayClasses.length,
  bookingsToday: todayClasses.reduce((s, c) => s + (c.booked_count ?? 0), 0),
  underbooked,
  failedPayments: (failed.data ?? []).map((f) => ({
    description: f.description,
    amount: f.amount_cents / 100,
  })),
};

console.log("Metrics:", JSON.stringify(metrics, null, 2));
console.log("\nCalling Claude Sonnet 4.6…\n");

const message = await claude.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1500,
  system: [
    {
      type: "text",
      text: `You write the morning briefing for the operator of a boutique sauna studio in Tampa, FL ("The Sauna Guys"). Tone: warm, direct, operator-focused. No marketing fluff. No emojis.

Output exactly 3 insights ranked P1/P2/P3:
- P1: critical, requires action today
- P2: high, this-week
- P3: medium, informational

Each insight has: kicker (2-4 words), headline (one sentence with the key number), body (1-2 sentences with specifics), action (2-4 word imperative).

Return JSON: {"insights": [{"rank":"P1","tone":"neg","kicker":"…","headline":"…","body":"…","action":"…"}, ...]}.`,
      cache_control: { type: "ephemeral" },
    },
  ],
  messages: [
    {
      role: "user",
      content: `Studio: The Sauna Guys (Tampa)\nMetrics:\n\n${JSON.stringify(metrics, null, 2)}\n\nGenerate today's briefing.`,
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

console.log("Raw response:");
console.log(text);
console.log("\nParsed insights:");
const parsed = JSON.parse(cleaned);
for (const i of parsed.insights) {
  console.log(`\n  ${i.rank} [${i.tone}] · ${i.kicker}`);
  console.log(`  ${i.headline}`);
  console.log(`  ${i.body}`);
  console.log(`  → ${i.action}`);
}

console.log("\nUsage:", message.usage);
