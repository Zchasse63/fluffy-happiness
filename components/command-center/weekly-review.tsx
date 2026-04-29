/*
 * Weekly review card — 2-column metric grid comparing this week to last.
 */

import { Icon } from "@/components/icon";
import { ChangeBadge, SectionHead } from "@/components/primitives";
import type { WeekReviewRow } from "@/lib/fixtures";

export function WeeklyReviewCard({ rows }: { rows: WeekReviewRow[] }) {
  return (
    <div className="card">
      <SectionHead
        right={
          <span className="pill-select">
            vs last week <Icon name="chev-down" size={11} />
          </span>
        }
      >
        Weekly review · Mon–Tue
      </SectionHead>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 0,
        }}
      >
        {rows.map((r, i) => (
          <div
            key={r.label}
            style={{
              padding: "14px 16px",
              borderRight: i % 2 === 0 ? "1px solid var(--border)" : "none",
              borderBottom:
                i < rows.length - 2 ? "1px solid var(--border)" : "none",
            }}
          >
            <div className="metric-label" style={{ marginBottom: 6 }}>
              {r.label}
            </div>
            <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
              <div className="med" style={{ fontSize: 26 }}>
                {r.now}
              </div>
              <span className="mono text-3" style={{ fontSize: 10.5 }}>
                was {r.prior}
              </span>
            </div>
            <div style={{ marginTop: 6 }}>
              <ChangeBadge value={r.delta} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
