/*
 * Revenue · Dunning — failed payment recovery queue. One row per
 * outstanding charge with retry / update-card / contact-member actions.
 */

import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { PageHero, SectionHead } from "@/components/primitives";
import { DUNNING } from "@/lib/fixtures";
import { formatCurrency } from "@/lib/utils";

export default function RevenueDunningPage() {
  const totalAtRisk = DUNNING.reduce((s, d) => s + d.amountCents, 0);

  return (
    <>
      <PageHero
        meta={`${DUNNING.length} open · ${formatCurrency(totalAtRisk)} at risk`}
        title="Dunning"
        subtitle={
          <>
            Stripe retries automatically; this view is for the cases that need
            a human nudge — expired cards, chargebacks, and after the
            auto-retry budget is exhausted.
          </>
        }
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Export
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="send" size={13} /> Send all reminders
            </button>
          </>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {DUNNING.map((d, i) => (
          <div
            key={d.id}
            className="card"
            style={{
              padding: 18,
              display: "grid",
              gridTemplateColumns: "44px 1.5fr 1fr 1fr 220px",
              alignItems: "center",
              gap: 16,
              borderLeft: `3px solid ${
                i === 0
                  ? "var(--neg)"
                  : i === 1
                    ? "var(--warn)"
                    : "var(--cobalt)"
              }`,
            }}
          >
            <Avatar name={d.member} seed={d.seed ?? 0} size={44} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{d.member}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                {d.plan}
              </div>
            </div>
            <div>
              <div className="metric-label">Reason</div>
              <div style={{ fontSize: 13, marginTop: 2 }}>{d.reason}</div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                Attempts · {d.attempts}
              </div>
            </div>
            <div>
              <div className="metric-label">Amount</div>
              <div
                className="mono"
                style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}
              >
                {formatCurrency(d.amountCents)}
              </div>
              <div
                className="mono text-3"
                style={{ fontSize: 11, marginTop: 2 }}
              >
                Next: {d.nextRetry}
              </div>
            </div>
            <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-ghost hov" style={{ fontSize: 12 }}>
                <Icon name="mail" size={12} /> Remind
              </button>
              <button type="button" className="btn btn-primary hov" style={{ fontSize: 12 }}>
                <Icon name="income" size={12} /> Retry
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <SectionHead>Recovery playbook</SectionHead>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {[
            {
              title: "Card expired",
              copy: "Send the update-payment link via email + SMS. If no response after 48h, pause the membership until updated.",
            },
            {
              title: "Insufficient funds",
              copy: "Stripe Smart Retries handles 3 attempts over 7 days. If it fails again, surface here and contact the member.",
            },
            {
              title: "Chargeback",
              copy: "Respond within 7 days with proof of service (booking receipts, check-in QR, signed waiver). Flag the member as risky.",
            },
          ].map((p) => (
            <div
              key={p.title}
              style={{
                padding: 16,
                borderRadius: 12,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                {p.title}
              </div>
              <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                {p.copy}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
