"use client";

import { useEffect, useState } from "react";

const DAY_START = 5;
const DAY_END = 22;
const PX_PER_MIN = 1.05;
const TOTAL_HEIGHT = (DAY_END - DAY_START) * 60 * PX_PER_MIN;

function nowMinutesFromAnchor(): number {
  const d = new Date();
  return (d.getHours() - DAY_START) * 60 + d.getMinutes();
}

export function ScheduleNowLine() {
  // SSR-safe: render at midnight (off-screen) until hydration computes
  // the real time. After mount, update every 30 seconds.
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    setMinutes(nowMinutesFromAnchor());
    const id = setInterval(() => setMinutes(nowMinutesFromAnchor()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (minutes == null) return null;
  // Hide if outside the visible band (before 5am or after 10pm).
  if (minutes < 0 || minutes > (DAY_END - DAY_START) * 60) return null;

  const top = minutes * PX_PER_MIN;
  if (top > TOTAL_HEIGHT) return null;

  return (
    <>
      <div
        title={`Now ${new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}`}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top,
          height: 2,
          background: "var(--accent)",
          zIndex: 3,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -4,
          top: top - 4,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "var(--accent)",
          zIndex: 3,
        }}
      />
    </>
  );
}
