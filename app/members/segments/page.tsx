/*
 * Members · Segments — 13 behavioral segments derived from real GloFox
 * data (members + leads + bookings + transactions). Definitions live in
 * supabase/migrations/0019 + 0020. UI metadata in lib/fixtures.SEGMENTS.
 *
 * Priority badges (P0/P1/P2) drive operator focus: P0 = call today,
 * P1 = email this week, P2 = batch nurture. Each card links to a
 * drill-down list at /members/segments/[id] and to a new-campaign
 * shortcut prefilled with the segment.
 */

export const dynamic = "force-dynamic";

import Link from "next/link";

import { Icon } from "@/components/icon";
import { PageHero, SectionHead } from "@/components/primitives";
import { loadSegmentMetrics } from "@/lib/data/segments";
import { SEGMENTS, type SegmentMeta } from "@/lib/fixtures";
import { formatCurrency } from "@/lib/utils";

const PRIORITY_TONE: Record<
  SegmentMeta["priority"],
  { fg: string; soft: string; label: string }
> = {
  P0: { fg: "var(--neg)", soft: "var(--neg-soft)", label: "P0 · Call today" },
  P1: {
    fg: "var(--warn)",
    soft: "var(--warn-soft)",
    label: "P1 · Email this week",
  },
  P2: {
    fg: "var(--text-2)",
    soft: "var(--surface-2)",
    label: "P2 · Batch nurture",
  },
};

export default async function MembersSegmentsPage() {
  const { counts, staleCreditLiabilityCents } = await loadSegmentMetrics();
  const ordered = [...SEGMENTS].sort((a, b) => {
    const pri = a.priority.localeCompare(b.priority);
    if (pri !== 0) return pri;
    return (counts[b.id] ?? 0) - (counts[a.id] ?? 0);
  });

  return (
    <>
      <PageHero
        meta="People · Members · Segments"
        title="Segments"
        subtitle={
          <>
            13 behavioral cohorts derived from your live Glofox data.
            <strong> P0</strong> means call today, <strong>P1</strong>{" "}
            email this week, <strong>P2</strong> nurture in batch. Stale
            credit liability:{" "}
            <strong>{formatCurrency(staleCreditLiabilityCents)}</strong>{" "}
            (will populate once Glofox /credits sync lands).
          </>
        }
        actions={
          <button type="button" className="btn btn-ghost hov">
            <Icon name="download" size={13} /> Export all
          </button>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 14,
        }}
      >
        {ordered.map((s) => {
          const tone = PRIORITY_TONE[s.priority];
          const count = counts[s.id] ?? 0;
          return (
            <div className="card" key={s.id} style={{ padding: 22 }}>
              <div
                className="row"
                style={{
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <span
                  className="badge"
                  style={{ background: tone.soft, color: tone.fg }}
                >
                  {tone.label}
                </span>
                <span
                  className="mono text-3"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Auto · live
                </span>
              </div>
              <div
                className="serif"
                style={{
                  fontSize: 26,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.05,
                  marginBottom: 6,
                }}
              >
                {s.name}
              </div>
              <div
                style={{
                  color: "var(--text-2)",
                  fontSize: 13,
                  lineHeight: 1.5,
                  marginBottom: 14,
                  minHeight: 60,
                }}
              >
                {s.description}
              </div>
              <div
                className="row"
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    className="serif"
                    style={{ fontSize: 28, letterSpacing: "-0.02em" }}
                  >
                    {count.toLocaleString()}
                  </div>
                  <div
                    className="mono text-3"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    people
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <Link
                    href={`/members/segments/${s.id}`}
                    className="btn btn-ghost hov"
                    style={{ fontSize: 12.5 }}
                  >
                    <Icon name="users" size={12} /> Drill down
                  </Link>
                  <Link
                    href={`/marketing/campaigns?segment=${s.id}`}
                    className="btn btn-primary hov"
                    style={{ fontSize: 12.5 }}
                  >
                    <Icon name="send" size={12} /> Campaign
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <SectionHead>How segments are computed</SectionHead>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          {[
            {
              title: "Active recurring vs Active by attendance",
              rules: [
                "Recurring = current paid Monthly / Annual / Unlimited tier",
                "By attendance = no recurring, but bought + 4+ visits in 60d",
                "Membership ≠ credits — credits don't qualify as active",
              ],
            },
            {
              title: "Hooked thresholds",
              rules: [
                "Urgent: 5+ visits in last 21 days, no recurring",
                "Candidate: 4+ visits in last 30 days, not urgent",
                "Cross threshold = recommend 10% off membership",
              ],
            },
            {
              title: "Trial flow",
              rules: [
                "In flight: trial tier + status active",
                "Graduated: trial + active recurring + 2+ purchases in 60d",
                "Lapsed: trial tier + status not active",
              ],
            },
            {
              title: "Cold lead",
              rules: [
                "Status = 'prospect', no booking, no purchase",
                "Includes the waiver-only signups + first-class-free no-shows",
                "Includes leads with no matching member record",
              ],
            },
          ].map((r) => (
            <div
              key={r.title}
              style={{
                padding: 16,
                borderRadius: 12,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}
              >
                {r.title}
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--text-2)",
                  lineHeight: 1.7,
                }}
              >
                {r.rules.map((rule) => (
                  <li key={rule}>{`• ${rule}`}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
