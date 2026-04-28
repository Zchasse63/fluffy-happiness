/*
 * Marketing · Overview — campaign performance funnel, lead funnel,
 * scheduled campaigns, and active automation enrollments at a glance.
 */

import Link from "next/link";

import { Icon } from "@/components/icon";
import {
  ChangeBadge,
  Donut,
  PageHero,
  SectionHead,
} from "@/components/primitives";
import { AUTOMATIONS, CAMPAIGNS, LEADS } from "@/lib/fixtures";

export default function MarketingOverviewPage() {
  const sentCampaigns = CAMPAIGNS.filter((c) => c.status === "sent");
  const totalSent = sentCampaigns.reduce((s, c) => s + c.sent, 0);
  const totalOpened = sentCampaigns.reduce((s, c) => s + c.opened, 0);
  const totalClicked = sentCampaigns.reduce((s, c) => s + c.clicked, 0);
  const totalConverted = sentCampaigns.reduce((s, c) => s + c.converted, 0);
  const openRate = totalSent ? Math.round((totalOpened / totalSent) * 100) : 0;
  const clickRate = totalSent
    ? Math.round((totalClicked / totalSent) * 100)
    : 0;

  const leadsByStatus = LEADS.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHero
        meta="Last 30 days · Tampa"
        title="Marketing"
        subtitle={
          <>
            5 campaigns sent or in flight, 8 leads in the pipeline, 6 active
            automations. Open rate is{" "}
            <strong>{openRate}%</strong> — well above the studio benchmark of
            32%.
          </>
        }
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="sparkle" size={13} /> Suggest a campaign
            </button>
            <Link
              href="/marketing/campaigns"
              className="btn btn-primary hov"
            >
              <Icon name="plus" size={13} /> New campaign
            </Link>
          </>
        }
      />

      <div className="card card-tight" style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            alignItems: "stretch",
          }}
        >
          {[
            { label: "Sent · 30d", value: String(totalSent), delta: "+18", foot: "rolling" },
            { label: "Open rate", value: `${openRate}%`, delta: "+4.2 pts", foot: "vs prior 30d" },
            { label: "Click rate", value: `${clickRate}%`, delta: "+1.8 pts", foot: "vs prior 30d" },
            { label: "Conversions", value: String(totalConverted), delta: "+3", foot: "attributed signups" },
          ].map((k, i) => (
            <div
              key={k.label}
              style={{
                padding: "20px 22px",
                borderRight: i < 3 ? "1px solid var(--border)" : "none",
              }}
            >
              <div className="metric-label">{k.label}</div>
              <div className="big" style={{ fontSize: 36, marginBottom: 8 }}>
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div className="card">
          <SectionHead
            right={
              <Link
                href="/marketing/campaigns"
                className="btn btn-link hov"
                style={{ fontSize: 12 }}
              >
                All campaigns <Icon name="arrow-right" size={11} />
              </Link>
            }
          >
            Campaign performance
          </SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CAMPAIGNS.map((c) => {
              const open = c.sent ? Math.round((c.opened / c.sent) * 100) : 0;
              const click = c.sent ? Math.round((c.clicked / c.sent) * 100) : 0;
              return (
                <div
                  key={c.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    display: "grid",
                    gridTemplateColumns: "1.6fr 90px 90px 90px 1.4fr",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                      {c.name}
                    </div>
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      {c.status === "sent"
                        ? `Sent ${c.sentAt}`
                        : c.status === "scheduled"
                          ? `Scheduled ${c.scheduledFor}`
                          : c.status === "sending"
                            ? `Sending · ${c.sent}/${c.recipients}`
                            : c.status === "draft"
                              ? "Draft"
                              : c.status}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
                      {c.sent}
                    </div>
                    <div className="metric-label" style={{ marginBottom: 0 }}>
                      sent
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
                      {open}%
                    </div>
                    <div className="metric-label" style={{ marginBottom: 0 }}>
                      open
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
                      {click}%
                    </div>
                    <div className="metric-label" style={{ marginBottom: 0 }}>
                      click
                    </div>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "rgba(21,17,10,0.06)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${open}%`,
                        height: "100%",
                        background: "var(--accent)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <SectionHead>Lead funnel · 30d</SectionHead>
          <div className="row" style={{ gap: 24, alignItems: "flex-start" }}>
            <Donut
              value={Math.round(
                ((leadsByStatus.Converted ?? 0) / (LEADS.length || 1)) * 100,
              )}
              color="var(--teal)"
              size={120}
              label="Converted"
            />
            <div style={{ flex: 1 }}>
              {(["New", "Contacted", "Trial", "Converted", "Lost"] as const).map(
                (s) => (
                  <div
                    key={s}
                    className="row"
                    style={{
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px dashed var(--border)",
                      fontSize: 13,
                    }}
                  >
                    <span>{s}</span>
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {leadsByStatus[s] ?? 0}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
          <Link
            href="/marketing/leads"
            className="btn btn-ghost hov"
            style={{ marginTop: 16, width: "100%", justifyContent: "center" }}
          >
            Open leads pipeline <Icon name="arrow-right" size={11} />
          </Link>
        </div>
      </div>

      <div className="card">
        <SectionHead
          right={
            <Link
              href="/marketing/automations"
              className="btn btn-link hov"
              style={{ fontSize: 12 }}
            >
              All automations <Icon name="arrow-right" size={11} />
            </Link>
          }
        >
          Active automations
        </SectionHead>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          {AUTOMATIONS.slice(0, 6).map((a) => (
            <div
              key={a.id}
              style={{
                padding: 16,
                borderRadius: 12,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="row"
                style={{
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {a.name}
                </span>
                <span
                  className="badge"
                  style={{
                    background:
                      a.status === "active"
                        ? "var(--pos-soft)"
                        : "var(--surface-3)",
                    color:
                      a.status === "active"
                        ? "var(--pos)"
                        : "var(--text-2)",
                  }}
                >
                  {a.status}
                </span>
              </div>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>
                Trigger: {a.trigger} · {a.steps} steps
              </div>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span
                  className="mono"
                  style={{ fontSize: 18, fontWeight: 600 }}
                >
                  {a.active}
                </span>
                <span
                  className="mono text-3"
                  style={{ fontSize: 10.5, letterSpacing: "0.1em" }}
                >
                  active · {a.enrolled} ever
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
