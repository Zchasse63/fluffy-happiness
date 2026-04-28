/*
 * Operations · Payroll — pay period summaries with trainer base + bonus +
 * commission breakdown.
 */

import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { ChangeBadge, PageHero, SectionHead } from "@/components/primitives";
import { TRAINERS } from "@/lib/fixtures";
import { formatCurrency } from "@/lib/utils";

const PERIOD = "Apr 14 → Apr 27";

const BREAKDOWN = [
  { trainer: TRAINERS[0], classes: 18, baseCents: 117000, bonusCents: 14000, commissionCents: 31500, fillRate: 88 },
  { trainer: TRAINERS[1], classes: 16, baseCents: 80000, bonusCents: 9000, commissionCents: 18450, fillRate: 84 },
  { trainer: TRAINERS[2], classes: 12, baseCents: 54000, bonusCents: 0, commissionCents: 9900, fillRate: 71 },
  { trainer: TRAINERS[3], classes: 8, baseCents: 40000, bonusCents: 5500, commissionCents: 0, fillRate: 81 },
];

export default function PayrollPage() {
  const total = BREAKDOWN.reduce(
    (s, b) => s + b.baseCents + b.bonusCents + b.commissionCents,
    0,
  );

  return (
    <>
      <PageHero
        meta={`Period · ${PERIOD}`}
        title="Payroll"
        subtitle="Trainer base, fill-rate bonuses, and promo commissions for the current pay period. Approve to release on Apr 28."
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Export · accountant
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="check" size={13} /> Approve period
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
            { label: "Period total", value: formatCurrency(total), delta: "+$240", foot: "vs prior period" },
            { label: "Base pay", value: formatCurrency(BREAKDOWN.reduce((s, b) => s + b.baseCents, 0)), delta: "+$45", foot: "" },
            { label: "Bonuses", value: formatCurrency(BREAKDOWN.reduce((s, b) => s + b.bonusCents, 0)), delta: "+$95", foot: "fill ≥80%" },
            { label: "Commissions", value: formatCurrency(BREAKDOWN.reduce((s, b) => s + b.commissionCents, 0)), delta: "+$100", foot: "promo attribution" },
          ].map((k, i) => (
            <div
              key={k.label}
              style={{
                padding: "20px 22px",
                borderRight: i < 3 ? "1px solid var(--border)" : "none",
              }}
            >
              <div className="metric-label">{k.label}</div>
              <div className="big" style={{ fontSize: 32, marginBottom: 8 }}>
                {k.value}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <ChangeBadge value={k.delta} />
                {k.foot && <span className="muted" style={{ fontSize: 11 }}>{k.foot}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <SectionHead right={<span className="mono text-3" style={{ fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase" }}>4 trainers</span>}>
          <div style={{ padding: "0 18px" }}>Trainer breakdown</div>
        </SectionHead>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                background: "var(--surface-2)",
                borderTop: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {[
                ["Trainer", "left"],
                ["Classes", "right"],
                ["Avg fill", "right"],
                ["Base", "right"],
                ["Bonus", "right"],
                ["Commission", "right"],
                ["Total", "right"],
              ].map(([label, align], i) => (
                <th
                  key={i}
                  style={{
                    textAlign: align as "left" | "right",
                    padding: "12px 16px",
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
            {BREAKDOWN.map((b) => {
              const total = b.baseCents + b.bonusCents + b.commissionCents;
              return (
                <tr key={b.trainer.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div className="row" style={{ gap: 10 }}>
                      <Avatar name={b.trainer.name} seed={b.trainer.seed} size={28} />
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{b.trainer.name}</span>
                    </div>
                  </td>
                  <td className="mono" style={{ padding: "14px 16px", textAlign: "right" }}>{b.classes}</td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <span
                      className="badge"
                      style={{
                        background: b.fillRate >= 80 ? "var(--pos-soft)" : "var(--warn-soft)",
                        color: b.fillRate >= 80 ? "var(--pos)" : "var(--warn)",
                      }}
                    >
                      {b.fillRate}%
                    </span>
                  </td>
                  <td className="mono" style={{ padding: "14px 16px", textAlign: "right" }}>{formatCurrency(b.baseCents)}</td>
                  <td className="mono" style={{ padding: "14px 16px", textAlign: "right", color: b.bonusCents ? "var(--pos)" : "var(--text-3)" }}>
                    {b.bonusCents ? formatCurrency(b.bonusCents) : "—"}
                  </td>
                  <td className="mono" style={{ padding: "14px 16px", textAlign: "right", color: b.commissionCents ? "var(--accent)" : "var(--text-3)" }}>
                    {b.commissionCents ? formatCurrency(b.commissionCents) : "—"}
                  </td>
                  <td className="mono" style={{ padding: "14px 16px", textAlign: "right", fontSize: 14, fontWeight: 600 }}>
                    {formatCurrency(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
