/*
 * Settings — global studio configuration. The current values are read
 * from the `settings` table seeded in migration 0005; eventually this
 * page will server-fetch them and let admins edit each section.
 */

import { Icon } from "@/components/icon";
import { PageHero, SectionHead } from "@/components/primitives";

const SECTIONS = [
  {
    title: "Business",
    fields: [
      ["Business name", "The Sauna Guys"],
      ["Slug", "the-sauna-guys"],
      ["Timezone", "America/New_York"],
      ["Currency", "USD"],
      ["Tax rate", "4.25%"],
    ],
  },
  {
    title: "Booking rules",
    fields: [
      ["Booking window", "14 days"],
      ["Cancellation policy", "12 hours before class"],
      ["Late cancel fee", "$5.00"],
      ["No-show fee", "$5.00"],
      ["Waitlist auto-promote", "On"],
    ],
  },
  {
    title: "Notifications",
    fields: [
      ["Booking confirmation", "Email + SMS"],
      ["Reminder", "2 hours before · Email"],
      ["Daily briefing", "6:00 AM ET to owners + managers"],
      ["Failed payment alert", "Real-time · Email"],
    ],
  },
  {
    title: "Integrations",
    fields: [
      ["Glofox", "Connected · sandbox"],
      ["Stripe", "Connected · live"],
      ["Resend", "Pending domain verification"],
      ["Anthropic", "Disabled · key required"],
      ["Inngest", "Disabled · key required"],
    ],
  },
];

export default function SettingsPage() {
  return (
    <>
      <PageHero
        meta="Studio configuration"
        title="Settings"
        subtitle="Global configuration for The Sauna Guys. Per-tenant values live on the studio row; per-feature values live in the settings table."
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Export
            </button>
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
        }}
      >
        {SECTIONS.map((s) => (
          <div className="card" key={s.title}>
            <SectionHead
              right={
                <button
                  type="button"
                  className="btn btn-link hov"
                  style={{ fontSize: 12 }}
                >
                  <Icon name="edit" size={11} /> Edit
                </button>
              }
            >
              {s.title}
            </SectionHead>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {s.fields.map(([label, value], i) => (
                <div
                  key={label}
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom:
                      i < s.fields.length - 1
                        ? "1px dashed var(--border)"
                        : "none",
                    fontSize: 13,
                  }}
                >
                  <span className="muted">{label}</span>
                  <span style={{ fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
