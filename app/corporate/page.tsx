/*
 * Corporate — B2B accounts, group bookings, and corporate event tracking.
 * Live from `corporate_accounts` (added in migration 0012). Members
 * link via `members.corporate_account_id`. Fixture fallback when no
 * accounts have been created yet.
 */

export const dynamic = "force-dynamic";

import { NewCorporateAccountButton } from "@/components/corporate/new-account-button";
import { EmptyTableState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { PageHero, SectionHead } from "@/components/primitives";
import { ToneBadge } from "@/components/status-pill";
import {
  loadCorporateAccounts,
  loadCorporateUpcomingEvents,
} from "@/lib/data/corporate";
import { formatCurrency } from "@/lib/utils";

const STATUS_TONE: Record<
  "active" | "paused" | "cancelled",
  { fg: string; soft: string }
> = {
  active: { fg: "var(--pos)", soft: "var(--pos-soft)" },
  paused: { fg: "var(--text-2)", soft: "var(--surface-3)" },
  cancelled: { fg: "var(--neg)", soft: "var(--neg-soft)" },
};

export default async function CorporatePage() {
  const [accounts, events] = await Promise.all([
    loadCorporateAccounts(),
    loadCorporateUpcomingEvents(),
  ]);
  const activeCount = accounts.filter((a) => a.status === "active").length;

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
            <NewCorporateAccountButton />
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
                {activeCount} active
              </span>
            }
          >
            <span style={{ padding: "0 18px" }}>Accounts</span>
          </SectionHead>
          {accounts.length === 0 ? (
            <EmptyTableState>
              No corporate accounts yet. Create your first to start tracking
              member sponsorships and group bookings.
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
                    ["Company", "left"],
                    ["Primary contact", "left"],
                    ["Members", "right"],
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
                {accounts.map((a) => {
                  const tone = STATUS_TONE[a.status];
                  return (
                    <tr
                      key={a.id}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td
                        style={{
                          padding: "14px 16px",
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {a.name}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13 }}>
                        {a.contact}
                      </td>
                      <td
                        className="mono"
                        style={{ padding: "14px 16px", textAlign: "right" }}
                      >
                        {a.memberCount}
                      </td>
                      <td
                        className="mono"
                        style={{
                          padding: "14px 16px",
                          textAlign: "right",
                          fontWeight: 600,
                        }}
                      >
                        {formatCurrency(a.ytdRevenueCents)}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <ToneBadge tone={tone}>{a.status}</ToneBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <SectionHead>Upcoming events</SectionHead>
          {events.length === 0 ? (
            <div
              style={{
                padding: "12px 0",
                color: "var(--text-2)",
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              Group event tracking arrives in the next iteration. For now,
              schedule corporate sessions on the regular calendar with the
              member roster pre-tagged.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {events.map((e) => (
                <div
                  key={e.id}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    className="mono text-3"
                    style={{
                      fontSize: 10.5,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    {e.date}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    {e.title}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {e.company} · {e.guests} guests
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
