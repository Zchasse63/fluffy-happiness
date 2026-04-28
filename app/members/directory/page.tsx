/*
 * Members · Directory — sortable, filterable list with engagement badges
 * (SPEC §1.4). Smart segments live in a sidebar; clicking a row jumps to
 * the profile drill-down (TODO: profile page).
 */

import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import {
  ChangeBadge,
  PageHero,
  SectionHead,
} from "@/components/primitives";
import { listMembers } from "@/lib/data/members";
import {
  ENGAGEMENT_TONE,
  SEGMENTS,
  type Member,
} from "@/lib/fixtures";
import { formatCurrency } from "@/lib/utils";

function StatusPill({ status }: { status: Member["status"] }) {
  const map: Record<Member["status"], { fg: string; soft: string; label: string }> = {
    active: { fg: "var(--pos)", soft: "var(--pos-soft)", label: "Active" },
    paused: { fg: "var(--warn)", soft: "var(--warn-soft)", label: "Paused" },
    cancelled: { fg: "var(--text-3)", soft: "var(--surface-3)", label: "Cancelled" },
    trialing: { fg: "var(--cobalt)", soft: "var(--cobalt-soft)", label: "Trial" },
  };
  const m = map[status];
  return (
    <span className="badge" style={{ background: m.soft, color: m.fg }}>
      {m.label}
    </span>
  );
}

export default async function MembersDirectoryPage() {
  const members = await listMembers();
  return (
    <>
      <PageHero
        meta="287 active · 14 new this month · Tampa"
        title="Members"
        subtitle={
          <>
            Search by name, email, or phone. <strong>14 trials</strong> in the
            funnel; 4 of them have booked twice in their first week — that&apos;s
            the cohort to convert this week.
          </>
        }
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

      <div className="card card-tight" style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            alignItems: "stretch",
          }}
        >
          {[
            { label: "Active members", value: "287", delta: "+12", foot: "MoM" },
            { label: "MRR", value: "$53,820", delta: "+4.2%", foot: "MoM" },
            { label: "Avg LTV", value: "$1,240", delta: "+$38", foot: "rolling 12mo" },
            { label: "30-day churn", value: "2.4%", delta: "-0.6 pts", foot: "industry: 4.1%" },
          ].map((k, i) => (
            <div
              key={k.label}
              style={{
                padding: "20px 22px",
                borderRight: i < 3 ? "1px solid var(--border)" : "none",
              }}
            >
              <div className="metric-label">{k.label}</div>
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
          gridTemplateColumns: "240px 1fr",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        {/* Smart segments */}
        <div className="card" style={{ padding: 18 }}>
          <SectionHead>Segments</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {SEGMENTS.map((s, i) => (
              <Link
                key={s.id}
                href={`/members/segments?id=${s.id}`}
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
                  {s.count}
                </span>
              </Link>
            ))}
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
            <div
              className="row"
              style={{
                gap: 8,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 9999,
                padding: "6px 12px",
                flex: 1,
              }}
            >
              <Icon name="search" size={14} />
              <input
                placeholder="Search members…"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 13,
                }}
              />
            </div>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="filter" size={13} /> Status: Any
            </button>
            <button type="button" className="btn btn-ghost hov">
              Tier: Any <Icon name="chev-down" size={11} />
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  background: "var(--surface-2)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {[
                  ["Member", "left"],
                  ["Tier", "left"],
                  ["Status", "left"],
                  ["Engagement", "left"],
                  ["Credits", "right"],
                  ["LTV", "right"],
                  ["Last visit", "right"],
                ].map(([label, align]) => (
                  <th
                    key={label}
                    style={{
                      textAlign: align as "left" | "right",
                      padding: "10px 14px",
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--text-3)",
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
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
                        style={{ gap: 10, textDecoration: "none", color: "inherit" }}
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
                      <span
                        className="badge"
                        style={{ background: tone.soft, color: tone.fg }}
                      >
                        {m.engagement}
                      </span>
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
