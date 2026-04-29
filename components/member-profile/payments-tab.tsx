/*
 * Payments tab on the member profile — last 20 transactions for the
 * member (live from `transactions`).
 */

import { TableHead } from "@/components/primitives";
import { ToneBadge } from "@/components/status-pill";
import type { MemberPaymentRow } from "@/lib/data/members";
import { formatCurrency } from "@/lib/utils";

const PAYMENT_STATUS_TONE: Record<
  MemberPaymentRow["status"],
  { fg: string; soft: string }
> = {
  completed: { fg: "var(--pos)", soft: "var(--pos-soft)" },
  failed: { fg: "var(--neg)", soft: "var(--neg-soft)" },
  refunded: { fg: "var(--text-2)", soft: "var(--surface-3)" },
  pending: { fg: "var(--warn)", soft: "var(--warn-soft)" },
  disputed: { fg: "var(--neg)", soft: "var(--neg-soft)" },
};

export function PaymentsTab({ rows }: { rows: MemberPaymentRow[] }) {
  if (!rows.length) {
    return (
      <div
        className="card"
        style={{
          display: "grid",
          placeItems: "center",
          padding: 48,
          textAlign: "center",
        }}
      >
        <div className="muted" style={{ fontSize: 13 }}>
          No payment history for this member yet.
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <TableHead
          columns={[
            { label: "When" },
            { label: "Description" },
            { label: "Method" },
            { label: "Status" },
            { label: "Amount", align: "right" },
          ]}
        />
        <tbody>
          {rows.map((r) => {
            const tone = PAYMENT_STATUS_TONE[r.status];
            return (
              <tr
                key={r.id}
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
                  {r.occurred}
                </td>
                <td style={{ padding: "12px 14px", fontSize: 13 }}>
                  {r.description}
                </td>
                <td
                  className="mono text-3"
                  style={{ padding: "12px 14px", fontSize: 11.5 }}
                >
                  {r.card}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <ToneBadge tone={tone}>{r.status}</ToneBadge>
                </td>
                <td
                  className="mono"
                  style={{
                    padding: "12px 14px",
                    textAlign: "right",
                    fontSize: 13,
                    fontWeight: 600,
                    color:
                      r.amountCents < 0
                        ? "var(--neg)"
                        : r.status === "failed"
                          ? "var(--text-3)"
                          : "var(--text)",
                  }}
                >
                  {formatCurrency(r.amountCents)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
