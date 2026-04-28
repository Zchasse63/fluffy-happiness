/*
 * Schedule · Optimization — demand heatmap (day × time slot, 30-day avg
 * fill %) + AI recommendations panel using the IDA pattern.
 */

import { Fragment } from "react";

import { Icon } from "@/components/icon";
import {
  InsightCard,
  PageHero,
  SectionHead,
  type Insight,
} from "@/components/primitives";
import { DEMAND_HEATMAP, SCHED_DAYS } from "@/lib/fixtures";

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

const RECS: Insight[] = [
  {
    rank: "P1",
    tone: "info",
    kicker: "Capacity opportunity",
    headline: "Add a 5 PM slot on Wednesdays.",
    data: [
      ["Avg waitlist", "8/wk"],
      ["6 PM fill", "94%"],
      ["Lift est.", "+$210/wk"],
    ],
    body:
      "Waitlist rejections concentrate at 5–6 PM Wed. A new 5 PM Open Sauna would absorb the overflow without cannibalizing 6 PM (different cohort).",
    action: "Add Wed 5 PM",
    altAction: "Show data",
    href: "/schedule/calendar",
  },
  {
    rank: "P2",
    tone: "warn",
    kicker: "Underbooked",
    headline: "Move Whitney's guided class to 6 PM.",
    data: [
      ["7 PM fill", "20%"],
      ["6 PM fill", "85%"],
      ["Lift est.", "+73%"],
    ],
    body:
      "Whitney's Tue/Wed 7 PM is consistently below 50%. Moving her Tue slot to 6 PM matches her Mon attendance — Trent is on Tue 6 PM, suggesting a swap.",
    action: "Propose swap",
    altAction: "Cancel slot",
    href: "/schedule/calendar",
  },
  {
    rank: "P3",
    tone: "neg",
    kicker: "Low ROI",
    headline: "Remove Sunday 12 PM Open Sauna.",
    data: [
      ["30-day avg fill", "34%"],
      ["Bookings", "lowest"],
      ["Trainer cost", "$0"],
    ],
    body:
      "Sunday 12 PM has the lowest fill rate of any non-private slot. No-shows are half the bookings. Pause for two weeks; if trial succeeds, remove permanently.",
    action: "Pause slot",
    altAction: "Show 90-day trend",
    href: "/schedule/calendar",
  },
];

export default function ScheduleOptimizationPage() {
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
                {DEMAND_HEATMAP[di].map((p, ci) => (
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
