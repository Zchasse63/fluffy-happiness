/*
 * Employee Portal — clock in/out, personal schedule, pay stub view.
 *
 * Live for the logged-in profile: today's trainer schedule (when the
 * profile is linked to a trainer row) + recent activity authored by
 * this user. Pay stubs are still placeholder rows pending the payroll
 * period publication flow (operations/payroll already shows live).
 */

export const dynamic = "force-dynamic";

import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { PageHero, SectionHead } from "@/components/primitives";
import { requireProfile } from "@/lib/auth";
import { loadPortal } from "@/lib/data/portal";
import { formatCurrency } from "@/lib/utils";

export default async function PortalPage() {
  const profile = await requireProfile();
  const view = await loadPortal(profile);

  return (
    <>
      <PageHero
        meta="Employee portal · Tampa"
        title={`Hi, ${view.firstName}.`}
        subtitle={
          view.isTrainer ? (
            view.todayClasses.length ? (
              <>
                You&apos;re scheduled for{" "}
                <strong>
                  {view.todayClasses.length} class
                  {view.todayClasses.length === 1 ? "" : "es"} today
                </strong>
                . Clock in within 100m of the studio.
              </>
            ) : (
              <>No classes on the books for today.</>
            )
          ) : (
            <>
              Welcome back. Your role doesn&apos;t teach — clock in below if
              you&apos;re working the front desk.
            </>
          )
        }
        actions={
          // Clock-in is not wired to the trainer-presence backend yet —
          // disabled with a tooltip instead of letting the operator
          // think it worked. Tracked in DEFERRED.md (L-09).
          <button
            type="button"
            className="btn btn-primary hov"
            disabled
            title="Clock-in is pending integration with the trainer-presence backend."
            aria-label="Clock in (pending integration)"
            style={{ opacity: 0.55, cursor: "not-allowed" }}
          >
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
          {view.todayClasses.length === 0 ? (
            <div
              style={{
                padding: "12px 0",
                color: "var(--text-2)",
                fontSize: 12.5,
              }}
            >
              {view.isTrainer
                ? "No trainer assignments today."
                : "No classes — your role doesn't teach."}
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              {view.todayClasses.map((c) => (
                <div
                  key={c.id}
                  className="row"
                  style={{
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    className="mono"
                    style={{ width: 70, fontSize: 13, fontWeight: 600 }}
                  >
                    {c.time}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {c.title}
                    </div>
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      {c.bookedCount}/{c.capacity}
                      {c.belowThreshold && " · Below threshold"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost hov"
                    style={{ fontSize: 12 }}
                  >
                    Roster
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <SectionHead>Recent pay stubs</SectionHead>
          <div
            style={{
              padding: "12px 0",
              color: "var(--text-2)",
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            Pay stub publication is part of the payroll release flow —
            currently the period is computed live in{" "}
            <strong>Operations · Payroll</strong>; per-trainer slip
            persistence lands with the next iteration.
          </div>
          {/*
           * Static example rows kept for design parity. They will be
           * replaced by a per-trainer view of the published payroll
           * periods table once the publication flow is wired.
           */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { period: "Apr 14 → Apr 27", classes: 18, amount: 162500, status: "Pending approval" },
              { period: "Mar 31 → Apr 13", classes: 16, amount: 145800, status: "Paid Apr 14" },
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
                  opacity: 0.7,
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                    {s.period}
                  </div>
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    {s.classes} classes · {s.status}
                  </div>
                </div>
                <span
                  className="mono"
                  style={{ fontSize: 16, fontWeight: 600 }}
                >
                  {formatCurrency(s.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <SectionHead>Recent activity</SectionHead>
        {view.recentActivity.length === 0 ? (
          <div
            style={{
              padding: "10px 0",
              color: "var(--text-2)",
              fontSize: 12.5,
            }}
          >
            No recent activity.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {view.recentActivity.map((a, i, arr) => (
              <div
                key={i}
                style={{
                  padding: "10px 4px",
                  borderBottom:
                    i < arr.length - 1 ? "1px dashed var(--border)" : "none",
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
        )}
      </div>
    </>
  );
}
