/*
 * Schedule · Optimization — demand heatmap (day × time slot, 30-day avg
 * fill %) + AI recommendations panel using the IDA pattern.
 *
 * Heatmap pulls live fill ratios from `loadDemandHeatmap`; the AI
 * recommendations are still authored fixtures pending the AI insights
 * pipeline (briefing route works, persistence + per-page surfacing is
 * the next pass).
 */

export const dynamic = "force-dynamic";

import { Fragment } from "react";

import { Icon } from "@/components/icon";
import {
  InsightCard,
  PageHero,
  SectionHead,
  type Insight,
} from "@/components/primitives";
import { AnthropicNotConfigured } from "@/lib/ai/claude";
import { generateScheduleRecommendations } from "@/lib/ai/schedule-recommendations";
import { fixtureFallback } from "@/lib/data/_log";
import { loadDemandHeatmap } from "@/lib/data/schedule";
import { DEMAND_HEATMAP, SCHED_DAYS } from "@/lib/fixtures";
import { createSupabaseServer } from "@/lib/supabase/server";

const SLOT_LABELS = ["5 PM", "6 PM", "7 PM", "8 PM"];

const RAMP = [
  "var(--seq-0)",
  "var(--seq-1)",
  "var(--seq-2)",
  "var(--seq-3)",
  "var(--seq-4)",
];

function bucket(p: number): number {
  if (p < 30) return 0;
  if (p < 50) return 1;
  if (p < 70) return 2;
  if (p < 85) return 3;
  return 4;
}

// Authored fallback when the AI can't run (no Anthropic key, no class
// data, etc.). Helps the page stay useful instead of going blank.
const FALLBACK_RECS: Insight[] = [
  {
    rank: "P2",
    tone: "info",
    kicker: "AI offline",
    headline: "Schedule recommendations need an Anthropic API key + recent class data.",
    data: [
      ["Status", "Fallback"],
      ["Window", "30 days"],
      ["Need", "ANTHROPIC_API_KEY"],
    ],
    body:
      "Once ANTHROPIC_API_KEY is set in .env.local and the studio has at least a few weeks of class instances, this panel will surface three IDA-shaped recommendations against live demand.",
    action: "Open settings",
    href: "/settings",
  },
];

export default async function ScheduleOptimizationPage() {
  const supabase = await createSupabaseServer();

  const [live, recs] = await Promise.all([
    loadDemandHeatmap(30),
    // Don't let any AI failure 5xx the whole page — fall through to the
    // FALLBACK_RECS panel instead. Was previously throwing on every
    // non-AnthropicNotConfigured error (e.g. transient API errors,
    // empty class data) and that's the user-reported 5xx symptom.
    generateScheduleRecommendations(supabase).catch((err) => {
      if (err instanceof AnthropicNotConfigured) return [] as never;
      // eslint-disable-next-line no-console
      console.error("[schedule/optimization] generateRecs failed", err);
      return [] as never;
    }),
  ]);
  const hasLive = live.some((row) => row.some((v) => v > 0));
  // Empty heatmap (no class data yet) renders as zeros in live mode;
  // bypass mode keeps the demo heatmap so the e2e suite has stable data.
  const heatmap = hasLive
    ? live
    : fixtureFallback(DEMAND_HEATMAP, Array.from({ length: 7 }, () => [0, 0, 0, 0]));
  const RECS: Insight[] = recs.length
    ? recs.map((r) => ({
        rank: r.rank,
        tone: r.tone,
        kicker: r.kicker,
        headline: r.headline,
        data: r.data,
        body: r.body,
        action: r.action,
        altAction: r.altAction,
        href: "/schedule/calendar",
      }))
    : FALLBACK_RECS;

  return (
    <>
      <PageHero
        meta="Last 30 days · Tampa"
        title="Schedule optimization"
        subtitle={
          <>
            Three recommendations based on actual booking patterns. The heatmap
            shows the canonical evening slots; weekday mornings already pace
            well above threshold.
          </>
        }
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Export
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="sparkle" size={13} /> Regenerate
            </button>
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div className="card">
          <SectionHead
            right={
              <span
                className="mono text-3"
                style={{
                  fontSize: 10.5,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Avg fill % · evening slots
              </span>
            }
          >
            Demand heatmap
          </SectionHead>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60px repeat(4, 1fr)",
              gap: 4,
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--text-3)",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}
          >
            <span />
            {SLOT_LABELS.map((l) => (
              <span
                key={l}
                style={{ textAlign: "center", textTransform: "uppercase" }}
              >
                {l}
              </span>
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60px repeat(4, 1fr)",
              rowGap: 6,
              columnGap: 4,
            }}
          >
            {SCHED_DAYS.map((d, di) => (
              <Fragment key={d}>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--text-2)",
                    alignSelf: "center",
                  }}
                >
                  {d}
                </span>
                {heatmap[di].map((p, ci) => (
                  <div
                    key={`${d}-${ci}`}
                    title={`${d} ${SLOT_LABELS[ci]} · ${p}% avg fill`}
                    style={{
                      height: 38,
                      borderRadius: 4,
                      background: RAMP[bucket(p)],
                      border: "1px solid rgba(0,0,0,0.04)",
                      display: "grid",
                      placeItems: "center",
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      fontWeight: 600,
                      color: bucket(p) >= 3 ? "#FBF0E3" : "var(--text)",
                    }}
                  >
                    {p}%
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
          <div
            className="row"
            style={{ justifyContent: "space-between", marginTop: 12 }}
          >
            <span
              className="mono text-3"
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              less
            </span>
            <div className="row" style={{ gap: 4 }}>
              {RAMP.map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: c,
                    border: "1px solid rgba(0,0,0,0.04)",
                  }}
                />
              ))}
            </div>
            <span
              className="mono text-3"
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              more
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {RECS.map((r) => (
            <InsightCard key={r.kicker} insight={r} />
          ))}
        </div>
      </div>
    </>
  );
}
