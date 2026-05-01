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
 * Live data via lib/data/command-center; falls back to fixtures when
 * the DB returns zero rows. Forced dynamic — Supabase reads on every
 * request mean Next.js cannot prerender this page at build time.
 */

export const dynamic = "force-dynamic";

import { AskMeridian } from "@/components/ask-meridian";
import { ActivityFeedCard } from "@/components/command-center/activity-feed";
import { FocusQueueCard } from "@/components/command-center/focus-queue";
import { TodayScheduleCard } from "@/components/command-center/today-schedule";
import { WeeklyReviewCard } from "@/components/command-center/weekly-review";
import { Icon } from "@/components/icon";
import {
  InsightCard,
  KpiStrip,
  PageHero,
  SectionHead,
  type Kpi,
} from "@/components/primitives";
import { requireProfile } from "@/lib/auth";
import {
  loadActivityFeed,
  loadFocusQueue,
  loadLatestBriefing,
  loadRevenueSnapshot,
  loadTodaySchedule,
  loadWeeklyReview,
} from "@/lib/data/command-center";
import {
  COMMAND_INSIGHTS,
  COMMAND_KPIS,
  FOCUS_QUEUE,
  TODAY_SCHEDULE,
} from "@/lib/fixtures";
import { formatCurrency } from "@/lib/utils";

function timeOfDayGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function CommandCenterPage() {
  const profile = await requireProfile();
  const firstName = profile.full_name?.trim().split(/\s+/)[0] || "there";
  const now = new Date();
  const greeting = `${timeOfDayGreeting(now.getHours())}, ${firstName}.`;
  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Real data — falls back gracefully when DB is empty.
  const [snapshot, today, focus, briefing, activity, weekly] = await Promise.all([
    loadRevenueSnapshot(),
    loadTodaySchedule(),
    loadFocusQueue(),
    loadLatestBriefing(),
    loadActivityFeed(),
    loadWeeklyReview(),
  ]);
  const liveInsights = briefing?.insights.length
    ? briefing.insights
    : COMMAND_INSIGHTS;
  const briefingTs = briefing
    ? briefing.generatedAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "6:04 AM";

  // Live KPI labels MUST match the fixture COMMAND_KPIS labels — that's
  // what the Command Center e2e suite asserts against, and the operator
  // shouldn't see different label sets between empty-DB and populated-DB
  // states (BUG-005). The values come from the live snapshot when we
  // have any data, otherwise the fixture cards provide a coherent demo.
  const liveKpis: Kpi[] =
    snapshot.todayCents || today.length
      ? [
          {
            label: "Revenue · today",
            value: formatCurrency(snapshot.todayCents),
            delta: "live",
            foot: "vs last Tue",
            dot: "var(--accent)",
            spark: COMMAND_KPIS[0].spark,
          },
          {
            label: "Bookings",
            value: String(snapshot.todayBookings),
            delta: "live",
            foot: `${today.length} classes`,
            dot: "var(--teal)",
            spark: COMMAND_KPIS[1].spark,
          },
          {
            label: "Walk-ins",
            value: String(snapshot.walkIns),
            delta: "live",
            foot: "today",
            dot: "var(--cobalt)",
            spark: COMMAND_KPIS[2].spark,
          },
          {
            label: "No-shows",
            value: String(snapshot.noShows),
            delta: "live",
            foot: "today",
            dot: "var(--moss)",
            spark: COMMAND_KPIS[3].spark,
          },
          {
            label: "Attendance rate",
            value: `${Math.round(snapshot.attendanceRate * 100)}%`,
            delta: "live",
            foot: "rolling 7d",
            dot: "var(--plum)",
            spark: COMMAND_KPIS[4].spark,
          },
        ]
      : COMMAND_KPIS;
  const liveFocus = focus.length ? focus : FOCUS_QUEUE;
  const liveToday = today.length ? today : TODAY_SCHEDULE;

  return (
    <>
      <PageHero
        meta={`${date} · Operational briefing`}
        title={greeting}
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
          <Icon name="sparkle" size={11} /> AI briefing · generated {briefingTs}
        </SectionHead>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          {liveInsights.map((i) => (
            <InsightCard key={i.kicker} insight={i} />
          ))}
        </div>
      </div>

      {/* KPI strip ---------------------------------------------------- */}
      <KpiStrip items={liveKpis} />

      {/* Focus Queue + Today ----------------------------------------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.3fr",
          gap: 16,
        }}
      >
        <FocusQueueCard items={liveFocus} totalLabelCount={FOCUS_QUEUE.length} />
        <TodayScheduleCard slots={liveToday} weekday={date.split(",")[0]} />
      </div>

      {/* Activity feed + Weekly review ------------------------------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.3fr",
          gap: 16,
        }}
      >
        <ActivityFeedCard entries={activity} />
        <WeeklyReviewCard rows={weekly} />
      </div>

      {/* Ask Meridian banner ------------------------------------------ */}
      <AskMeridian />
    </>
  );
}
