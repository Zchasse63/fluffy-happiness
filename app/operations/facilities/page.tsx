/*
 * Operations · Facilities — equipment list with status, maintenance schedule,
 * and capacity config.
 */

import { Icon } from "@/components/icon";
import { PageHero } from "@/components/primitives";

type Resource = {
  id: string;
  name: string;
  capacity: number;
  status: "live" | "maintenance" | "offline";
  lastService: string;
  nextService: string;
  notes?: string;
};

const RESOURCES: Resource[] = [
  { id: "sauna-1", name: "Sauna · Cedar", capacity: 12, status: "live", lastService: "Apr 8", nextService: "May 6", notes: "Heater swap due in 6 weeks" },
  { id: "sauna-2", name: "Sauna · Hemlock", capacity: 12, status: "live", lastService: "Apr 8", nextService: "May 6" },
  { id: "sauna-3", name: "Sauna · Infrared cabin", capacity: 4, status: "maintenance", lastService: "Apr 19", nextService: "Apr 22", notes: "Bench refinish in progress" },
  { id: "plunge-1", name: "Cold plunge · A", capacity: 6, status: "live", lastService: "Apr 12", nextService: "Apr 26" },
  { id: "plunge-2", name: "Cold plunge · B", capacity: 6, status: "live", lastService: "Apr 12", nextService: "Apr 26", notes: "New chiller installed Apr 12" },
  { id: "shower-room", name: "Shower room", capacity: 4, status: "live", lastService: "Apr 15", nextService: "May 13" },
];

export default function FacilitiesPage() {
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
