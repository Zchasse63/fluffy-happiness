/*
 * Marketing · Leads — kanban board (New → Contacted → Trial → Converted →
 * Lost). Cards show source, score, last touch, and assignee. Drag-and-drop
 * is deferred to dnd-kit (see DEFERRED.md).
 */

import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/primitives";
import { LEADS, type LeadStatus } from "@/lib/fixtures";

const COLUMNS: Array<{
  status: LeadStatus;
  fg: string;
  soft: string;
  label: string;
}> = [
  { status: "New", fg: "var(--cobalt)", soft: "var(--cobalt-soft)", label: "New" },
  {
    status: "Contacted",
    fg: "var(--gold)",
    soft: "var(--gold-soft)",
    label: "Contacted",
  },
  { status: "Trial", fg: "var(--accent)", soft: "var(--accent-soft)", label: "Trial" },
  {
    status: "Converted",
    fg: "var(--pos)",
    soft: "var(--pos-soft)",
    label: "Converted",
  },
  { status: "Lost", fg: "var(--text-3)", soft: "var(--surface-3)", label: "Lost" },
];

function scoreTone(score: number) {
  if (score >= 80) return { fg: "var(--pos)", soft: "var(--pos-soft)" };
  if (score >= 60) return { fg: "var(--gold)", soft: "var(--gold-soft)" };
  if (score >= 40) return { fg: "var(--warn)", soft: "var(--warn-soft)" };
  return { fg: "var(--neg)", soft: "var(--neg-soft)" };
}

export default function LeadsPage() {
  return (
    <>
      <PageHero
        meta="Pipeline · Tampa"
        title="Lead pipeline"
        subtitle="Drag a card to move it (dnd-kit pending). Score is rules-based + AI signal."
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="filter" size={13} /> Filters
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="plus" size={13} /> Add lead
            </button>
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLUMNS.length}, 1fr)`,
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        {COLUMNS.map((col) => {
          const cards = LEADS.filter((l) => l.status === col.status);
          return (
            <div
              key={col.status}
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 12,
                minHeight: 360,
              }}
            >
              <div
                className="row"
                style={{
                  justifyContent: "space-between",
                  padding: "4px 4px 12px",
                }}
              >
                <span
                  className="badge"
                  style={{
                    background: col.soft,
                    color: col.fg,
                    fontSize: 10.5,
                  }}
                >
                  {col.label}
                </span>
                <span
                  className="mono text-3"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.06em",
                  }}
                >
                  {cards.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cards.map((l) => {
                  const tone = scoreTone(l.score);
                  return (
                    <div
                      key={l.id}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        padding: 12,
                        boxShadow: "var(--shadow-sm)",
                        cursor: "grab",
                      }}
                    >
                      <div
                        className="row"
                        style={{
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <div className="row" style={{ gap: 8 }}>
                          <Avatar name={l.name} seed={l.seed ?? 0} size={26} />
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                              {l.name}
                            </div>
                            <div className="muted" style={{ fontSize: 10.5 }}>
                              {l.source}
                            </div>
                          </div>
                        </div>
                        <span
                          className="badge"
                          style={{
                            background: tone.soft,
                            color: tone.fg,
                            fontSize: 10,
                          }}
                        >
                          {l.score}
                        </span>
                      </div>
                      <div
                        className="row"
                        style={{
                          justifyContent: "space-between",
                          fontSize: 11,
                          color: "var(--text-3)",
                        }}
                      >
                        <span className="mono">{l.lastTouch}</span>
                        {l.assignedTo && <span>· {l.assignedTo}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
