/*
 * Schedule · Calendar — week grid with absolute-positioned class blocks,
 * "now" line on today, and a class-detail panel with roster + waitlist.
 *
 * Layout follows the prototype's WeekGrid: 54px hour gutter + 7 day columns,
 * 5 AM → 10 PM, 1.05 px/min vertical scale, color-coded by program kind.
 */

import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { ChangeBadge, PageHero, SectionHead } from "@/components/primitives";
import {
  DEFAULT_ROSTER,
  DEFAULT_WAITLIST,
  KIND_META,
  SCHED_DATES,
  SCHED_DAYS,
  TODAY_IDX,
  TRAINERS,
  WEEK,
  type ClassSlot,
} from "@/lib/fixtures";

const DAY_START = 5;
const DAY_END = 22;
const PX_PER_MIN = 1.05;
const HOUR_HEIGHT = 60 * PX_PER_MIN;
const TOTAL_HEIGHT = (DAY_END - DAY_START) * HOUR_HEIGHT;
const NOW_MINUTES = (10 - DAY_START) * 60 + 42;

function fmt12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function minutesFromAnchor(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h - DAY_START) * 60 + m;
}

function trainerById(id: string | null | undefined) {
  return id ? TRAINERS.find((t) => t.id === id) : undefined;
}

function fillTone(booked: number, cap: number): "ok" | "mid" | "low" {
  const p = booked / cap;
  if (p >= 0.8) return "ok";
  if (p >= 0.5) return "mid";
  return "low";
}

function toneVars(tone: "ok" | "mid" | "low") {
  if (tone === "ok") return { color: "var(--moss)", soft: "var(--moss-soft)" };
  if (tone === "mid")
    return { color: "var(--warn)", soft: "var(--warn-soft)" };
  return { color: "var(--neg)", soft: "var(--neg-soft)" };
}

function ClassBlock({ cls }: { cls: ClassSlot }) {
  const meta = KIND_META[cls.kind];
  const top = minutesFromAnchor(cls.time) * PX_PER_MIN;
  const height = meta.dur * PX_PER_MIN;
  const fill = cls.booked / meta.cap;
  const tone = fillTone(cls.booked, meta.cap);
  const tv = toneVars(tone);
  const trainer = trainerById(cls.trainerId);

  return (
    <div
      style={{
        position: "absolute",
        left: 4,
        right: 4,
        top,
        height,
        background: meta.soft,
        border: `1px solid ${meta.color}`,
        borderLeft: `3px solid ${meta.color}`,
        borderRadius: 8,
        padding: "4px 6px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", gap: 4 }}>
        <span
          className="mono"
          style={{ fontSize: 10, fontWeight: 600, color: "var(--text)" }}
        >
          {fmt12(cls.time).replace(" ", "")}
        </span>
        <span
          className="mono"
          style={{ fontSize: 10, fontWeight: 600, color: tv.color }}
        >
          {cls.booked}/{meta.cap}
        </span>
      </div>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: "var(--text)",
          lineHeight: 1.2,
        }}
      >
        {cls.kind}
      </div>
      {trainer && (
        <div className="muted" style={{ fontSize: 10.5, lineHeight: 1.2 }}>
          {trainer.name.split(" ")[0]}
        </div>
      )}
      <div
        style={{
          marginTop: "auto",
          height: 3,
          background: "rgba(21,17,10,0.08)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.round(fill * 100))}%`,
            height: "100%",
            background: tv.color,
          }}
        />
      </div>
    </div>
  );
}

export default function ScheduleCalendarPage() {
  const hours: number[] = [];
  for (let h = DAY_START; h <= DAY_END; h++) hours.push(h);

  const selectedDay = 1;
  const selected = WEEK[selectedDay].find(
    (c) => c.time === "19:00" && c.kind === "Guided Sauna",
  )!;
  const meta = KIND_META[selected.kind];
  const trainer = trainerById(selected.trainerId);

  return (
    <>
      <PageHero
        meta="Week of Apr 20 · Tampa"
        title="Schedule"
        subtitle={
          <>
            44 classes this week. <strong>Thursday is full</strong> across the
            board, and Whitney&apos;s 7 PM Guided is the only slot below 50%.
          </>
        }
        actions={
          <>
            <span className="tabs">
              <span className="tab">Day</span>
              <span className="tab active">Week</span>
              <span className="tab">Month</span>
            </span>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="filter" size={13} /> Filters
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="plus" size={13} /> New class
            </button>
          </>
        }
      />

      <div className="card card-tight" style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            alignItems: "stretch",
          }}
        >
          {[
            { label: "Classes this week", value: "44", delta: "+3", foot: "vs last week" },
            { label: "Bookings", value: "318", delta: "+7.3%", foot: "vs last week" },
            { label: "Avg fill", value: "71%", delta: "+3.0 pts", foot: "vs last week" },
            { label: "Waitlist", value: "12", delta: "-2", foot: "across 4 classes" },
            { label: "Walk-ins", value: "9", delta: "+1", foot: "rolling 7d" },
          ].map((k, i) => (
            <div
              key={k.label}
              style={{
                padding: "20px 22px",
                borderRight: i < 4 ? "1px solid var(--border)" : "none",
              }}
            >
              <div className="metric-label">{k.label}</div>
              <div className="big" style={{ fontSize: 36, marginBottom: 8 }}>
                {k.value}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <ChangeBadge value={k.delta} />
                <span className="muted" style={{ fontSize: 11 }}>{k.foot}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "54px repeat(7, 1fr)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            overflow: "hidden",
            background: "var(--surface)",
          }}
        >
          <div
            style={{
              background: "var(--surface-2)",
              borderBottom: "1px solid var(--border)",
            }}
          />
          {SCHED_DAYS.map((d, i) => {
            const isToday = i === TODAY_IDX;
            return (
              <div
                key={d}
                style={{
                  padding: "10px 12px",
                  background: "var(--surface-2)",
                  borderBottom: "1px solid var(--border)",
                  borderLeft: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: isToday ? "var(--accent)" : "var(--text-3)",
                  }}
                >
                  {d}
                </span>
                <span
                  className="serif"
                  style={{
                    fontSize: 20,
                    letterSpacing: "-0.02em",
                    color: isToday ? "var(--accent-deep)" : "var(--text)",
                  }}
                >
                  {SCHED_DATES[i].split(" ")[1]}
                </span>
                {isToday && (
                  <span
                    className="badge"
                    style={{
                      background: "var(--accent)",
                      color: "#FBF0E3",
                      fontSize: 9.5,
                    }}
                  >
                    Today
                  </span>
                )}
              </div>
            );
          })}

          <div
            style={{
              position: "relative",
              height: TOTAL_HEIGHT,
              background: "var(--surface-2)",
            }}
          >
            {hours.map((h) => (
              <div
                key={h}
                style={{
                  position: "absolute",
                  top: (h - DAY_START) * HOUR_HEIGHT,
                  right: 6,
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  color: "var(--text-3)",
                  letterSpacing: "0.06em",
                }}
              >
                {h === 12 ? "12P" : h < 12 ? `${h}A` : `${h - 12}P`}
              </div>
            ))}
          </div>
          {WEEK.map((day, di) => (
            <div
              key={di}
              style={{
                position: "relative",
                height: TOTAL_HEIGHT,
                borderLeft: "1px solid var(--border)",
                background:
                  di === TODAY_IDX ? "rgba(194,65,12,0.025)" : "transparent",
              }}
            >
              {hours.map((h) => (
                <div
                  key={h}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: (h - DAY_START) * HOUR_HEIGHT,
                    borderTop: "1px dashed var(--border)",
                    opacity: h === DAY_START ? 0 : 0.55,
                  }}
                />
              ))}
              {di === TODAY_IDX && (
                <>
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: NOW_MINUTES * PX_PER_MIN,
                      height: 2,
                      background: "var(--accent)",
                      zIndex: 3,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: -4,
                      top: NOW_MINUTES * PX_PER_MIN - 4,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      zIndex: 3,
                    }}
                  />
                </>
              )}
              {day.map((c, ci) => (
                <ClassBlock key={ci} cls={c} />
              ))}
            </div>
          ))}
        </div>

        <div
          className="card"
          style={{
            position: "sticky",
            top: 96,
            padding: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 18,
              borderBottom: "1px solid var(--border)",
              background: meta.soft,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: meta.color,
                marginBottom: 6,
              }}
            >
              Tuesday · {fmt12(selected.time)} · {meta.dur} min
            </div>
            <div
              className="serif"
              style={{
                fontSize: 24,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              {selected.kind}
            </div>
            {trainer && (
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <Avatar name={trainer.name} seed={trainer.seed} size={28} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {trainer.name}
                </span>
              </div>
            )}
            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              <button
                type="button"
                className="btn btn-primary hov"
                style={{ height: 30, fontSize: 12.5 }}
              >
                <Icon name="promote" size={12} /> Promote class
              </button>
              <button
                type="button"
                className="btn btn-ghost hov"
                style={{ height: 30, fontSize: 12.5 }}
              >
                <Icon name="edit" size={12} /> Edit
              </button>
            </div>
          </div>

          <div style={{ padding: 18 }}>
            <SectionHead
              right={
                <span
                  className="mono text-3"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  {selected.booked}/{meta.cap}
                </span>
              }
            >
              Roster
            </SectionHead>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DEFAULT_ROSTER.slice(0, selected.booked).map((m) => (
                <div
                  key={m.name}
                  className="row"
                  style={{ gap: 10, justifyContent: "space-between" }}
                >
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={m.name} seed={m.seed ?? 0} size={26} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {m.name}
                      </div>
                      <div className="muted" style={{ fontSize: 11 }}>
                        {m.credits}
                      </div>
                    </div>
                  </div>
                  <span
                    className="badge"
                    style={{
                      background:
                        m.status === "checked-in"
                          ? "var(--pos-soft)"
                          : "var(--surface-2)",
                      color:
                        m.status === "checked-in"
                          ? "var(--pos)"
                          : "var(--text-2)",
                    }}
                  >
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: 18, borderTop: "1px solid var(--border)" }}>
            <SectionHead
              right={
                <button
                  type="button"
                  className="btn btn-link hov"
                  style={{ fontSize: 12 }}
                >
                  Auto-promote <Icon name="arrow-right" size={11} />
                </button>
              }
            >
              Waitlist
            </SectionHead>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {DEFAULT_WAITLIST.map((w) => (
                <div
                  key={w.name}
                  className="row"
                  style={{ gap: 10, justifyContent: "space-between" }}
                >
                  <div className="row" style={{ gap: 10 }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: 11,
                        color: "var(--text-3)",
                        width: 16,
                        textAlign: "right",
                      }}
                    >
                      {w.position}
                    </span>
                    <Avatar name={w.name} seed={w.seed ?? 0} size={22} />
                    <span style={{ fontSize: 12.5 }}>{w.name}</span>
                  </div>
                  <span className="mono text-3" style={{ fontSize: 10.5 }}>
                    {w.joined}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
