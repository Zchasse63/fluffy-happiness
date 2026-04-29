/*
 * Operations · Staff — employee directory with role, status, and pay rate.
 *
 * Live data via `loadStaff`; falls back to fixtures when no profile rows
 * have staff/trainer/owner/manager roles.
 */

export const dynamic = "force-dynamic";

import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { PageHero, TableHead } from "@/components/primitives";
import { loadStaff } from "@/lib/data/staff";

const TABLE_COLUMNS = [
  { label: "Name" },
  { label: "Role" },
  { label: "Status" },
  { label: "Base rate", align: "right" as const },
  { label: "Bonus", align: "right" as const },
  { label: "Classes · 30d", align: "right" as const },
];

export default async function StaffPage() {
  const STAFF = await loadStaff();

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
          <TableHead columns={TABLE_COLUMNS} />
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
