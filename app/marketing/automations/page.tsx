/*
 * Marketing · Automations — flow cards with enrollment stats. Reads
 * live from `automation_flows` + counts from `automation_enrollments`,
 * falls back to fixtures when zero rows.
 *
 * Flow EXECUTION (events firing on triggers, step delivery) is the
 * next iteration — needs Inngest event listeners. The records this
 * page lets operators manage are durable, so when execution lands
 * no UI rework is needed.
 */

export const dynamic = "force-dynamic";

import {
  AutomationToggle,
  SeedAutomationsButton,
} from "@/components/automations/automation-actions";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/primitives";
import { loadAutomationFlows } from "@/lib/data/automations";
import { AUTOMATIONS } from "@/lib/fixtures";

const TRIGGER_LABEL: Record<string, string> = {
  signup: "On signup",
  inactivity: "After inactivity",
  birthday: "On birthday",
  credit_expiry: "On credit expiry",
  failed_payment: "On failed payment",
  no_show: "After no-show",
  churn_risk: "On churn risk",
  membership_change: "On plan change",
  referral: "On referral",
  milestone: "On milestone",
};

export default async function AutomationsPage() {
  const flows = await loadAutomationFlows();
  // Live state: empty DB returns the fixtures, so deep-equal to that
  // means the studio still has zero seeded flows.
  const isFixtureFallback =
    flows.length === AUTOMATIONS.length &&
    flows.every((f, i) => f.id === AUTOMATIONS[i].id);

  return (
    <>
      <PageHero
        meta="Triggers · steps · enrollments"
        title="Automations"
        subtitle="Always-on flows triggered by member events. Each step is a snapshot — editing the template doesn't touch in-flight enrollments."
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Export
            </button>
            {isFixtureFallback ? (
              <SeedAutomationsButton />
            ) : (
              <button type="button" className="btn btn-primary hov">
                <Icon name="plus" size={13} /> New automation
              </button>
            )}
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 14,
        }}
      >
        {flows.map((a) => (
          <div key={a.id} className="card" style={{ padding: 22 }}>
            <div
              className="row"
              style={{ justifyContent: "space-between", marginBottom: 12 }}
            >
              <span
                className="badge"
                style={{
                  background:
                    a.status === "active"
                      ? "var(--pos-soft)"
                      : "var(--surface-3)",
                  color:
                    a.status === "active" ? "var(--pos)" : "var(--text-2)",
                }}
              >
                {a.status}
              </span>
              <span
                className="mono text-3"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {TRIGGER_LABEL[a.trigger] ?? a.trigger}
              </span>
            </div>
            <div
              className="serif"
              style={{
                fontSize: 24,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
                marginBottom: 16,
              }}
            >
              {a.name}
            </div>
            <div
              className="row"
              style={{
                gap: 6,
                marginBottom: 16,
              }}
            >
              {Array.from({ length: a.steps }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 30,
                    borderRadius: 6,
                    background:
                      i % 2 === 0 ? "var(--accent-soft)" : "var(--surface-3)",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    color: "var(--text-2)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {i % 2 === 0 ? "send" : "wait"}
                </div>
              ))}
            </div>
            <div
              className="row"
              style={{
                justifyContent: "space-between",
                paddingTop: 12,
                borderTop: "1px solid var(--border)",
              }}
            >
              <div>
                <div
                  className="mono"
                  style={{ fontSize: 18, fontWeight: 600 }}
                >
                  {a.active}
                </div>
                <div className="metric-label">in flight</div>
              </div>
              <div>
                <div
                  className="mono"
                  style={{ fontSize: 18, fontWeight: 600 }}
                >
                  {a.enrolled.toLocaleString()}
                </div>
                <div className="metric-label">total enrolled</div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                {!isFixtureFallback && (
                  <AutomationToggle id={a.id} status={a.status} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
