/*
 * Marketing · Campaigns — list of all campaigns with quick action buttons.
 * Builder is opened in a side modal (TODO).
 */

import { Icon } from "@/components/icon";
import { PageHero } from "@/components/primitives";
import { CAMPAIGNS, type Campaign } from "@/lib/fixtures";

const STATUS_TONE: Record<
  Campaign["status"],
  { fg: string; soft: string; label: string }
> = {
  draft: { fg: "var(--text-2)", soft: "var(--surface-2)", label: "Draft" },
  scheduled: {
    fg: "var(--cobalt)",
    soft: "var(--cobalt-soft)",
    label: "Scheduled",
  },
  sending: { fg: "var(--warn)", soft: "var(--warn-soft)", label: "Sending" },
  sent: { fg: "var(--pos)", soft: "var(--pos-soft)", label: "Sent" },
  paused: {
    fg: "var(--text-3)",
    soft: "var(--surface-3)",
    label: "Paused",
  },
};

export default function CampaignsPage() {
  return (
    <>
      <PageHero
        meta="Email + SMS · Tampa"
        title="Campaigns"
        subtitle="Owner-approved sends. AI assists at every content step but never sends autonomously."
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="filter" size={13} /> Filters
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="plus" size={13} /> New campaign
            </button>
          </>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {CAMPAIGNS.map((c) => {
          const tone = STATUS_TONE[c.status];
          const open = c.sent ? Math.round((c.opened / c.sent) * 100) : 0;
          const click = c.sent ? Math.round((c.clicked / c.sent) * 100) : 0;
          return (
            <div
              key={c.id}
              className="card"
              style={{
                padding: 18,
                display: "grid",
                gridTemplateColumns: "1.6fr repeat(4, 1fr) 200px",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div>
                <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {c.name}
                  </span>
                  <span
                    className="badge"
                    style={{ background: tone.soft, color: tone.fg }}
                  >
                    {tone.label}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {c.channel} · segment: {c.segment} ·{" "}
                  {c.scheduledFor ?? c.sentAt ?? "draft"}
                </div>
              </div>
              <div>
                <div className="metric-label">Recipients</div>
                <div
                  className="mono"
                  style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}
                >
                  {c.recipients.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="metric-label">Sent</div>
                <div
                  className="mono"
                  style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}
                >
                  {c.sent.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="metric-label">Open</div>
                <div
                  className="mono"
                  style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}
                >
                  {open}%
                </div>
              </div>
              <div>
                <div className="metric-label">Click</div>
                <div
                  className="mono"
                  style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}
                >
                  {click}%
                </div>
              </div>
              <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                {c.status === "draft" && (
                  <button type="button" className="btn btn-primary hov" style={{ fontSize: 12 }}>
                    <Icon name="edit" size={12} /> Resume
                  </button>
                )}
                {c.status === "sent" && (
                  <button type="button" className="btn btn-ghost hov" style={{ fontSize: 12 }}>
                    <Icon name="chart" size={12} /> Report
                  </button>
                )}
                {c.status === "scheduled" && (
                  <button type="button" className="btn btn-ghost hov" style={{ fontSize: 12 }}>
                    <Icon name="edit" size={12} /> Edit
                  </button>
                )}
                {c.status === "sending" && (
                  <button type="button" className="btn btn-ghost hov" style={{ fontSize: 12 }}>
                    <Icon name="chart" size={12} /> Live
                  </button>
                )}
                <button
                  type="button"
                  className="icon-btn hov"
                  aria-label="Duplicate"
                >
                  <Icon name="check-sq" size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
