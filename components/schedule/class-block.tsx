/*
 * Absolute-positioned class block for the week grid — colored by program
 * kind, height proportional to duration, fill bar reflects booked/cap.
 */

import { KIND_META, TRAINERS, type ClassSlot } from "@/lib/fixtures";

const DAY_START = 5;
const PX_PER_MIN = 1.05;

const FILL_TONE: Record<"ok" | "mid" | "low", { color: string; soft: string }> = {
  ok: { color: "var(--moss)", soft: "var(--moss-soft)" },
  mid: { color: "var(--warn)", soft: "var(--warn-soft)" },
  low: { color: "var(--neg)", soft: "var(--neg-soft)" },
};

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

function fillToneFor(booked: number, cap: number): "ok" | "mid" | "low" {
  const p = booked / cap;
  if (p >= 0.8) return "ok";
  if (p >= 0.5) return "mid";
  return "low";
}

export function ClassBlock({ cls }: { cls: ClassSlot }) {
  const meta = KIND_META[cls.kind];
  const top = minutesFromAnchor(cls.time) * PX_PER_MIN;
  const height = meta.dur * PX_PER_MIN;
  const fill = cls.booked / meta.cap;
  const tone = FILL_TONE[fillToneFor(cls.booked, meta.cap)];
  const trainer = cls.trainerId
    ? TRAINERS.find((t) => t.id === cls.trainerId)
    : undefined;

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
          style={{ fontSize: 10, fontWeight: 600, color: tone.color }}
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
            background: tone.color,
          }}
        />
      </div>
    </div>
  );
}
