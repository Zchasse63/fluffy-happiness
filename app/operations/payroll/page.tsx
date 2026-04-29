/*
 * Operations · Payroll — pay period summaries with trainer base + bonus +
 * commission breakdown.
 *
 * Live computation from `trainers.base_pay_per_class_cents` × class count
 * over the trailing 14 days, plus a fill-rate bonus when the trainer's
 * average fill exceeds their personal `bonus_threshold`.
 */

export const dynamic = "force-dynamic";

import { Avatar } from "@/components/avatar";
import { EmptyTableState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { ChangeBadge, PageHero, SectionHead } from "@/components/primitives";
import { loadCurrentPayroll } from "@/lib/data/payroll";
import { formatCurrency } from "@/lib/utils";

export default async function PayrollPage() {
  const period = await loadCurrentPayroll();
  const total = period.rows.reduce((s, r) => s + r.totalCents, 0);
  const baseTotal = period.rows.reduce((s, r) => s + r.baseCents, 0);
  const bonusTotal = period.rows.reduce((s, r) => s + r.bonusCents, 0);
  const commissionTotal = period.rows.reduce(
    (s, r) => s + r.commissionCents,
    0,
  );

  return (
    <>
      <PageHero
        meta={`Period · ${period.label}`}
        title="Payroll"
        subtitle="Trainer base, fill-rate bonuses, and promo commissions for the current pay period. Approve to release."
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
            {
              label: "Period total",
              value: formatCurrency(total),
              delta: "+0",
              foot: "live",
            },
            {
              label: "Base pay",
              value: formatCurrency(baseTotal),
              delta: "+0",
              foot: "",
            },
            {
              label: "Bonuses",
              value: formatCurrency(bonusTotal),
              delta: "+0",
              foot: "fill ≥ threshold",
            },
            {
              label: "Commissions",
              value: formatCurrency(commissionTotal),
              delta: "+0",
              foot: "promo attribution",
            },
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
                {k.foot && (
                  <span className="muted" style={{ fontSize: 11 }}>
                    {k.foot}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
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
              {period.rows.length} trainer{period.rows.length === 1 ? "" : "s"}
            </span>
          }
        >
          <div style={{ padding: "0 18px" }}>Trainer breakdown</div>
        </SectionHead>
        {period.rows.length === 0 ? (
          <EmptyTableState>
            No trainer-led classes in this period yet.
          </EmptyTableState>
        ) : (
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
              {period.rows.map((b, i) => (
                <tr
                  key={b.trainerId}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td style={{ padding: "14px 16px" }}>
                    <div className="row" style={{ gap: 10 }}>
                      <Avatar name={b.trainerName} seed={i + 1} size={28} />
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                        {b.trainerName}
                      </span>
                    </div>
                  </td>
                  <td
                    className="mono"
                    style={{ padding: "14px 16px", textAlign: "right" }}
                  >
                    {b.classes}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <span
                      className="badge"
                      style={{
                        background:
                          b.fillRatePct >= 80
                            ? "var(--pos-soft)"
                            : "var(--warn-soft)",
                        color:
                          b.fillRatePct >= 80
                            ? "var(--pos)"
                            : "var(--warn)",
                      }}
                    >
                      {b.fillRatePct}%
                    </span>
                  </td>
                  <td
                    className="mono"
                    style={{ padding: "14px 16px", textAlign: "right" }}
                  >
                    {formatCurrency(b.baseCents)}
                  </td>
                  <td
                    className="mono"
                    style={{
                      padding: "14px 16px",
                      textAlign: "right",
                      color: b.bonusCents ? "var(--pos)" : "var(--text-3)",
                    }}
                  >
                    {b.bonusCents ? formatCurrency(b.bonusCents) : "—"}
                  </td>
                  <td
                    className="mono"
                    style={{
                      padding: "14px 16px",
                      textAlign: "right",
                      color: b.commissionCents ? "var(--accent)" : "var(--text-3)",
                    }}
                  >
                    {b.commissionCents ? formatCurrency(b.commissionCents) : "—"}
                  </td>
                  <td
                    className="mono"
                    style={{
                      padding: "14px 16px",
                      textAlign: "right",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {formatCurrency(b.totalCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
