/*
 * Schedule · Calendar — week grid with absolute-positioned class blocks,
 * "now" line on today, and a class-detail panel with roster + waitlist.
 *
 * Layout follows the prototype's WeekGrid: 54px hour gutter + 7 day columns,
 * 5 AM → 10 PM, 1.05 px/min vertical scale, color-coded by program kind.
 *
 * Live grid via `loadWeekGrid`; the roster + waitlist panels remain
 * fixture-driven until per-booking detail loads are wired (the
 * `bookings` table has the data; surface area for the next pass).
 */

export const dynamic = "force-dynamic";

import { Icon } from "@/components/icon";
import {
  KpiCardStrip,
  PageHero,
  type KpiCardItem,
} from "@/components/primitives";
import { ClassBlock } from "@/components/schedule/class-block";
import { ClassDetailPanel } from "@/components/schedule/class-detail-panel";
import { WeekHeader } from "@/components/schedule/week-header";
import { ScheduleNowLine } from "@/components/schedule-now-line";
import {
  loadClassRoster,
  loadClassWaitlist,
  loadWeekGrid,
} from "@/lib/data/schedule";
import { KIND_META, type ClassSlot } from "@/lib/fixtures";

const DAY_START = 5;
const DAY_END = 22;
const PX_PER_MIN = 1.05;
const HOUR_HEIGHT = 60 * PX_PER_MIN;
const TOTAL_HEIGHT = (DAY_END - DAY_START) * HOUR_HEIGHT;

const FALLBACK_SELECTED: ClassSlot = {
  time: "12:00",
  kind: "Open Sauna",
  trainerId: null,
  booked: 0,
  note: null,
};

export default async function ScheduleCalendarPage() {
  const grid = await loadWeekGrid();
  const { week: WEEK, dates: SCHED_DATES, days: SCHED_DAYS, todayIdx: TODAY_IDX } = grid;

  const hours: number[] = [];
  for (let h = DAY_START; h <= DAY_END; h++) hours.push(h);

  // Pick a "selected" class — first class on today, or first non-empty
  // day, or fall back to a synthetic default.
  const selected: ClassSlot =
    WEEK[TODAY_IDX]?.[0] ??
    WEEK.find((d) => d.length > 0)?.[0] ??
    FALLBACK_SELECTED;

  // Roster + waitlist for the selected class — only if it has a DB id
  // (live classes do, fallback fixtures don't).
  const [roster, waitlist] = selected.id
    ? await Promise.all([
        loadClassRoster(selected.id),
        loadClassWaitlist(selected.id),
      ])
    : [undefined, undefined];

  const totalClasses = WEEK.reduce((s, d) => s + d.length, 0);
  const totalBookings = WEEK.reduce(
    (s, d) => s + d.reduce((a, c) => a + c.booked, 0),
    0,
  );
  const totalCap = WEEK.reduce(
    (s, d) =>
      s + d.reduce((a, c) => a + KIND_META[c.kind].cap, 0),
    0,
  );
  const avgFillPct = totalCap
    ? Math.round((totalBookings / totalCap) * 100)
    : 0;
  const fullCount = WEEK.reduce(
    (s, d) => s + d.filter((c) => c.note === "Full").length,
    0,
  );

  const kpiItems: KpiCardItem[] = [
    {
      label: "Classes this week",
      value: totalClasses.toLocaleString(),
      delta: "+0",
      foot: "live",
    },
    {
      label: "Bookings",
      value: totalBookings.toLocaleString(),
      delta: "+0",
      foot: "this week",
    },
    {
      label: "Avg fill",
      value: `${avgFillPct}%`,
      delta: "+0 pts",
      foot: "this week",
    },
    {
      label: "Full classes",
      value: fullCount.toLocaleString(),
      delta: "+0",
      foot: "≥ capacity",
    },
  ];

  return (
    <>
      <PageHero
        meta={`Week of ${SCHED_DATES[0]} · Tampa`}
        title="Schedule"
        subtitle={
          <>
            {totalClasses} classes this week, {totalBookings} bookings, avg
            fill <strong>{avgFillPct}%</strong>.
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

      <KpiCardStrip items={kpiItems} />

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
          <WeekHeader
            days={SCHED_DAYS}
            dates={SCHED_DATES}
            todayIdx={TODAY_IDX}
          />

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
              {di === TODAY_IDX && <ScheduleNowLine />}
              {day.map((c, ci) => (
                <ClassBlock key={ci} cls={c} />
              ))}
            </div>
          ))}
        </div>

        <ClassDetailPanel
          selected={selected}
          roster={roster}
          waitlist={waitlist}
        />
      </div>
    </>
  );
}
