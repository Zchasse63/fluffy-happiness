/*
 * Settings — global studio configuration. Live from `studios` +
 * `settings` (KV) + `membership_plans` + `profiles` for team count.
 *
 * Booking rules are editable inline; the other sections show real
 * status with edit links to the relevant module (plans go to
 * /revenue/memberships, team to operations/staff, etc.).
 */

export const dynamic = "force-dynamic";

import Link from "next/link";

import { Icon } from "@/components/icon";
import { PageHero, SectionHead } from "@/components/primitives";
import { BookingRulesEditor } from "@/components/settings/booking-rules-editor";
import { ToneBadge } from "@/components/status-pill";
import { loadSettings } from "@/lib/data/settings";

const STATUS_TONE: Record<string, { fg: string; soft: string; label: string }> =
  {
    connected: { fg: "var(--pos)", soft: "var(--pos-soft)", label: "Connected" },
    pending: { fg: "var(--warn)", soft: "var(--warn-soft)", label: "Pending" },
    disabled: {
      fg: "var(--text-2)",
      soft: "var(--surface-3)",
      label: "Disabled",
    },
  };

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function SettingsPage() {
  const settings = await loadSettings();
  const { business, bookingRules, notifications, integrations } = settings;

  return (
    <>
      <PageHero
        meta="Studio configuration"
        title="Settings"
        subtitle="Global configuration for The Sauna Guys. Per-tenant values live on the studio row; per-feature values live in the settings table."
        actions={
          <button type="button" className="btn btn-ghost hov">
            <Icon name="download" size={13} /> Export
          </button>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
        }}
      >
        <section className="card">
          <SectionHead>Business</SectionHead>
          <FieldList
            fields={[
              ["Business name", business.name],
              ["Slug", business.slug],
              ["Timezone", business.timezone],
              ["Currency", business.currency],
              ["Tax rate", `${(business.taxRate * 100).toFixed(2)}%`],
            ]}
          />
        </section>

        <section className="card">
          <SectionHead right={<BookingRulesEditor rules={bookingRules} />}>
            Booking rules
          </SectionHead>
          <FieldList
            fields={[
              ["Booking window", `${bookingRules.bookingWindowDays} days`],
              [
                "Cancellation policy",
                `${bookingRules.cancellationPolicyHours} hours before class`,
              ],
              [
                "Late cancel fee",
                formatCents(bookingRules.lateCancelFeeCents),
              ],
              ["No-show fee", formatCents(bookingRules.noShowFeeCents)],
              [
                "Waitlist auto-promote",
                bookingRules.waitlistAutoPromote ? "On" : "Off",
              ],
            ]}
          />
        </section>

        <section className="card">
          <SectionHead>Notifications</SectionHead>
          <FieldList
            fields={[
              ["Booking confirmation", notifications.bookingConfirmation],
              ["Reminder", notifications.reminder],
              ["Daily briefing", notifications.dailyBriefing],
              ["Failed payment alert", notifications.failedPaymentAlert],
            ]}
          />
        </section>

        <section className="card">
          <SectionHead>Integrations</SectionHead>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {integrations.map((i, idx) => {
              const tone = STATUS_TONE[i.status];
              return (
                <div
                  key={i.name}
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom:
                      idx < integrations.length - 1
                        ? "1px dashed var(--border)"
                        : "none",
                    fontSize: 13,
                  }}
                >
                  <span className="muted">{i.name}</span>
                  <span
                    className="row"
                    style={{ gap: 8, alignItems: "center" }}
                  >
                    <ToneBadge tone={tone}>{tone.label}</ToneBadge>
                    <span style={{ fontWeight: 500, fontSize: 12 }}>
                      {i.detail}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <SectionHead
            right={
              <Link
                href="/revenue/memberships"
                className="btn btn-link hov"
                style={{ fontSize: 12 }}
              >
                Manage <Icon name="arrow-right" size={11} />
              </Link>
            }
          >
            Plans
          </SectionHead>
          <div style={{ padding: "10px 0", fontSize: 13 }}>
            <strong>{settings.plansCount}</strong> active membership plan
            {settings.plansCount === 1 ? "" : "s"} — see{" "}
            <Link href="/revenue/memberships">Revenue · Memberships</Link> to
            create or edit.
          </div>
        </section>

        <section className="card">
          <SectionHead
            right={
              <Link
                href="/operations/staff"
                className="btn btn-link hov"
                style={{ fontSize: 12 }}
              >
                Manage <Icon name="arrow-right" size={11} />
              </Link>
            }
          >
            Team
          </SectionHead>
          <div style={{ padding: "10px 0", fontSize: 13 }}>
            <strong>{settings.teamCount}</strong> team member
            {settings.teamCount === 1 ? "" : "s"} with sign-in access. Invite
            new owners or managers from{" "}
            <Link href="/operations/staff">Operations · Staff</Link>.
          </div>
        </section>
      </div>
    </>
  );
}

function FieldList({ fields }: { fields: Array<[string, string]> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {fields.map(([label, value], i) => (
        <div
          key={label}
          className="row"
          style={{
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom:
              i < fields.length - 1 ? "1px dashed var(--border)" : "none",
            fontSize: 13,
          }}
        >
          <span className="muted">{label}</span>
          <span style={{ fontWeight: 500 }}>{value}</span>
        </div>
      ))}
    </div>
  );
}
