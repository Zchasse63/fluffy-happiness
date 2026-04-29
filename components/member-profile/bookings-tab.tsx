/*
 * Bookings tab on the member profile — shows the member's last 20
 * bookings (live from `bookings`, falls back to fixture).
 */

import { TableHead } from "@/components/primitives";
import { ToneBadge } from "@/components/status-pill";
import type { MemberProfileBookingRow } from "@/lib/fixtures";

const BOOKING_STATUS_TONE: Record<
  MemberProfileBookingRow["status"],
  { fg: string; soft: string }
> = {
  "checked-in": { fg: "var(--pos)", soft: "var(--pos-soft)" },
  "no-show": { fg: "var(--neg)", soft: "var(--neg-soft)" },
  booked: { fg: "var(--text-2)", soft: "var(--surface-2)" },
};

export function BookingsTab({ rows }: { rows: MemberProfileBookingRow[] }) {
  if (!rows.length) {
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
          No bookings yet for this member.
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <TableHead
          columns={[
            { label: "When" },
            { label: "Class" },
            { label: "Trainer" },
            { label: "Status" },
            { label: "" },
          ]}
        />
        <tbody>
          {rows.map((r, i) => {
            const tone = BOOKING_STATUS_TONE[r.status];
            return (
              <tr
                key={i}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <td
                  className="mono"
                  style={{ padding: "12px 14px", fontSize: 12.5 }}
                >
                  {r.time}
                </td>
                <td
                  style={{
                    padding: "12px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {r.kind}
                </td>
                <td
                  className="muted"
                  style={{ padding: "12px 14px", fontSize: 12.5 }}
                >
                  {r.trainer}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <ToneBadge tone={tone}>{r.status}</ToneBadge>
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right" }}>
                  {r.status === "booked" && (
                    <button
                      type="button"
                      className="btn btn-ghost hov"
                      style={{ height: 26, fontSize: 11.5 }}
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
