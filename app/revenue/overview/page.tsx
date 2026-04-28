/*
 * Revenue · Overview — daily/weekly/monthly chart, MRR gauge, revenue by
 * type breakdown, plus a Today and a 7-day strip.
 */

import { Icon } from "@/components/icon";
import {
  ChangeBadge,
  Donut,
  LineChart,
  PageHero,
  SectionHead,
} from "@/components/primitives";
import { formatCurrency } from "@/lib/utils";

const DAILY_REVENUE = [
  120, 180, 95, 220, 140, 260, 210, 280, 175, 210, 190, 240, 175, 250, 320,
  290, 240, 285, 310, 240, 265, 320, 290, 305, 285, 268, 290, 234,
];

const REVENUE_TYPES: Array<{ label: string; value: number; color: string }> = [
  { label: "Memberships", value: 36450, color: "var(--accent)" },
  { label: "Class packs", value: 13860, color: "var(--teal)" },
  { label: "Retail", value: 4200, color: "var(--cobalt)" },
  { label: "Gift cards", value: 2400, color: "var(--gold)" },
  { label: "Walk-ins", value: 980, color: "var(--moss)" },
  { label: "Corporate", value: 5000, color: "var(--plum)" },
];

export default function RevenueOverviewPage() {
  const totalLast30 = REVENUE_TYPES.reduce((s, r) => s + r.value, 0);

  return (
    <>
      <PageHero
        meta="Last 30 days · Tampa · USD"
        title="Revenue"
        subtitle={
          <>
            <strong>{formatCurrency(totalLast30 * 100)}</strong> over 30 days,
            up 8.4% on the trailing 30. Memberships make up{" "}
            <strong>
              {Math.round((REVENUE_TYPES[0].value / totalLast30) * 100)}%
            </strong>{" "}
            of revenue and grew 3.6 points.
          </>
        }
        actions={
          <>
            <span className="tabs">
              <span className="tab">7d</span>
              <span className="tab active">30d</span>
              <span className="tab">90d</span>
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
            gridTemplateColumns: "repeat(4, 1fr)",
            alignItems: "stretch",
          }}
        >
          {[
            { label: "MRR", value: "$53,820", delta: "+4.2%", foot: "vs prior month", dot: "var(--accent)" },
            { label: "ARPM", value: "$187", delta: "+1.8%", foot: "rolling 30d", dot: "var(--teal)" },
            { label: "Today's revenue", value: "$234", delta: "+12.0%", foot: "vs same-day LW", dot: "var(--moss)" },
            { label: "Failed payments", value: "3", delta: "-2", foot: "Dunning queue", dot: "var(--neg)" },
          ].map((k, i) => (
            <div
              key={k.label}
              style={{
                padding: "20px 22px",
                borderRight: i < 3 ? "1px solid var(--border)" : "none",
              }}
            >
              <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 2,
                    background: k.dot,
                  }}
                />
                <div className="metric-label" style={{ margin: 0 }}>
                  {k.label}
                </div>
              </div>
              <div className="big" style={{ fontSize: 36, marginBottom: 8 }}>
                {k.value}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <ChangeBadge value={k.delta} />
                <span className="muted" style={{ fontSize: 11 }}>
                  {k.foot}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
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
                Daily, last 28 days
              </span>
            }
          >
            Revenue trend
          </SectionHead>
          <div style={{ width: "100%" }}>
            <LineChart
              data={DAILY_REVENUE}
              width={760}
              height={220}
              color="var(--accent)"
              fill
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--text-3)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <span>Mar 25</span>
            <span>Apr 1</span>
            <span>Apr 8</span>
            <span>Apr 15</span>
            <span>Apr 22</span>
          </div>
        </div>

        <div className="card">
          <SectionHead>Revenue by type · 30d</SectionHead>
          <div className="row" style={{ gap: 24, alignItems: "flex-start" }}>
            <Donut
              value={Math.round((REVENUE_TYPES[0].value / totalLast30) * 100)}
              color="var(--accent)"
              size={130}
              label="Memberships"
            />
            <div style={{ flex: 1 }}>
              {REVENUE_TYPES.map((r) => (
                <div
                  key={r.label}
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
                        background: r.color,
                      }}
                    />
                    <span>{r.label}</span>
                  </div>
                  <span className="mono" style={{ fontWeight: 600 }}>
                    {formatCurrency(r.value * 100)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
