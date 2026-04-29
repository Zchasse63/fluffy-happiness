/*
 * Claude wrapper — single entry point for AI calls. Configures the SDK
 * with prompt-caching so the system prompt + studio context survives
 * across the daily briefing + Ask Meridian + per-feature calls.
 *
 * Model: Claude Sonnet 4.6 by default (fast + cheap enough for daily
 * batch). Override via `model` arg for richer responses on Ask Meridian.
 */

import Anthropic from "@anthropic-ai/sdk";

export class AnthropicNotConfigured extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY missing — Claude features are disabled.");
    this.name = "AnthropicNotConfigured";
  }
}

let client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (client) return client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AnthropicNotConfigured();
  client = new Anthropic({ apiKey: key });
  return client;
}

/**
 * Run an Anthropic SDK call with exponential-backoff retry on
 * transient errors (429 rate-limit, 5xx, network). Mirrors the Glofox
 * client's 3-attempt pattern.
 *
 * Backoff: 250ms, 500ms, 1000ms.
 *
 * Non-retryable errors (4xx other than 429, missing API key) bubble
 * up immediately so callers don't waste time on them.
 */
async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const MAX_ATTEMPTS = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Anthropic SDK errors expose `status` (number) and `name`.
      const e = err as { status?: number; name?: string };
      const retryable =
        !e.status ||
        e.status === 429 ||
        (e.status >= 500 && e.status < 600);
      if (!retryable || attempt === MAX_ATTEMPTS) throw err;
      const delay = 250 * 2 ** (attempt - 1);
      console.warn(
        `[claude] ${label} attempt ${attempt}/${MAX_ATTEMPTS} failed (${e.status ?? "network"}), retrying in ${delay}ms`,
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw lastErr;
}

export const CLAUDE_MODELS = {
  default: "claude-sonnet-4-6",
  briefing: "claude-sonnet-4-6",
  reasoning: "claude-opus-4-7",
} as const;

export type BriefingInput = {
  studioName: string;
  date: string;
  metrics: {
    revenueToday: number;
    bookingsToday: number;
    walkIns: number;
    noShows: number;
    attendanceRate: number;
    underbookedClasses: Array<{
      title: string;
      time: string;
      booked: number;
      capacity: number;
      trainer: string;
    }>;
    expiringCredits: { count: number; atRiskMrr: number };
    failedPayments: Array<{ member: string; amount: number; reason: string }>;
    revenueAnomaly?: { yesterday: number; priorWeek: number };
  };
};

export type Briefing = {
  generatedAt: string;
  insights: Array<{
    rank: "P1" | "P2" | "P3";
    tone: "neg" | "warn" | "info" | "pos";
    kicker: string;
    headline: string;
    body: string;
    action: string;
  }>;
};

const SYSTEM_PROMPT = `You write the morning briefing for the operator of a boutique sauna studio in Tampa, FL ("The Sauna Guys"). The operator is hands-on — they read the briefing once before opening the studio and act on it.

Tone: warm, direct, operator-focused. No marketing fluff. No corporate hedging. No emojis. Match the studio's voice: matter-of-fact, occasionally dry, always specific.

Output format: exactly 3 insights ranked P1 / P2 / P3.
- P1: critical, requires action today (failed payments, low-attendance critical class, anomaly)
- P2: high, this-week (underbooked recurring class, credit-expiry cluster)
- P3: medium, informational (anomaly investigation, cohort observation)

Each insight has:
- kicker: 2-4 word category, e.g. "Class below threshold"
- headline: one sentence, declarative, with the key number embedded
- body: one to two sentences explaining context. Reference specific names / times / dollar amounts.
- action: imperative phrase, 2-4 words, the primary CTA

Return JSON only. No prose outside the JSON.`;

export async function generateBriefing(input: BriefingInput): Promise<Briefing> {
  const claude = getClaude();
  const userBlock = JSON.stringify(input.metrics, null, 2);
  const message = await withRetry("generateBriefing", () =>
    claude.messages.create({
      model: CLAUDE_MODELS.briefing,
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Studio: ${input.studioName}\nDate: ${input.date}\n\nMetrics for today's briefing:\n\n${userBlock}\n\nReturn JSON: {"insights": [{"rank":"P1","tone":"neg","kicker":"…","headline":"…","body":"…","action":"…"}, ...]}`,
            },
          ],
        },
      ],
    }),
  );

  const text = message.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("");
  const parsed = JSON.parse(stripCodeFences(text)) as {
    insights: Briefing["insights"];
  };
  return {
    generatedAt: new Date().toISOString(),
    insights: parsed.insights,
  };
}

function stripCodeFences(s: string) {
  return s
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export type AskMeridianResult = {
  answer: string;
  followups: string[];
};

export async function askMeridian(
  question: string,
  studioContext: string,
): Promise<AskMeridianResult> {
  const claude = getClaude();
  const message = await withRetry("askMeridian", () =>
    claude.messages.create({
      model: CLAUDE_MODELS.reasoning,
      max_tokens: 800,
      system: [
        {
          type: "text",
          text: `You answer questions about a single sauna studio's data in plain English. Be specific and cite numbers from the context. If the question can't be answered from the context, say so plainly. Never invent facts.

After your answer, suggest 2-3 follow-up questions the operator might ask next.

Return JSON: {"answer": "…", "followups": ["…", "…"]}`,
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: studioContext, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: question }],
    }),
  );
  const text = message.content
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("");
  return JSON.parse(stripCodeFences(text)) as AskMeridianResult;
}
