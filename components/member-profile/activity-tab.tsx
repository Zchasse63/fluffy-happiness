/*
 * Activity tab on the member profile — chronological event stream
 * filtered to this member from activity_log.
 */

import { SectionHead } from "@/components/primitives";
import type { MemberActivityEntry } from "@/lib/data/members";

export function ActivityTab({ entries }: { entries: MemberActivityEntry[] }) {
  if (!entries.length) {
    return (
      <div
        className="card"
        style={{
          display: "grid",
          placeItems: "center",
          padding: 48,
          textAlign: "center",
        }}
      >
        <div className="muted" style={{ fontSize: 13 }}>
          No recorded activity for this member yet.
        </div>
      </div>
    );
  }

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
            {entries.length} events
          </span>
        }
      >
        Activity
      </SectionHead>
      <div className="timeline">
        {entries.map((e, i) => (
          <div key={i} className="timeline-item">
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
            <div style={{ marginTop: 2, fontSize: 12.5 }}>
              <strong>{e.type.replace(/_/g, " ")}</strong> ·{" "}
              <span className="muted">{e.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
