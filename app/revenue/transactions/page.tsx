/*
 * Revenue · Transactions — filterable transaction log with refund and
 * dispute action buttons. Negative amounts render as refunds.
 */

import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/primitives";
import { TRANSACTIONS, type RevenueKind } from "@/lib/fixtures";
import { formatCurrency } from "@/lib/utils";

const KIND_TONE: Record<RevenueKind, { fg: string; soft: string; label: string }> = {
  membership: { fg: "var(--accent-deep)", soft: "var(--accent-soft)", label: "Membership" },
  class_pack: { fg: "var(--teal)", soft: "var(--teal-soft)", label: "Pack" },
  retail: { fg: "var(--cobalt)", soft: "var(--cobalt-soft)", label: "Retail" },
  gift_card: { fg: "var(--gold)", soft: "var(--gold-soft)", label: "Gift card" },
  walk_in: { fg: "var(--moss)", soft: "var(--moss-soft)", label: "Walk-in" },
  corporate: { fg: "var(--plum)", soft: "var(--plum-soft)", label: "Corporate" },
};

export default function RevenueTransactionsPage() {
  return (
    <>
      <PageHero
        meta="Last 14 days · Tampa"
        title="Transactions"
        subtitle="Every payment, refund, and chargeback. Filter by kind, status, or date range."
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="filter" size={13} /> Filters
            </button>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Export
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="plus" size={13} /> Record payment
            </button>
          </>
        }
      />

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
              placeholder="Search by member, amount, or txn id…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 13,
              }}
            />
          </div>
          <span className="tabs">
            <span className="tab active">All</span>
            <span className="tab">Completed</span>
            <span className="tab">Refunded</span>
            <span className="tab">Failed</span>
          </span>
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
                ["Time", "left"],
                ["Member", "left"],
                ["Description", "left"],
                ["Kind", "left"],
                ["Method", "left"],
                ["Status", "left"],
                ["Amount", "right"],
                ["", "right"],
              ].map(([label, align], i) => (
                <th
                  key={i}
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
            {TRANSACTIONS.map((t) => {
              const tone = KIND_TONE[t.kind];
              const refunded = t.status === "refunded";
              const failed = t.status === "failed";
              return (
                <tr
                  key={t.id}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td
                    className="mono text-3"
                    style={{
                      padding: "12px 14px",
                      fontSize: 11.5,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {t.occurred}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div className="row" style={{ gap: 10 }}>
                      <Avatar name={t.member} seed={t.seed ?? 0} size={26} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {t.member}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13 }}>
                    {t.description}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      className="badge"
                      style={{ background: tone.soft, color: tone.fg }}
                    >
                      {tone.label}
                    </span>
                  </td>
                  <td
                    className="mono text-3"
                    style={{ padding: "12px 14px", fontSize: 11.5 }}
                  >
                    {t.card}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      className="badge"
                      style={{
                        background: refunded
                          ? "var(--surface-3)"
                          : failed
                            ? "var(--neg-soft)"
                            : "var(--pos-soft)",
                        color: refunded
                          ? "var(--text-2)"
                          : failed
                            ? "var(--neg)"
                            : "var(--pos)",
                      }}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td
                    className="mono"
                    style={{
                      padding: "12px 14px",
                      textAlign: "right",
                      fontSize: 13,
                      fontWeight: 600,
                      color:
                        t.amountCents < 0
                          ? "var(--neg)"
                          : failed
                            ? "var(--text-3)"
                            : "var(--text)",
                    }}
                  >
                    {formatCurrency(t.amountCents)}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    {!refunded && !failed && (
                      <button
                        type="button"
                        className="btn btn-ghost hov"
                        style={{ height: 26, fontSize: 11.5 }}
                      >
                        Refund
                      </button>
                    )}
                    {failed && (
                      <button
                        type="button"
                        className="btn btn-primary hov"
                        style={{ height: 26, fontSize: 11.5 }}
                      >
                        Retry
                      </button>
                    )}
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
