/*
 * Operations · Staff — employee directory with role, status, and pay rate.
 */

import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/primitives";
import { TRAINERS } from "@/lib/fixtures";

const STAFF = [
  { ...TRAINERS[0], role: "Lead trainer", status: "active" as const, base: "$65/class", bonus: "10% over 80% fill", classes30: 18 },
  { ...TRAINERS[1], role: "Trainer", status: "active" as const, base: "$50/class", bonus: "10% over 80% fill", classes30: 16 },
  { ...TRAINERS[2], role: "Cold plunge specialist", status: "active" as const, base: "$45/class", bonus: "—", classes30: 12 },
  { ...TRAINERS[3], role: "Trainer · weekend", status: "active" as const, base: "$50/class", bonus: "10% over 80% fill", classes30: 8 },
  { id: "alex", name: "Alex Rivera", seed: 42, role: "Front desk", status: "active" as const, base: "$22/hr", bonus: "—", classes30: 0 },
  { id: "ren", name: "Ren Patel", seed: 17, role: "Front desk · weekends", status: "paused" as const, base: "$22/hr", bonus: "—", classes30: 0 },
];

export default function StaffPage() {
  return (
    <>
      <PageHero
        meta={`${STAFF.length} active · Tampa`}
        title="Staff"
        subtitle="Trainers, front desk, and contractors. Click a row to open their profile, schedule, and pay history."
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Export roster
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="plus" size={13} /> Add staff
            </button>
          </>
        }
      />

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                background: "var(--surface-2)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {[
                ["Name", "left"],
                ["Role", "left"],
                ["Status", "left"],
                ["Base rate", "right"],
                ["Bonus", "right"],
                ["Classes · 30d", "right"],
              ].map(([label, align], i) => (
                <th
                  key={i}
                  style={{
                    textAlign: align as "left" | "right",
                    padding: "12px 16px",
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--text-3)",
                    fontWeight: 600,
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAFF.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "14px 16px" }}>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={s.name} seed={s.seed} size={32} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13 }}>{s.role}</td>
                <td style={{ padding: "14px 16px" }}>
                  <span
                    className="badge"
                    style={{
                      background:
                        s.status === "active"
                          ? "var(--pos-soft)"
                          : "var(--surface-3)",
                      color:
                        s.status === "active"
                          ? "var(--pos)"
                          : "var(--text-2)",
                    }}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="mono" style={{ padding: "14px 16px", textAlign: "right", fontSize: 13 }}>
                  {s.base}
                </td>
                <td className="mono text-3" style={{ padding: "14px 16px", textAlign: "right", fontSize: 11.5 }}>
                  {s.bonus}
                </td>
                <td className="mono" style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, fontWeight: 600 }}>
                  {s.classes30}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
