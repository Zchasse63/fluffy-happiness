/*
 * Right-side detail panel for the schedule calendar — selected class
 * header, roster (with check-in pills), and waitlist (with positions).
 */

import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { SectionHead } from "@/components/primitives";
import type { RosterRow, WaitlistRow } from "@/lib/data/schedule";
import {
  DEFAULT_ROSTER,
  DEFAULT_WAITLIST,
  KIND_META,
  TRAINERS,
  type ClassSlot,
} from "@/lib/fixtures";

function fmt12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function ClassDetailPanel({
  selected,
  roster,
  waitlist,
}: {
  selected: ClassSlot;
  roster?: RosterRow[];
  waitlist?: WaitlistRow[];
}) {
  const meta = KIND_META[selected.kind];
  const trainer = selected.trainerId
    ? TRAINERS.find((t) => t.id === selected.trainerId)
    : undefined;
  // Roster falls back to fixture (sliced to booked count) when no live
  // class id is selected. Waitlist falls back to a fixed example list.
  const rosterRows: Array<{
    name: string;
    status: string;
    credits: string;
    seed: number;
  }> =
    roster?.length
      ? roster.map((r) => ({
          name: r.name,
          status: r.status,
          credits: r.credits,
          seed: r.seed,
        }))
      : DEFAULT_ROSTER.slice(0, selected.booked).map((m) => ({
          name: m.name,
          status: m.status,
          credits: m.credits,
          seed: m.seed ?? 0,
        }));
  const waitlistRows: Array<{
    name: string;
    joined: string;
    position: number;
    seed: number;
  }> =
    waitlist?.length
      ? waitlist
      : DEFAULT_WAITLIST.map((w) => ({
          name: w.name,
          joined: w.joined,
          position: w.position,
          seed: w.seed ?? 0,
        }));

  return (
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
          {rosterRows.map((m) => (
            <div
              key={m.name}
              className="row"
              style={{ gap: 10, justifyContent: "space-between" }}
            >
              <div className="row" style={{ gap: 10 }}>
                <Avatar name={m.name} seed={m.seed} size={26} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
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
                      : m.status === "no-show"
                        ? "var(--neg-soft)"
                        : "var(--surface-2)",
                  color:
                    m.status === "checked-in"
                      ? "var(--pos)"
                      : m.status === "no-show"
                        ? "var(--neg)"
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
          {waitlistRows.map((w) => (
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
                <Avatar name={w.name} seed={w.seed} size={22} />
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
  );
}
