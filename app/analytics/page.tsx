/*
 * Analytics — KPI dashboard + AI insights feed + cohort retention preview.
 * The pricing simulator and trainer performance breakdowns are linked
 * but live in the Revenue / Operations modules.
 */

import Link from "next/link";

import { Icon } from "@/components/icon";
import {
  ChangeBadge,
  Donut,
  InsightCard,
  LineChart,
  PageHero,
  SectionHead,
  type Insight,
} from "@/components/primitives";

const COHORT_RETENTION = [
  100, 92, 85, 78, 73, 69, 65, 62, 59, 57, 55, 54,
];

const INSIGHTS: Insight[] = [
  {
    rank: "P1",
    tone: "info",
    kicker: "Pattern · 30 days",
    headline: "Weekday mornings outperform every other slot.",
    data: [
      ["Mon-Fri 6 AM avg", "92%"],
      ["Evening avg", "71%"],
      ["Cohort lift", "+18 pts"],
    ],
    body:
      "Morning regulars book a week ahead, attend at 96% rate, and have the highest LTV across all cohorts. Two more morning slots could absorb existing waitlist demand.",
    action: "Add morning slot",
    altAction: "Show data",
    href: "/schedule/optimization",
  },
  {
    rank: "P2",
    tone: "warn",
    kicker: "Anomaly",
    headline: "ClassPass conversion is trending down 3 weeks running.",
    data: [
      ["Trial → Member", "8%"],
      ["Prior 90d avg", "14%"],
      ["At-risk MRR", "$1,800"],
    ],
    body:
      "Q1 was 14% conversion. Last 3 weeks: 11%, 9%, 8%. Hypothesis: the new ClassPass member tier devalues your premium positioning. Worth a price-sim run.",
    action: "Run pricing sim",
    altAction: "Open ClassPass settings",
    href: "/revenue/memberships",
  },
  {
    rank: "P3",
    tone: "pos",
    kicker: "Recommendation",
    headline: "Whitney's referrals close at 91%.",
    data: [
      ["Referral → trial", "100%"],
      ["Trial → member", "91%"],
      ["LTV uplift", "+38%"],
    ],
    body:
      "Whitney's referral cohort behaves like power users from day one. Worth doubling down — increase her promo split or seed a referral campaign.",
    action: "Configure referral",
    altAction: "Show data",
    href: "/marketing/campaigns",
  },
];

export default function AnalyticsPage() {
  return (
    <>
      <PageHero
        meta="Tier 1–3 metrics · Tampa"
        title="Analytics"
        subtitle="Hero KPIs above the fold. Anything that needs operator attention also surfaces on the Command Center."
        actions={
          <>
            <span className="tabs">
              <span className="tab">Week</span>
              <span className="tab active">Month</span>
              <span className="tab">Quarter</span>
              <span className="tab">YTD</span>
            </span>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Export
            </button>
          </>
        }
      />

      <div className="card card-tight" style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            alignItems: "stretch",
          }}
        >
          {[
            { label: "MRR", value: "$53,820", delta: "+4.2%" },
            { label: "Active members", value: "287", delta: "+12" },
            { label: "Avg LTV", value: "$1,240", delta: "+$38" },
            { label: "Churn · 30d", value: "2.4%", delta: "-0.6 pts" },
            { label: "NRR", value: "104%", delta: "+1.8 pts" },
          ].map((k, i) => (
            <div
              key={k.label}
              style={{
                padding: "20px 22px",
                borderRight: i < 4 ? "1px solid var(--border)" : "none",
              }}
            >
              <div className="metric-label">{k.label}</div>
              <div className="big" style={{ fontSize: 32, marginBottom: 8 }}>
                {k.value}
              </div>
              <ChangeBadge value={k.delta} />
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
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
                12 months · cohort retention
              </span>
            }
          >
            Cohort retention
          </SectionHead>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 24, alignItems: "center" }}>
            <LineChart
              data={COHORT_RETENTION}
              width={520}
              height={180}
              color="var(--teal)"
              fill
            />
            <div>
              <div className="metric-label">Month 12 retention</div>
              <div className="big" style={{ fontSize: 36, marginBottom: 6 }}>
                {COHORT_RETENTION[COHORT_RETENTION.length - 1]}%
              </div>
              <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                Industry benchmark for boutique studios is 38–48%. Your
                12-month retention is in the top quartile.
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <SectionHead>Member health · 30d</SectionHead>
          <div className="row" style={{ gap: 24, alignItems: "flex-start" }}>
            <Donut value={62} color="var(--pos)" size={120} label="Active" />
            <div style={{ flex: 1 }}>
              {[
                ["Power", 42, "var(--accent-deep)"],
                ["Active", 138, "var(--moss)"],
                ["Engaged", 48, "var(--teal)"],
                ["Cooling", 31, "var(--warn)"],
                ["At risk", 18, "var(--neg)"],
                ["New", 14, "var(--cobalt)"],
              ].map(([l, v, c]) => (
                <div
                  key={l as string}
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px dashed var(--border)",
                    fontSize: 13,
                  }}
                >
                  <div className="row" style={{ gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: c as string,
                      }}
                    />
                    <span>{l as string}</span>
                  </div>
                  <span className="mono" style={{ fontWeight: 600 }}>
                    {v as number}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <SectionHead
          right={
            <Link
              href="/marketing/leads"
              className="btn btn-link hov"
              style={{ fontSize: 12 }}
            >
              Show data <Icon name="arrow-right" size={11} />
            </Link>
          }
        >
          Insights · last 7 days
        </SectionHead>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          {INSIGHTS.map((i) => (
            <InsightCard key={i.kicker} insight={i} />
          ))}
        </div>
      </div>
    </>
  );
}
