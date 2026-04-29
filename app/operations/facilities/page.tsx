/*
 * Operations · Facilities — equipment list with status, maintenance schedule,
 * and capacity config. Live from `facility_resources` + most-recent
 * `facility_maintenance` rows. Falls back to fixture set when empty.
 */

export const dynamic = "force-dynamic";

import { Icon } from "@/components/icon";
import { PageHero } from "@/components/primitives";
import { loadFacilities } from "@/lib/data/facilities";

export default async function FacilitiesPage() {
  const RESOURCES = await loadFacilities();
  return (
    <>
      <PageHero
        meta="Equipment · Tampa"
        title="Facilities"
        subtitle="Saunas, cold plunges, and supporting rooms with capacity and maintenance state."
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Export
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="plus" size={13} /> Add resource
            </button>
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
        {RESOURCES.map((r) => (
          <div className="card" key={r.id} style={{ padding: 18 }}>
            <div
              className="row"
              style={{
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span
                className="badge"
                style={{
                  background:
                    r.status === "live"
                      ? "var(--pos-soft)"
                      : r.status === "maintenance"
                        ? "var(--warn-soft)"
                        : "var(--neg-soft)",
                  color:
                    r.status === "live"
                      ? "var(--pos)"
                      : r.status === "maintenance"
                        ? "var(--warn)"
                        : "var(--neg)",
                }}
              >
                {r.status}
              </span>
              <span
                className="mono text-3"
                style={{
                  fontSize: 10.5,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Capacity {r.capacity}
              </span>
            </div>
            <div
              className="serif"
              style={{
                fontSize: 24,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
                marginBottom: 14,
              }}
            >
              {r.name}
            </div>
            <div className="row" style={{ gap: 24, marginBottom: 12 }}>
              <div>
                <div className="metric-label">Last serviced</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                  {r.lastService}
                </div>
              </div>
              <div>
                <div className="metric-label">Next serviced</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                  {r.nextService}
                </div>
              </div>
            </div>
            {r.notes && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 9,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  color: "var(--text-2)",
                  lineHeight: 1.5,
                }}
              >
                {r.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
