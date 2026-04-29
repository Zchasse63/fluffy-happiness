/*
 * Overview tab — two-column layout with Membership stat tiles on the
 * left and the AI signal stack on the right.
 */

import { SectionHead } from "@/components/primitives";
import { MEMBER_PROFILE_AI_SIGNALS, type Member } from "@/lib/fixtures";
import { formatCurrency } from "@/lib/utils";

export function OverviewTab({ member }: { member: Member }) {
  const stats: Array<[string, string]> = [
    ["Tier", member.tier],
    ["Status", member.status],
    ["Joined", member.joined],
    ["Last visit", member.lastVisit],
    ["LTV", formatCurrency(member.ltv * 100)],
    ["Strikes (30d)", String(member.strikes)],
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr",
        gap: 16,
        alignItems: "flex-start",
      }}
    >
      <div className="card">
        <SectionHead>Membership</SectionHead>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16,
          }}
        >
          {stats.map(([label, value]) => (
            <div
              key={label}
              style={{
                padding: "12px 14px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
              }}
            >
              <div className="metric-label">{label}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <SectionHead>AI signal</SectionHead>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MEMBER_PROFILE_AI_SIGNALS.map((s) => (
            <div
              key={s.label}
              style={{
                padding: "12px 14px",
                background: s.soft,
                borderLeft: `3px solid ${s.tone}`,
                borderRadius: 10,
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 10.5,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: s.tone,
                  marginBottom: 4,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 13, color: "var(--text)" }}>{s.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
