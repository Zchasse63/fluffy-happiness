/*
 * Members · Segments · Drill-down — list every person in a given
 * segment, ordered by spend + recent visits. Fed by segment_people()
 * RPC (migration 0019). The "Suggest outreach" button calls the
 * /api/ai/segment/[id]/recommend route to surface an AI-shaped
 * outreach suggestion for the segment.
 */

export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { PageHero, TableHead } from "@/components/primitives";
import { SegmentRecommendation } from "@/components/segments/segment-recommendation";
import { loadSegmentPeople } from "@/lib/data/people";
import { SEGMENTS } from "@/lib/fixtures";
import { formatCurrency } from "@/lib/utils";

const COLUMNS = [
  { label: "Person" },
  { label: "Status" },
  { label: "Tier" },
  { label: "Visits · 30d", align: "right" as const },
  { label: "Last visit", align: "right" as const },
  { label: "LTV", align: "right" as const },
  { label: "" },
];

function relative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (d < 1) return "today";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export default async function SegmentDrillDownPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const segment = SEGMENTS.find((s) => s.id === id);
  if (!segment) notFound();

  const people = await loadSegmentPeople(id, 200);

  return (
    <>
      <PageHero
        meta={`Segments · ${segment.priority}`}
        title={segment.name}
        subtitle={segment.description}
        actions={
          <>
            <Link
              href={`/api/segments/${id}/export`}
              className="btn btn-ghost hov"
            >
              <Icon name="download" size={13} /> CSV (with phones)
            </Link>
            <Link
              href={`/marketing/campaigns?segment=${id}`}
              className="btn btn-primary hov"
            >
              <Icon name="send" size={13} /> Start campaign
            </Link>
          </>
        }
      />

      <SegmentRecommendation segmentId={id} segmentName={segment.name} />

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div className="serif" style={{ fontSize: 18 }}>
            {people.length.toLocaleString()}{" "}
            {people.length === 1 ? "person" : "people"}
          </div>
          <span
            className="mono text-3"
            style={{
              fontSize: 10.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Sorted by lifetime value · top 200
          </span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <TableHead columns={COLUMNS} />
          <tbody>
            {people.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} style={{ padding: 0 }}>
                  <div
                    style={{
                      padding: 32,
                      textAlign: "center",
                      color: "var(--text-2)",
                      fontSize: 13.5,
                    }}
                  >
                    No one in this segment right now. Predicate runs every
                    page load against live Glofox data.
                  </div>
                </td>
              </tr>
            )}
            {people.map((p, i) => (
              <tr
                key={`${p.email}-${i}`}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <td style={{ padding: "12px 14px" }}>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={p.fullName ?? "?"} seed={i + 1} size={28} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {p.fullName ?? "—"}
                      </div>
                      <div
                        className="muted"
                        style={{ fontSize: 11, marginTop: 1 }}
                      >
                        {p.email ?? "—"}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 14px", fontSize: 12.5 }}>
                  {p.membershipStatus ?? "—"}
                </td>
                <td style={{ padding: "12px 14px", fontSize: 12.5 }}>
                  {p.membershipTier ?? "—"}
                </td>
                <td
                  className="mono"
                  style={{
                    padding: "12px 14px",
                    textAlign: "right",
                    fontSize: 12.5,
                  }}
                >
                  {p.visits30d}
                </td>
                <td
                  className="mono text-3"
                  style={{
                    padding: "12px 14px",
                    textAlign: "right",
                    fontSize: 11.5,
                  }}
                >
                  {relative(p.lastVisitAt)}
                </td>
                <td
                  className="mono"
                  style={{
                    padding: "12px 14px",
                    textAlign: "right",
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  {formatCurrency(p.totalSpendCents)}
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right" }}>
                  {p.memberId && (
                    <Link
                      href={`/members/${p.memberId}`}
                      className="btn btn-ghost hov"
                      style={{ fontSize: 12 }}
                    >
                      Open
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
