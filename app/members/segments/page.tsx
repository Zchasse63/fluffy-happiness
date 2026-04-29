/*
 * Members · Segments — saved segments with member counts, computation
 * type (auto vs manual), and a sample preview. Clicking a segment
 * filters the directory.
 *
 * Counts come from `loadSegmentCounts`; falls back to fixtures.
 */

export const dynamic = "force-dynamic";

import Link from "next/link";

import { Icon } from "@/components/icon";
import { PageHero, SectionHead } from "@/components/primitives";
import { loadSegmentCounts } from "@/lib/data/segments";
import { SEGMENTS } from "@/lib/fixtures";

export default async function MembersSegmentsPage() {
  const counts = await loadSegmentCounts();

  return (
    <>
      <PageHero
        meta="People · Members · Segments"
        title="Segments"
        subtitle={
          <>
            Saved cohorts you can target with campaigns or send to the
            directory. <strong>Auto</strong> segments recompute hourly;
            <strong> manual</strong> ones are pinned snapshots.
          </>
        }
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Export
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="plus" size={13} /> New segment
            </button>
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 14,
        }}
      >
        {SEGMENTS.map((s) => (
          <div className="card" key={s.id} style={{ padding: 22 }}>
            <div
              className="row"
              style={{ justifyContent: "space-between", marginBottom: 12 }}
            >
              <span
                className="badge"
                style={{
                  background: s.auto
                    ? "var(--accent-soft)"
                    : "var(--surface-2)",
                  color: s.auto ? "var(--accent-deep)" : "var(--text-2)",
                }}
              >
                {s.auto ? "Auto" : "Manual"}
              </span>
              <span
                className="mono text-3"
                style={{
                  fontSize: 10.5,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Updated 12 min ago
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
              }}
            >
              {s.description}
            </div>
            <div
              className="row"
              style={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <div>
                <div
                  className="serif"
                  style={{ fontSize: 28, letterSpacing: "-0.02em" }}
                >
                  {(counts[s.id] ?? s.count).toLocaleString()}
                </div>
                <div
                  className="mono text-3"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  members
                </div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <Link
                  href={`/members/directory?segment=${s.id}`}
                  className="btn btn-ghost hov"
                  style={{ fontSize: 12.5 }}
                >
                  <Icon name="users" size={12} /> View
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
        ))}
      </div>

      <div className="card">
        <SectionHead
          right={
            <button type="button" className="btn btn-link hov" style={{ fontSize: 12 }}>
              Open editor <Icon name="arrow-right" size={11} />
            </button>
          }
        >
          Segment composition rules
        </SectionHead>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          {[
            {
              title: "Power users",
              rules: [
                "≥4 bookings in last 14 days",
                "Membership status = active",
                "No strikes in last 30 days",
              ],
            },
            {
              title: "Churn risk",
              rules: [
                "No booking in last 21 days",
                "Was weekly (≥3 bookings) in prior 30 days",
                "Membership status = active",
              ],
            },
            {
              title: "Credits expiring 7d",
              rules: [
                "Has unused credits in pack",
                "Pack expires within 7 days",
                "Membership status = active",
              ],
            },
            {
              title: "Weekend warriors",
              rules: [
                "≥80% of bookings on Sat or Sun",
                "≥4 bookings in last 30 days",
                "Membership status = active",
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
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
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
