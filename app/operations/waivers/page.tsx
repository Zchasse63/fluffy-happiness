/*
 * Operations · Waivers — signed and expiring waivers per member. Live
 * via `loadWaivers` (member_waivers JOIN waiver_templates), with the
 * status computed client-side from `expires_at` (active / expiring /
 * expired). Falls back to fixture set when empty.
 */

export const dynamic = "force-dynamic";

import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/primitives";
import { loadWaivers } from "@/lib/data/waivers";

export default async function WaiversPage() {
  const WAIVERS = await loadWaivers();
  const expired = WAIVERS.filter((w) => w.status === "expired");
  const expiring = WAIVERS.filter((w) => w.status === "expiring");
  return (
    <>
      <PageHero
        meta={`${WAIVERS.length} on file · ${expired.length} expired · ${expiring.length} expiring soon`}
        title="Waivers"
        subtitle="Signed waivers per member, with auto-reminders 14 days before expiry. Expired waivers must be re-signed before the next visit."
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Export
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="send" size={13} /> Send all reminders
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
                ["Member", "left"],
                ["Template", "left"],
                ["Signed", "left"],
                ["Expires", "left"],
                ["Status", "left"],
                ["", "right"],
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
            {WAIVERS.map((w) => (
              <tr key={w.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "14px 16px" }}>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={w.member} seed={w.seed} size={26} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{w.member}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13 }}>{w.template}</td>
                <td className="mono" style={{ padding: "14px 16px", fontSize: 12 }}>{w.signed}</td>
                <td className="mono" style={{ padding: "14px 16px", fontSize: 12 }}>{w.expires}</td>
                <td style={{ padding: "14px 16px" }}>
                  <span
                    className="badge"
                    style={{
                      background:
                        w.status === "active"
                          ? "var(--pos-soft)"
                          : w.status === "expiring"
                            ? "var(--warn-soft)"
                            : "var(--neg-soft)",
                      color:
                        w.status === "active"
                          ? "var(--pos)"
                          : w.status === "expiring"
                            ? "var(--warn)"
                            : "var(--neg)",
                    }}
                  >
                    {w.status}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", textAlign: "right" }}>
                  {w.status === "expired" ? (
                    <button type="button" className="btn btn-primary hov" style={{ height: 26, fontSize: 11.5 }}>
                      Re-send
                    </button>
                  ) : (
                    <button type="button" className="btn btn-ghost hov" style={{ height: 26, fontSize: 11.5 }}>
                      View
                    </button>
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
