/*
 * Revenue · Memberships & Pricing — plan table with MRR contribution,
 * a one-shot pricing simulator (impact preview), and promo code
 * attribution.
 *
 * Live data via `loadMembershipPlans`; falls back to fixtures when DB
 * is empty.
 */

export const dynamic = "force-dynamic";

import { Icon } from "@/components/icon";
import { PageHero, SectionHead, TableHead } from "@/components/primitives";
import { loadMembershipPlans } from "@/lib/data/revenue";
import { formatCurrency } from "@/lib/utils";

const TABLE_COLUMNS = [
  { label: "Plan" },
  { label: "Tier" },
  { label: "Price", align: "right" as const },
  { label: "Active", align: "right" as const },
  { label: "MRR", align: "right" as const },
  { label: "Credits / cycle", align: "right" as const },
  { label: "Guests", align: "right" as const },
  { label: "Status" },
];

export default async function RevenueMembershipsPage() {
  const plans = await loadMembershipPlans();
  const totalMrr = plans.reduce((s, p) => s + p.mrrCents, 0);

  return (
    <>
      <PageHero
        meta="Plans · Pricing · Promo attribution"
        title="Memberships & pricing"
        subtitle={
          <>
            {plans.length} plans contributing{" "}
            <strong>{formatCurrency(totalMrr)}</strong> MRR. Legacy plans are
            grandfathered for existing members and hidden from new purchases.
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
          <TableHead columns={TABLE_COLUMNS} />
          <tbody>
            {plans.map((p) => (
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
        {/* Pricing simulator and Trainer promo codes were removed
            2026-05-08 (specs/audits/qa-discovery-2026-05-08.md §B.1)
            because both rendered hardcoded fictional numbers. They are
            tracked as deferred features in DEFERRED.md:
              - Pricing simulator: blocked on a Glofox write API for
                membership plan price changes (Glofox doesn't expose
                this today; pricing changes are made directly in the
                Glofox dashboard).
              - Trainer promo codes: blocked on Glofox exposing promo
                code creation + per-code attribution. The Glofox API
                returns promo codes only as input parameters at
                checkout; there is no list/create endpoint.
            Honest empty states surface the constraint to operators. */}
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
                Deferred
              </span>
            }
          >
            Pricing simulator
          </SectionHead>
          <div
            className="muted"
            style={{ fontSize: 13, lineHeight: 1.7, padding: "8px 0 4px" }}
          >
            Plan price changes are made in the Glofox dashboard — Glofox
            doesn't expose plan-pricing writes via API. Will be wired
            here once that surface lands. Until then, edit the plan in
            Glofox and the new price flows through on the next sync.
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
                Deferred
              </span>
            }
          >
            Trainer promo codes
          </SectionHead>
          <div
            className="muted"
            style={{ fontSize: 13, lineHeight: 1.7, padding: "8px 0 4px" }}
          >
            Glofox doesn't expose promo-code creation or per-code
            attribution via API. Codes live in the Glofox dashboard and
            uses are reported there. We'll surface them here once that
            data is reachable through a future endpoint.
          </div>
        </div>
      </div>
    </>
  );
}
