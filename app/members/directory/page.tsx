/*
 * Members · Directory — sortable, filterable list with engagement badges
 * (SPEC §1.4). Smart segments live in a sidebar; clicking a row jumps to
 * the profile drill-down.
 *
 * Live data: KPI strip from `loadDirectoryKpis`, segments from
 * `loadSegmentCounts`, member rows from `listMembers`. Each loader has
 * a fixture fallback.
 */

export const dynamic = "force-dynamic";

import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { EmptyTableState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import {
  KpiCardStrip,
  PageHero,
  SectionHead,
  SearchBar,
  TableHead,
  type KpiCardItem,
} from "@/components/primitives";
import { StatusPill, ToneBadge } from "@/components/status-pill";
import { listMembers, loadDirectoryKpis } from "@/lib/data/members";
import { loadSegmentCounts } from "@/lib/data/segments";
import { ENGAGEMENT_TONE, SEGMENTS } from "@/lib/fixtures";
import { formatCurrency } from "@/lib/utils";

const TABLE_COLUMNS = [
  { label: "Member" },
  { label: "Tier" },
  { label: "Status" },
  { label: "Engagement" },
  { label: "Credits", align: "right" as const },
  { label: "LTV", align: "right" as const },
  { label: "Last visit", align: "right" as const },
];

export default async function MembersDirectoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const search = params.q ?? "";

  const [members, kpis, segmentCounts] = await Promise.all([
    listMembers({ limit: 50, search }),
    loadDirectoryKpis(),
    loadSegmentCounts(),
  ]);

  const heroMeta = `${kpis.activeCount} active · ${kpis.newThisMonthCount} new this month · Tampa`;
  const heroSubtitle = (
    <>
      Search by name, email, or phone.{" "}
      <strong>{kpis.trialCount} trials</strong> in the funnel — convert this
      week.
    </>
  );

  // MRR-monthly approximation: most plans are monthly, so plan_price_cents
  // sum is close enough for a top-line operator KPI. Annual plans skew
  // high; we'll refine when plan-cycle metadata is wired into the schema.
  const kpiItems: KpiCardItem[] = [
    {
      label: "Active members",
      value: kpis.activeCount.toLocaleString(),
      delta: "+0",
      foot: "live",
    },
    {
      label: "MRR (estimate)",
      value: formatCurrency(kpis.mrrCents),
      delta: "+0%",
      foot: "active × plan price",
    },
    {
      label: "New this month",
      value: kpis.newThisMonthCount.toLocaleString(),
      delta: "+0",
      foot: "rolling 30d",
    },
    {
      label: "Trials",
      value: kpis.trialCount.toLocaleString(),
      delta: "+0",
      foot: "in funnel",
    },
  ];

  return (
    <>
      <PageHero
        meta={heroMeta}
        title="Members"
        subtitle={heroSubtitle}
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Export
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="plus" size={13} /> New member
            </button>
          </>
        }
      />

      <KpiCardStrip items={kpiItems} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        {/* Smart segments */}
        <div className="card" style={{ padding: 18 }}>
          <SectionHead>Segments</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {SEGMENTS.map((s, i) => {
              const count = segmentCounts[s.id] ?? s.count;
              return (
                <Link
                  key={s.id}
                  href={`/members/segments/${s.id}`}
                  className="hov"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: 8,
                    color: "inherit",
                    textDecoration: "none",
                    fontSize: 12.5,
                    background: i === 0 ? "var(--surface-2)" : "transparent",
                    fontWeight: i === 0 ? 600 : 500,
                  }}
                >
                  <span>{s.name}</span>
                  <span
                    className="mono"
                    style={{ fontSize: 11, color: "var(--text-3)" }}
                  >
                    {count.toLocaleString()}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Directory table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <SearchBar placeholder="Search members…" />
            <button type="button" className="btn btn-ghost hov">
              <Icon name="filter" size={13} /> Status: Any
            </button>
            <button type="button" className="btn btn-ghost hov">
              Tier: Any <Icon name="chev-down" size={11} />
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <TableHead columns={TABLE_COLUMNS} />
            <tbody>
              {members.length === 0 && (
                <tr>
                  <td colSpan={TABLE_COLUMNS.length} style={{ padding: 0 }}>
                    <EmptyTableState>
                      {search
                        ? `No members match “${search}”. Clear the search to see all members.`
                        : "No members yet. Sync from Glofox or add one to get started."}
                    </EmptyTableState>
                  </td>
                </tr>
              )}
              {members.map((m) => {
                const tone = ENGAGEMENT_TONE[m.engagement];
                return (
                  <tr
                    key={m.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td style={{ padding: "12px 14px" }}>
                      <Link
                        href={`/members/${m.id}`}
                        className="row hov"
                        style={{
                          gap: 10,
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        <Avatar name={m.name} seed={m.seed} size={28} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {m.name}
                          </div>
                          <div
                            className="muted"
                            style={{ fontSize: 11, marginTop: 1 }}
                          >
                            {m.email}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12.5 }}>
                      {m.tier}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <StatusPill status={m.status} />
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <ToneBadge tone={tone}>{m.engagement}</ToneBadge>
                      {m.strikes > 0 && (
                        <span
                          className="badge"
                          style={{
                            marginLeft: 6,
                            background: "var(--neg-soft)",
                            color: "var(--neg)",
                          }}
                        >
                          {m.strikes} strike{m.strikes > 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                    <td
                      className="mono"
                      style={{
                        padding: "12px 14px",
                        textAlign: "right",
                        fontSize: 12.5,
                      }}
                    >
                      {m.credits === 999 ? "∞" : m.credits}
                    </td>
                    <td
                      className="mono"
                      style={{
                        padding: "12px 14px",
                        textAlign: "right",
                        fontSize: 12.5,
                      }}
                    >
                      {formatCurrency(m.ltv * 100)}
                    </td>
                    <td
                      className="mono text-3"
                      style={{
                        padding: "12px 14px",
                        textAlign: "right",
                        fontSize: 11.5,
                      }}
                    >
                      {m.lastVisit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
