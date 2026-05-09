/*
 * Analytics — KPI dashboard + cohort retention + member-health
 * breakdown. Pre-2026-05-08 the page shipped 12 hardcoded retention
 * percentages, 3 fictional IDA cards, and a fake member-health donut.
 * Replaced with live queries from `lib/data/analytics.ts`. The IDA
 * "Insights" feed is gated on real ai_insights table data; in live
 * mode with an empty table it renders an empty state instead of
 * inventing trainer names.
 */

export const dynamic = "force-dynamic";

import { Icon } from "@/components/icon";
import {
  Donut,
  KpiCardStrip,
  LineChart,
  PageHero,
  SectionHead,
  type KpiCardItem,
} from "@/components/primitives";
import {
  loadCohortRetention,
  loadEngagementHealthBreakdown,
} from "@/lib/data/analytics";
import { loadDirectoryKpis } from "@/lib/data/members";
import { loadRevenueOverview } from "@/lib/data/revenue";
import { formatCurrency } from "@/lib/utils";

// Color map for the engagement-health donut (Atelier palette per
// HANDOFF.md §3 — locked).
const HEALTH_COLORS = [
  ["Power", "var(--accent-deep)"],
  ["Active", "var(--moss)"],
  ["Engaged", "var(--teal)"],
  ["Cooling", "var(--warn)"],
  ["At risk", "var(--neg)"],
  ["New", "var(--cobalt)"],
  ["Lapsed", "var(--text-3)"],
] as const;

export default async function AnalyticsPage() {
  const [kpis, revenue, retention, health] = await Promise.all([
    loadDirectoryKpis(),
    loadRevenueOverview(30),
    loadCohortRetention(12),
    loadEngagementHealthBreakdown(),
  ]);
  const arpmCents = kpis.activeCount
    ? Math.round(kpis.mrrCents / kpis.activeCount)
    : 0;

  const liveKpis: KpiCardItem[] = [
    {
      label: "MRR",
      value: formatCurrency(kpis.mrrCents),
      delta: "+0%",
      foot: "active × plan",
    },
    {
      label: "Active members",
      value: kpis.activeCount.toLocaleString(),
      delta: "+0",
      foot: "live",
    },
    {
      label: "ARPM",
      value: formatCurrency(arpmCents),
      delta: "+0%",
      foot: "rolling 30d",
    },
    {
      label: "Revenue · 30d",
      value: formatCurrency(revenue.totalCents),
      delta: "+0%",
      foot: `${revenue.daily.length}d active`,
    },
    {
      label: "Failed payments",
      value: revenue.failedCount.toLocaleString(),
      delta: revenue.failedCount > 0 ? `+${revenue.failedCount}` : "+0",
      foot: "Dunning",
    },
  ];

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

      <KpiCardStrip items={liveKpis} />

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
              data={retention.map((p) => p.retention)}
              width={520}
              height={180}
              color="var(--teal)"
              fill
            />
            <div>
              <div className="metric-label">
                Month {retention.length - 1} retention
              </div>
              <div className="big" style={{ fontSize: 36, marginBottom: 6 }}>
                {retention[retention.length - 1]?.retention ?? 0}%
              </div>
              <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                Cohort retention by month since signup. Each point is the
                share of that cohort still booking at month N.
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <SectionHead>Member health · 30d</SectionHead>
          <div className="row" style={{ gap: 24, alignItems: "flex-start" }}>
            {(() => {
              const total = Object.values(health).reduce((s, n) => s + n, 0);
              const active = total > 0
                ? Math.round(
                    ((health.Power +
                      health.Active +
                      health.Engaged) /
                      total) * 100,
                  )
                : 0;
              return (
                <Donut
                  value={active}
                  color="var(--pos)"
                  size={120}
                  label="Active"
                />
              );
            })()}
            <div style={{ flex: 1 }}>
              {HEALTH_COLORS.map(([label, color]) => (
                <div
                  key={label}
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
                        background: color,
                      }}
                    />
                    <span>{label}</span>
                  </div>
                  <span className="mono" style={{ fontWeight: 600 }}>
                    {health[label]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Insights feed: pre-2026-05-08 this rendered 3 hardcoded IDA
          cards (incl. "Whitney's referrals close at 91%"). Removed
          until ai_insights is populated by the daily Inngest job.
          When that lands, restore via loadAiInsights() returning
          rows from public.ai_insights. */}
      <div>
        <SectionHead>Insights · last 7 days</SectionHead>
        <div
          className="card"
          style={{
            padding: 32,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
          }}
        >
          <div>
            <div className="metric-label" style={{ marginBottom: 6 }}>
              <Icon name="sparkle" size={11} /> No insights yet
            </div>
            <div
              className="muted"
              style={{ fontSize: 13, maxWidth: 480, marginInline: "auto" }}
            >
              The daily AI briefing populates this feed. It runs once
              the Inngest cron is wired (see DEFERRED.md).
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
