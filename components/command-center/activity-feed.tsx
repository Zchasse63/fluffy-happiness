/*
 * Activity feed card — chronological list of recent events with a tone-
 * coded tag. Pure presentation; data comes from `lib/fixtures`.
 */

import { SectionHead } from "@/components/primitives";
import { ACTIVITY_TONE_TO_COLOR, type ActivityEntry } from "@/lib/fixtures";

export function ActivityFeedCard({ entries }: { entries: ActivityEntry[] }) {
  return (
    <div className="card">
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
            Last 24h
          </span>
        }
      >
        Activity
      </SectionHead>
      <div className="timeline">
        {entries.map((e) => (
          <div
            key={`${e.t}-${e.who}`}
            className={`timeline-item ${e.tone === "muted" ? "muted" : ""}`}
          >
            <div
              className="mono text-3"
              style={{
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {e.t}
            </div>
            <div
              className="row"
              style={{
                justifyContent: "space-between",
                marginTop: 2,
                gap: 10,
              }}
            >
              <span style={{ fontSize: 12.5, minWidth: 0 }}>
                <strong>{e.who}</strong> ·{" "}
                <span className="muted">{e.what}</span>
              </span>
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  color: ACTIVITY_TONE_TO_COLOR[e.tone],
                  fontWeight: 600,
                  flex: "none",
                }}
              >
                {e.tag}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
