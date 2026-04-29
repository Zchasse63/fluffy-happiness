/*
 * Revenue · Gift cards — issued and redeemed cards with wallet balances.
 * Live via `loadGiftCards` against `gift_cards` (added in 0013); falls
 * back to a small fixture when the table is empty.
 */

export const dynamic = "force-dynamic";

import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { ChangeBadge, PageHero } from "@/components/primitives";
import { loadGiftCards } from "@/lib/data/retail";
import { formatCurrency } from "@/lib/utils";

export default async function GiftCardsPage() {
  const CARDS = await loadGiftCards();
  const issued30 = CARDS.reduce((s, c) => s + c.amountCents, 0);
  const outstanding = CARDS.filter((c) => c.status === "active").reduce(
    (s, c) => s + c.remainingCents,
    0,
  );
  const redeemed = CARDS.filter((c) => c.status === "redeemed").reduce(
    (s, c) => s + c.amountCents,
    0,
  );

  return (
    <>
      <PageHero
        meta="Issued + redeemed · Tampa"
        title="Gift cards"
        subtitle="Cards stored as wallet balances. Wallet credits can pay for any class, retail item, or membership renewal."
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Export
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="plus" size={13} /> Issue card
            </button>
          </>
        }
      />

      <div className="card card-tight" style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            alignItems: "stretch",
          }}
        >
          {[
            { label: "Issued total", value: formatCurrency(issued30), delta: "+0", foot: `${CARDS.length} cards` },
            { label: "Outstanding", value: formatCurrency(outstanding), delta: "+0", foot: `${CARDS.filter((c) => c.status === "active").length} active` },
            { label: "Redeemed", value: formatCurrency(redeemed), delta: "+0", foot: "fully spent" },
          ].map((k, i) => (
            <div
              key={k.label}
              style={{
                padding: "20px 22px",
                borderRight: i < 2 ? "1px solid var(--border)" : "none",
              }}
            >
              <div className="metric-label">{k.label}</div>
              <div className="big" style={{ fontSize: 32, marginBottom: 8 }}>
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
                ["Recipient", "left"],
                ["Card ID", "left"],
                ["Issued by", "left"],
                ["Issued", "left"],
                ["Original", "right"],
                ["Remaining", "right"],
                ["Status", "left"],
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
            {CARDS.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "14px 16px" }}>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={c.recipient} seed={c.seed ?? 0} size={26} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {c.recipient}
                    </span>
                  </div>
                </td>
                <td className="mono" style={{ padding: "14px 16px", fontSize: 12 }}>
                  {c.id}
                </td>
                <td style={{ padding: "14px 16px", fontSize: 12.5 }}>
                  {c.issuedBy}
                </td>
                <td className="mono text-3" style={{ padding: "14px 16px", fontSize: 11.5 }}>
                  {c.issued}
                </td>
                <td className="mono" style={{ padding: "14px 16px", textAlign: "right", fontSize: 13 }}>
                  {formatCurrency(c.amountCents)}
                </td>
                <td className="mono" style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, fontWeight: 600 }}>
                  {formatCurrency(c.remainingCents)}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span
                    className="badge"
                    style={{
                      background:
                        c.status === "active"
                          ? "var(--pos-soft)"
                          : c.status === "expired" || c.status === "voided"
                            ? "var(--neg-soft)"
                            : "var(--surface-3)",
                      color:
                        c.status === "active"
                          ? "var(--pos)"
                          : c.status === "expired" || c.status === "voided"
                            ? "var(--neg)"
                            : "var(--text-2)",
                    }}
                  >
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
