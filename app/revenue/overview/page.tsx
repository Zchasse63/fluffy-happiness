/*
 * Revenue · Overview — daily/weekly/monthly chart, MRR gauge, revenue by
 * type breakdown, plus a Today and a 7-day strip.
 *
 * Live data via `loadRevenueOverview` and `loadDirectoryKpis` for MRR.
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
import { loadDirectoryKpis } from "@/lib/data/members";
import { loadRevenueOverview } from "@/lib/data/revenue";
import type { RevenueKind } from "@/lib/fixtures";
import { formatCurrency } from "@/lib/utils";

const KIND_LABEL: Record<RevenueKind, { label: string; color: string }> = {
  membership: { label: "Memberships", color: "var(--accent)" },
  class_pack: { label: "Class packs", color: "var(--teal)" },
  retail: { label: "Retail", color: "var(--cobalt)" },
  gift_card: { label: "Gift cards", color: "var(--gold)" },
  walk_in: { label: "Walk-ins", color: "var(--moss)" },
  corporate: { label: "Corporate", color: "var(--plum)" },
};

const VALID_WINDOWS = [7, 30, 90, 365] as const;
type WindowDays = (typeof VALID_WINDOWS)[number];

function parseWindow(raw: string | string[] | undefined): WindowDays {
  const v = Number(Array.isArray(raw) ? raw[0] : raw);
  return (VALID_WINDOWS as readonly number[]).includes(v)
    ? (v as WindowDays)
    : 30;
}

export default async function RevenueOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const params = await searchParams;
  const windowDays = parseWindow(params.window);
  const [overview, kpis] = await Promise.all([
    loadRevenueOverview(windowDays),
    loadDirectoryKpis(),
  ]);

  // Daily series → spark for the trend chart. If the DB returned fewer
  // than 2 days, render a flat line at zero so the chart doesn't crash.
  const dailySeries =
    overview.daily.length >= 2
      ? overview.daily.map((d) => d.cents / 100)
      : [0, 0];

  // Largest type → donut focus. Sort desc by sum.
  const sortedTypes = overview.byType.slice().sort(
    (a, b) => b.sumCents - a.sumCents,
  );
  const largest = sortedTypes[0];
  const largestPct = overview.totalCents
    ? Math.round((largest?.sumCents / overview.totalCents) * 100)
    : 0;
  const largestLabel = largest ? KIND_LABEL[largest.type].label : "—";

  const arpmCents = kpis.activeCount
    ? Math.round(kpis.mrrCents / kpis.activeCount)
    : 0;

  const kpiItems: KpiCardItem[] = [
    {
      label: "MRR (estimate)",
      value: formatCurrency(kpis.mrrCents),
      delta: "+0%",
      foot: "active × plan price",
    },
    {
      label: "ARPM",
      value: formatCurrency(arpmCents),
      delta: "+0%",
      foot: "rolling 30d",
    },
    {
      label: "Revenue · 30d",
      value: formatCurrency(overview.totalCents),
      delta: "+0%",
      foot: `${overview.daily.length}d active`,
    },
    {
      label: "Failed payments",
      value: overview.failedCount.toLocaleString(),
      delta: overview.failedCount > 0 ? `+${overview.failedCount}` : "+0",
      foot: "Dunning queue",
    },
  ];

  return (
    <>
      <PageHero
        meta="Last 30 days · Tampa · USD"
        title="Revenue"
        subtitle={
          <>
            <strong>{formatCurrency(overview.totalCents)}</strong> over{" "}
            {windowDays} days. {largestLabel} make up{" "}
            <strong>{largestPct}%</strong> of revenue this window.
          </>
        }
        actions={
          <>
            <span className="tabs">
              {VALID_WINDOWS.map((w) => (
                <a
                  key={w}
                  href={`?window=${w}`}
                  className={`tab ${w === windowDays ? "active" : ""}`}
                >
                  {w === 365 ? "365d" : `${w}d`}
                </a>
              ))}
            </span>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Export
            </button>
          </>
        }
      />

      <KpiCardStrip items={kpiItems} />

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
                Daily, last 30 days
              </span>
            }
          >
            Revenue trend
          </SectionHead>
          <div style={{ width: "100%" }}>
            <LineChart
              data={dailySeries}
              width={760}
              height={220}
              color="var(--accent)"
              fill
            />
          </div>
        </div>

        <div className="card">
          <SectionHead>Revenue by type · 30d</SectionHead>
          <div className="row" style={{ gap: 24, alignItems: "flex-start" }}>
            <Donut
              value={largestPct}
              color={largest ? KIND_LABEL[largest.type].color : "var(--accent)"}
              size={130}
              label={largestLabel}
            />
            <div style={{ flex: 1 }}>
              {sortedTypes.map((r) => {
                const meta = KIND_LABEL[r.type];
                return (
                  <div
                    key={r.type}
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
                          background: meta.color,
                        }}
                      />
                      <span>{meta.label}</span>
                    </div>
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {formatCurrency(r.sumCents)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
