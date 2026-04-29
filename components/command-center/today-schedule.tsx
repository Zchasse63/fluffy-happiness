/*
 * Today's schedule card — hour ticker, "now" line, then a row per slot.
 * Accepts either the live `TodaySlot` from `lib/data/command-center` or
 * the matching fixture shape from `lib/fixtures` — both share the
 * visual fields below.
 */

import { Icon } from "@/components/icon";
import { SectionHead } from "@/components/primitives";

export type TodayScheduleSlot = {
  time: string;
  dur: string;
  kind: string;
  trainer: string;
  cap: string;
  fill: number;
  tone: "ok" | "mid" | "low";
  state: "live" | "next" | "" | "!";
};

const FILL_BAR_BY_TONE: Record<
  TodayScheduleSlot["tone"],
  { color: string; soft: string }
> = {
  ok: { color: "var(--moss)", soft: "var(--moss-soft)" },
  mid: { color: "var(--warn)", soft: "var(--warn-soft)" },
  low: { color: "var(--neg)", soft: "var(--neg-soft)" },
};

const HOUR_TICKS = ["8A", "10A", "12P", "2P", "3P", "4P", "5P", "6P", "7P", "8P"];

export function TodayScheduleCard({
  slots,
  weekday,
}: {
  slots: TodayScheduleSlot[];
  weekday: string;
}) {
  return (
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
        Today · {weekday}
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
        {HOUR_TICKS.map((h) => (
          <span key={h}>{h}</span>
        ))}
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
        {slots.map((c) => {
          const { color: barColor, soft: barSoft } = FILL_BAR_BY_TONE[c.tone];
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
  );
}
