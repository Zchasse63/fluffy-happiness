/*
 * Employee Portal — clock in/out, personal schedule, pay stub view.
 * Role-gated: trainers and front-desk staff land here on login.
 */

import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { PageHero, SectionHead } from "@/components/primitives";
import { formatCurrency } from "@/lib/utils";

export default function PortalPage() {
  return (
    <>
      <PageHero
        meta="Employee portal · Tampa"
        title="Hi, Whitney."
        subtitle={
          <>
            You&apos;re scheduled for <strong>3 classes today</strong>:
            6 PM Open, 7 PM Guided, and 8:15 PM Cold Plunge. Geofence radius
            is 100m around the studio.
          </>
        }
        actions={
          <button type="button" className="btn btn-primary hov">
            <Icon name="check" size={13} /> Clock in
          </button>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
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
                Today
              </span>
            }
          >
            Your schedule
          </SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { time: "6:00 PM", title: "Open Sauna", state: "" },
              { time: "7:00 PM", title: "Guided Sauna", state: "Below threshold" },
              { time: "8:15 PM", title: "Cold Plunge", state: "" },
            ].map((c) => (
              <div
                key={c.time}
                className="row"
                style={{
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="mono" style={{ width: 70, fontSize: 13, fontWeight: 600 }}>
                  {c.time}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.title}</div>
                  {c.state && (
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      {c.state}
                    </div>
                  )}
                </div>
                <button type="button" className="btn btn-ghost hov" style={{ fontSize: 12 }}>
                  Roster
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <SectionHead>Recent pay stubs</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { period: "Apr 14 → Apr 27", classes: 18, amount: 162500, status: "Pending approval" },
              { period: "Mar 31 → Apr 13", classes: 16, amount: 145800, status: "Paid Apr 14" },
              { period: "Mar 17 → Mar 30", classes: 19, amount: 174200, status: "Paid Mar 31" },
            ].map((s, i) => (
              <div
                key={i}
                className="row"
                style={{
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.period}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    {s.classes} classes · {s.status}
                  </div>
                </div>
                <span className="mono" style={{ fontSize: 16, fontWeight: 600 }}>
                  {formatCurrency(s.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <SectionHead>Recent activity</SectionHead>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {[
            { t: "8:02 AM", what: "Clocked in · 6 AM Open", who: "You" },
            { t: "Yesterday", what: "Approved 7 PM Guided roster", who: "You" },
            { t: "Apr 19", what: "New waiver from Priya Shah", who: "Front desk" },
            { t: "Apr 18", what: "Bonus earned · 4 classes >80% fill", who: "Payroll" },
          ].map((a, i, arr) => (
            <div
              key={i}
              style={{
                padding: "10px 4px",
                borderBottom: i < arr.length - 1 ? "1px dashed var(--border)" : "none",
              }}
            >
              <div className="row" style={{ gap: 10 }}>
                <Avatar name={a.who} seed={i + 5} size={26} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{a.what}</div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {a.who} · {a.t}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
