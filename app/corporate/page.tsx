/*
 * Corporate — B2B accounts, group bookings, and corporate event tracking.
 */

import { Icon } from "@/components/icon";
import { PageHero, SectionHead } from "@/components/primitives";
import { formatCurrency } from "@/lib/utils";

const ACCOUNTS = [
  { id: "co1", name: "Cigar City Brewing", contact: "Mark Ortega", monthly: 12, ytdCents: 168000, status: "active" as const },
  { id: "co2", name: "Tampa General Health", contact: "Lin Chen", monthly: 8, ytdCents: 122400, status: "active" as const },
  { id: "co3", name: "Outpost Coffee Roasters", contact: "Sasha Bell", monthly: 4, ytdCents: 41600, status: "active" as const },
  { id: "co4", name: "Ybor Architecture Co.", contact: "Theo Park", monthly: 0, ytdCents: 9600, status: "paused" as const },
];

const EVENTS = [
  { id: "ev1", company: "Cigar City Brewing", title: "Quarterly team session", date: "Apr 25 · 6 PM", guests: 18, status: "scheduled" as const },
  { id: "ev2", company: "Tampa General Health", title: "Wellness Wednesday", date: "Apr 23 · 7 PM", guests: 12, status: "scheduled" as const },
  { id: "ev3", company: "Outpost Coffee Roasters", title: "Founders day", date: "May 14 · 6 PM", guests: 8, status: "scheduled" as const },
];

export default function CorporatePage() {
  return (
    <>
      <PageHero
        meta="B2B accounts · Tampa"
        title="Corporate accounts"
        subtitle="Companies that book group sessions or sponsor employee memberships. Each account aggregates its members and event history."
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Export
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="plus" size={13} /> New account
            </button>
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <SectionHead right={<span className="mono text-3" style={{ fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase" }}>4 active</span>}>
            <span style={{ padding: "0 18px" }}>Accounts</span>
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
                  ["Company", "left"],
                  ["Primary contact", "left"],
                  ["Monthly bookings", "right"],
                  ["YTD revenue", "right"],
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
              {ACCOUNTS.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600 }}>
                    {a.name}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13 }}>{a.contact}</td>
                  <td className="mono" style={{ padding: "14px 16px", textAlign: "right" }}>
                    {a.monthly}
                  </td>
                  <td className="mono" style={{ padding: "14px 16px", textAlign: "right", fontWeight: 600 }}>
                    {formatCurrency(a.ytdCents)}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      className="badge"
                      style={{
                        background:
                          a.status === "active"
                            ? "var(--pos-soft)"
                            : "var(--surface-3)",
                        color: a.status === "active" ? "var(--pos)" : "var(--text-2)",
                      }}
                    >
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <SectionHead>Upcoming events</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {EVENTS.map((e) => (
              <div
                key={e.id}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="mono text-3" style={{ fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                  {e.date}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  {e.title}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {e.company} · {e.guests} guests
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
