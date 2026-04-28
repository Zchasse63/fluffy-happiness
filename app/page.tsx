/*
 * Command Center — operational briefing (HANDOFF.md §2 module 1).
 * Top to bottom:
 *   1. Page hero with greeting + primary actions
 *   2. AI Briefing trio (IDA cards, P1-P3)
 *   3. KPI strip — 5 hero metrics with sparklines
 *   4. Focus Queue + Today's Schedule (two-column)
 *   5. Activity feed + Weekly Review (two-column)
 *   6. Ask Meridian banner
 *
 * All data is currently fixture seeded — wire to /api/command-center
 * once Supabase tables are populated.
 */

import { Icon } from "@/components/icon";
import {
  ChangeBadge,
  InsightCard,
  KpiStrip,
  PageHero,
  SectionHead,
  type Insight,
  type Kpi,
} from "@/components/primitives";

const INSIGHTS: Insight[] = [
  {
    rank: "P1",
    tone: "neg",
    kicker: "Class below threshold",
    headline: "Whitney's 7 PM Guided is at 2/10.",
    data: [
      ["Booked", "2"],
      ["Waitlist", "0"],
      ["Last week", "9/10"],
    ],
    body:
      "Evening Guided usually fills by Monday. Two canceled on Sunday without rebooking — likely the weather flip.",
    action: "Promote on Instagram",
    altAction: "Notify Wed regulars",
    href: "/schedule/calendar",
  },
  {
    rank: "P2",
    tone: "warn",
    kicker: "Credits expiring",
    headline: "4 members have credit packs expiring this week.",
    data: [
      ["Unused credits", "11"],
      ["At-risk MRR", "$560"],
      ["Conversion when reminded", "58%"],
    ],
    body:
      "Alex Park (4), Sim Harmon (3), Ben Kniesly (2), Whitney regulars (2) — all expire by Sunday.",
    action: "Send expiry campaign",
    altAction: "Offer 2-wk extension",
    href: "/marketing/campaigns",
  },
  {
    rank: "P3",
    tone: "info",
    kicker: "Revenue anomaly",
    headline: "Monday revenue was $178 — down 34% vs last Monday.",
    data: [
      ["Yesterday", "$178"],
      ["Prior Mon", "$269"],
      ["Trend", "↓ 3rd dip"],
    ],
    body:
      "Driven by one canceled corporate booking (Cigar City). Not a pattern yet, but the 3rd Monday dip in a row.",
    action: "Open analytics",
    altAction: "Dismiss",
    href: "/analytics",
  },
];

const KPIS: Kpi[] = [
  {
    label: "Revenue · today",
    value: "$234",
    delta: "+12.0%",
    foot: "vs last Tue",
    dot: "var(--accent)",
    spark: [120, 180, 95, 220, 140, 260, 234],
  },
  {
    label: "Bookings",
    value: "27",
    delta: "+4",
    foot: "6 still open",
    dot: "var(--teal)",
    spark: [18, 22, 19, 24, 21, 26, 27],
  },
  {
    label: "Walk-ins",
    value: "2",
    delta: "±0",
    foot: "rolling 7d",
    dot: "var(--cobalt)",
    spark: [1, 3, 2, 2, 4, 2, 2],
  },
  {
    label: "No-shows",
    value: "1",
    delta: "-2",
    foot: "Sim Harmon 5p",
    dot: "var(--plum)",
    spark: [2, 3, 1, 2, 3, 1, 1],
  },
  {
    label: "Attendance rate",
    value: "94%",
    delta: "+3.1%",
    foot: "last 30 days",
    dot: "var(--moss)",
    spark: [88, 90, 89, 92, 91, 93, 94],
  },
];

type FocusItem = {
  p: "P1" | "P2" | "P3";
  pc: "neg" | "warn" | "info";
  icon:
    | "income"
    | "box"
    | "users"
    | "promote"
    | "user";
  title: string;
  meta: string;
  cta: string;
  href: string;
};

const FOCUS_QUEUE: FocusItem[] = [
  {
    p: "P1",
    pc: "neg",
    icon: "income",
    title: "Failed payment · Ben Kniesly",
    meta: "Card expired 04/2026 · $85 / Monthly Unlimited",
    cta: "Retry",
    href: "/revenue/dunning",
  },
  {
    p: "P1",
    pc: "neg",
    icon: "income",
    title: "Failed payment · Trent Lott",
    meta: "Insufficient funds · $165 / 10-pack",
    cta: "Retry",
    href: "/revenue/dunning",
  },
  {
    p: "P1",
    pc: "neg",
    icon: "income",
    title: "Chargeback filed · Dana Ortiz",
    meta: "Respond by Apr 24 · Stripe dispute #d_1a2",
    cta: "Respond",
    href: "/revenue/transactions",
  },
  {
    p: "P2",
    pc: "warn",
    icon: "box",
    title: "Whitney's 7 PM Guided — 2/10",
    meta: "Cancel, promote, or swap trainer",
    cta: "Promote",
    href: "/schedule/calendar",
  },
  {
    p: "P2",
    pc: "warn",
    icon: "users",
    title: "Credits expiring · 4 members",
    meta: "11 credits · $560 at-risk MRR",
    cta: "Remind",
    href: "/marketing/campaigns",
  },
  {
    p: "P3",
    pc: "info",
    icon: "promote",
    title: "Lead follow-ups · 3 stale",
    meta: "No touch in 5+ days · avg score 72",
    cta: "Review",
    href: "/marketing/leads",
  },
  {
    p: "P3",
    pc: "info",
    icon: "user",
    title: "Waiver expired · Maya Chen",
    meta: "Signed Apr 2025 · next class Fri",
    cta: "Re-send",
    href: "/operations/waivers",
  },
];

type Slot = {
  time: string;
  dur: string;
  kind: string;
  trainer: string;
  cap: string;
  fill: number;
  tone: "ok" | "mid" | "low";
  state: "live" | "next" | "" | "!";
};

const TODAY: Slot[] = [
  { time: "11:00 AM", dur: "50m", kind: "Open Sauna", trainer: "—", cap: "7/12", fill: 58, tone: "ok", state: "live" },
  { time: "1:00 PM", dur: "50m", kind: "Cold Plunge", trainer: "Ben Kniesly", cap: "4/6", fill: 67, tone: "ok", state: "next" },
  { time: "3:00 PM", dur: "50m", kind: "Open Sauna", trainer: "—", cap: "9/12", fill: 75, tone: "ok", state: "" },
  { time: "5:00 PM", dur: "50m", kind: "Open Sauna", trainer: "—", cap: "7/12", fill: 58, tone: "ok", state: "" },
  { time: "6:00 PM", dur: "50m", kind: "Guided Sauna", trainer: "Trent Lott", cap: "6/10", fill: 60, tone: "mid", state: "" },
  { time: "7:00 PM", dur: "60m", kind: "Guided Sauna", trainer: "Whitney Abrams", cap: "2/10", fill: 20, tone: "low", state: "!" },
  { time: "8:15 PM", dur: "45m", kind: "Cold Plunge", trainer: "Ben Kniesly", cap: "5/6", fill: 83, tone: "ok", state: "" },
];

type Activity = {
  t: string;
  who: string;
  what: string;
  tag: string;
  tone: "pos" | "neg" | "warn" | "info" | "muted";
};

const ACTIVITY: Activity[] = [
  { t: "10:38 AM", who: "Alex Park", what: "Booked 6 PM Guided Sauna", tag: "+1", tone: "pos" },
  { t: "10:12 AM", who: "Sim Harmon", what: "Checked in · 11 AM Open", tag: "In", tone: "pos" },
  { t: "09:47 AM", who: "Ben Kniesly", what: "Payment failed · Monthly Unlimited", tag: "−$85", tone: "neg" },
  { t: "09:30 AM", who: "Meridian", what: "Sent “Weekend Warriors” campaign", tag: "94%", tone: "info" },
  { t: "08:55 AM", who: "Maya Chen", what: "Purchased 10-pack credit", tag: "+$165", tone: "pos" },
  { t: "08:02 AM", who: "Whitney Abrams", what: "Clocked in", tag: "Staff", tone: "muted" },
  { t: "Yest 9 PM", who: "Dana Ortiz", what: "No-show · 8 PM Cold Plunge", tag: "Strike", tone: "warn" },
  { t: "Yest 7 PM", who: "Cigar City Co.", what: "Canceled corporate event (Apr 25)", tag: "−$480", tone: "neg" },
];

const TONE_TO_COLOR: Record<Activity["tone"], string> = {
  pos: "var(--pos)",
  neg: "var(--neg)",
  warn: "var(--warn)",
  info: "var(--cobalt)",
  muted: "var(--text-3)",
};

type WeekRow = {
  label: string;
  now: string;
  prior: string;
  delta: string;
  tone: "pos" | "neg";
};

const WEEK: WeekRow[] = [
  { label: "Revenue", now: "$412", prior: "$368", delta: "+12.0%", tone: "pos" },
  { label: "Classes booked", now: "44", prior: "41", delta: "+7.3%", tone: "pos" },
  { label: "New members", now: "3", prior: "5", delta: "-40.0%", tone: "neg" },
  { label: "Credits used", now: "38", prior: "34", delta: "+11.8%", tone: "pos" },
  { label: "Avg fill", now: "71%", prior: "68%", delta: "+3.0 pts", tone: "pos" },
  { label: "Trainer hours", now: "12.5", prior: "12.0", delta: "+4.2%", tone: "pos" },
];

export default function CommandCenterPage() {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <PageHero
        meta={`${date} · Operational briefing`}
        title="Good morning, Zach."
        subtitle={
          <>
            <strong>3 things</strong> need attention today. Revenue is pacing{" "}
            <strong>+12% vs last Tuesday</strong>, but{" "}
            <span className="serif" style={{ fontStyle: "italic" }}>
              Whitney&apos;s 7pm Guided
            </span>{" "}
            is at 2/10 — the only slot below threshold.
          </>
        }
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Daily brief
            </button>
            <a className="btn btn-primary hov" href="/schedule/calendar">
              <Icon name="plus" size={13} /> New class
            </a>
          </>
        }
      />

      {/* AI Briefing trio --------------------------------------------- */}
      <div>
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
              3 of 3 · next at 6 AM tomorrow
            </span>
          }
        >
          <Icon name="sparkle" size={11} /> AI briefing · generated 6:04 AM
        </SectionHead>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          {INSIGHTS.map((i) => (
            <InsightCard key={i.kicker} insight={i} />
          ))}
        </div>
      </div>

      {/* KPI strip ---------------------------------------------------- */}
      <KpiStrip items={KPIS} />

      {/* Focus Queue + Today ----------------------------------------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.3fr",
          gap: 16,
        }}
      >
        <div className="card">
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
                {FOCUS_QUEUE.length} items
              </span>
            }
          >
            Focus queue
          </SectionHead>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {FOCUS_QUEUE.map((r, i) => {
              const color =
                r.pc === "neg"
                  ? "var(--neg)"
                  : r.pc === "warn"
                    ? "var(--warn)"
                    : "var(--cobalt)";
              const soft =
                r.pc === "neg"
                  ? "var(--neg-soft)"
                  : r.pc === "warn"
                    ? "var(--warn-soft)"
                    : "var(--cobalt-soft)";
              return (
                <a
                  key={`${r.title}-${i}`}
                  href={r.href}
                  className="hov"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "42px 1fr auto",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 6px",
                    borderBottom:
                      i < FOCUS_QUEUE.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <span
                    className="badge"
                    style={{
                      background: soft,
                      color,
                      justifyContent: "center",
                    }}
                  >
                    {r.p}
                  </span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                      {r.title}
                    </div>
                    <div
                      className="muted"
                      style={{ fontSize: 11.5, marginTop: 2 }}
                    >
                      {r.meta}
                    </div>
                  </div>
                  <span
                    className="btn btn-ghost hov"
                    style={{ height: 28, fontSize: 12 }}
                  >
                    {r.cta} <Icon name="arrow-right" size={11} />
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        <div className="card">
          <SectionHead
            right={
              <a
                className="btn btn-link hov"
                href="/schedule/calendar"
                style={{ fontSize: 12 }}
              >
                Open schedule <Icon name="arrow-right" size={11} />
              </a>
            }
          >
            Today · {date.split(",")[0]}
          </SectionHead>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(10, 1fr)",
              fontFamily: "var(--mono)",
              fontSize: 9.5,
              color: "var(--text-3)",
              letterSpacing: "0.08em",
              marginBottom: 6,
            }}
          >
            {["8A", "10A", "12P", "2P", "3P", "4P", "5P", "6P", "7P", "8P"].map(
              (h) => (
                <span key={h}>{h}</span>
              ),
            )}
          </div>
          <div
            style={{
              position: "relative",
              height: 6,
              background: "var(--surface-2)",
              borderRadius: 3,
              marginBottom: 14,
            }}
          >
            <div
              title="Now 10:42 AM"
              style={{
                position: "absolute",
                left: "24%",
                top: -4,
                bottom: -4,
                width: 2,
                background: "var(--accent)",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TODAY.map((c) => {
              const barColor =
                c.tone === "low"
                  ? "var(--neg)"
                  : c.tone === "mid"
                    ? "var(--warn)"
                    : "var(--moss)";
              const barSoft =
                c.tone === "low"
                  ? "var(--neg-soft)"
                  : c.tone === "mid"
                    ? "var(--warn-soft)"
                    : "var(--moss-soft)";
              return (
                <a
                  key={c.time}
                  href="/schedule/calendar"
                  className="hov"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "72px 1fr 110px 60px",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 4px",
                    borderRadius: 8,
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <div>
                    <div className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
                      {c.time}
                    </div>
                    <div
                      className="mono text-3"
                      style={{ fontSize: 10, letterSpacing: "0.06em" }}
                    >
                      {c.dur}
                    </div>
                  </div>
                  <div>
                    <div className="row" style={{ gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                        {c.kind}
                      </span>
                      {c.state === "live" && (
                        <span
                          className="badge"
                          style={{
                            background: "var(--pos-soft)",
                            color: "var(--pos)",
                          }}
                        >
                          <span
                            className="dot-status dot-active"
                            style={{ width: 5, height: 5, boxShadow: "none" }}
                          />{" "}
                          Live
                        </span>
                      )}
                      {c.state === "next" && (
                        <span
                          className="badge"
                          style={{
                            background: "var(--surface-3)",
                            color: "var(--text-2)",
                          }}
                        >
                          Next up
                        </span>
                      )}
                      {c.state === "!" && (
                        <span className="badge badge-down">!</span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                      {c.trainer}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        height: 6,
                        background: barSoft,
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${c.fill}%`,
                          height: "100%",
                          background: barColor,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10.5,
                        color: "var(--text-3)",
                        letterSpacing: "0.06em",
                        marginTop: 4,
                      }}
                    >
                      {c.fill}% full
                    </div>
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}
                  >
                    {c.cap}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity feed + Weekly review ------------------------------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.3fr",
          gap: 16,
        }}
      >
        <div className="card">
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
                Last 24h
              </span>
            }
          >
            Activity
          </SectionHead>
          <div className="timeline">
            {ACTIVITY.map((e) => (
              <div
                key={`${e.t}-${e.who}`}
                className={`timeline-item ${e.tone === "muted" ? "muted" : ""}`}
              >
                <div
                  className="mono text-3"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {e.t}
                </div>
                <div
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    marginTop: 2,
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 12.5, minWidth: 0 }}>
                    <strong>{e.who}</strong> ·{" "}
                    <span className="muted">{e.what}</span>
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: TONE_TO_COLOR[e.tone],
                      fontWeight: 600,
                      flex: "none",
                    }}
                  >
                    {e.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <SectionHead
            right={
              <span className="pill-select">
                vs last week <Icon name="chev-down" size={11} />
              </span>
            }
          >
            Weekly review · Mon–Tue
          </SectionHead>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 0,
            }}
          >
            {WEEK.map((r, i) => (
              <div
                key={r.label}
                style={{
                  padding: "14px 16px",
                  borderRight:
                    i % 2 === 0 ? "1px solid var(--border)" : "none",
                  borderBottom:
                    i < WEEK.length - 2 ? "1px solid var(--border)" : "none",
                }}
              >
                <div className="metric-label" style={{ marginBottom: 6 }}>
                  {r.label}
                </div>
                <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
                  <div className="med" style={{ fontSize: 26 }}>
                    {r.now}
                  </div>
                  <span className="mono text-3" style={{ fontSize: 10.5 }}>
                    was {r.prior}
                  </span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <ChangeBadge value={r.delta} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ask Meridian banner ------------------------------------------ */}
      <div
        className="card"
        style={{
          background:
            "linear-gradient(135deg, #1B140A 0%, #2A1E10 55%, #3B2413 100%)",
          borderColor: "var(--accent-deep)",
          color: "#F4E6D0",
          padding: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -60,
            top: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
            opacity: 0.35,
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <div
            className="row"
            style={{
              gap: 8,
              marginBottom: 12,
              color: "#F4BA8A",
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            <Icon name="sparkle" size={13} /> Ask Meridian · beta
          </div>
          <div
            className="serif"
            style={{
              fontSize: 32,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              marginBottom: 18,
              color: "#FBF0E3",
              maxWidth: 760,
              textWrap: "pretty",
            }}
          >
            Ask a question about your studio. Meridian will read your data and
            answer in plain English.
          </div>
          <div
            className="row"
            style={{
              gap: 10,
              background: "rgba(251,240,227,0.08)",
              border: "1px solid rgba(251,240,227,0.18)",
              borderRadius: 14,
              padding: "10px 14px",
              marginBottom: 14,
            }}
          >
            <Icon name="search" size={16} />
            <input
              placeholder="How many members booked both last week and this week?"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#F4E6D0",
                fontSize: 14,
              }}
            />
            <button
              type="button"
              className="btn btn-primary hov"
              style={{ height: 30, fontSize: 12.5 }}
            >
              Ask <Icon name="arrow-right" size={11} />
            </button>
          </div>
          <div
            className="row"
            style={{
              gap: 8,
              flexWrap: "wrap",
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "#D6BFA0",
            }}
          >
            <span>Try:</span>
            <span style={{ opacity: 0.85 }}>
              “Who hasn&apos;t booked in 21 days?”
            </span>
            <span style={{ opacity: 0.85 }}>
              “Top 5 days by revenue this month”
            </span>
            <span style={{ opacity: 0.85 }}>
              “Average fill of Whitney&apos;s classes”
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
