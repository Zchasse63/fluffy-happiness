/*
 * Revenue · Memberships & Pricing — plan table with MRR contribution,
 * a one-shot pricing simulator (impact preview), and promo code
 * attribution.
 */

import { Icon } from "@/components/icon";
import { ChangeBadge, PageHero, SectionHead } from "@/components/primitives";
import { PLANS } from "@/lib/fixtures";
import { formatCurrency } from "@/lib/utils";

export default function RevenueMembershipsPage() {
  const totalMrr = PLANS.reduce((s, p) => s + p.mrrCents, 0);

  return (
    <>
      <PageHero
        meta="Plans · Pricing · Promo attribution"
        title="Memberships & pricing"
        subtitle={
          <>
            5 active plans contributing{" "}
            <strong>{formatCurrency(totalMrr)}</strong> MRR. The legacy
            Founders rate is grandfathered for 11 members and hidden from
            new purchases.
          </>
        }
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="sparkle" size={13} /> Run simulator
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="plus" size={13} /> New plan
            </button>
          </>
        }
      />

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                background: "var(--surface-2)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {[
                ["Plan", "left"],
                ["Tier", "left"],
                ["Price", "right"],
                ["Active", "right"],
                ["MRR", "right"],
                ["Credits / cycle", "right"],
                ["Guests", "right"],
                ["Status", "left"],
              ].map(([label, align]) => (
                <th
                  key={label}
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
            {PLANS.map((p) => (
              <tr
                key={p.id}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                    plan_{p.id}
                  </div>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13 }}>
                  {p.tier}
                </td>
                <td
                  className="mono"
                  style={{
                    padding: "14px 16px",
                    textAlign: "right",
                    fontSize: 13,
                  }}
                >
                  {formatCurrency(p.priceCents)}
                </td>
                <td
                  className="mono"
                  style={{
                    padding: "14px 16px",
                    textAlign: "right",
                    fontSize: 13,
                  }}
                >
                  {p.active}
                </td>
                <td
                  className="mono"
                  style={{
                    padding: "14px 16px",
                    textAlign: "right",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {formatCurrency(p.mrrCents)}
                </td>
                <td
                  className="mono text-3"
                  style={{
                    padding: "14px 16px",
                    textAlign: "right",
                    fontSize: 12,
                  }}
                >
                  {p.creditsPerCycle ?? "—"}
                </td>
                <td
                  className="mono text-3"
                  style={{
                    padding: "14px 16px",
                    textAlign: "right",
                    fontSize: 12,
                  }}
                >
                  {p.guests}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  {p.legacy ? (
                    <span
                      className="badge"
                      style={{
                        background: "var(--surface-2)",
                        color: "var(--text-2)",
                      }}
                    >
                      Legacy
                    </span>
                  ) : (
                    <span
                      className="badge"
                      style={{
                        background: "var(--pos-soft)",
                        color: "var(--pos)",
                      }}
                    >
                      Active
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
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
                Beta
              </span>
            }
          >
            Pricing simulator
          </SectionHead>
          <div
            className="row"
            style={{ gap: 14, alignItems: "flex-end", marginBottom: 18 }}
          >
            <div style={{ flex: 1 }}>
              <div className="metric-label">Plan</div>
              <div
                className="row"
                style={{
                  height: 38,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "0 12px",
                  background: "var(--surface)",
                  fontSize: 13,
                  justifyContent: "space-between",
                }}
              >
                <span>Monthly Unlimited</span>
                <Icon name="chev-down" size={12} />
              </div>
            </div>
            <div style={{ width: 130 }}>
              <div className="metric-label">Current</div>
              <div
                className="big"
                style={{ fontSize: 28, lineHeight: 1, marginTop: 4 }}
              >
                $225
              </div>
            </div>
            <div style={{ width: 130 }}>
              <div className="metric-label">Proposed</div>
              <div
                className="big"
                style={{
                  fontSize: 28,
                  lineHeight: 1,
                  marginTop: 4,
                  color: "var(--accent)",
                }}
              >
                $245
              </div>
            </div>
          </div>
          <div
            style={{
              padding: 14,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12.5,
              lineHeight: 1.7,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              Impact preview · next billing cycle
            </div>
            <div className="muted">
              42 active members affected · MRR change{" "}
              <strong style={{ color: "var(--pos)" }}>+$840/mo</strong> · churn
              risk 2–4 members based on Tampa-market elasticity. Break-even at
              2 cancellations.
            </div>
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-primary hov"
                style={{ height: 30, fontSize: 12.5 }}
              >
                Apply change
              </button>
              <button
                type="button"
                className="btn btn-ghost hov"
                style={{ height: 30, fontSize: 12.5 }}
              >
                Run A/B test
              </button>
            </div>
          </div>
        </div>

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
                Last 30d · uses · attributed revenue
              </span>
            }
          >
            Trainer promo codes
          </SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { code: "WHITNEY15", trainer: "Whitney Abrams", uses: 14, rev: 3150 },
              { code: "TRENT10", trainer: "Trent Lott", uses: 9, rev: 1845 },
              { code: "BEN10", trainer: "Ben Kniesly", uses: 6, rev: 990 },
              { code: "LAUNCH25", trainer: "House", uses: 22, rev: 5460 },
            ].map((p) => (
              <div
                key={p.code}
                className="row"
                style={{
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  fontSize: 13,
                }}
              >
                <div>
                  <div className="mono" style={{ fontWeight: 600 }}>
                    {p.code}
                  </div>
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    {p.trainer}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontWeight: 600 }}>
                    {formatCurrency(p.rev * 100)}
                  </div>
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    {p.uses} uses
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
