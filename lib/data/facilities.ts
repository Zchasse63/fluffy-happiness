/*
 * Facility resources + maintenance log queries. Live from
 * `facility_resources` and `facility_maintenance` (added in 0013).
 *
 * Fixture fallback when the studio hasn't seeded any resources yet —
 * lets the page render meaningful demo data rather than a blank state.
 */

import { STUDIO_ID } from "@/lib/constants";
import { createSupabaseServer } from "@/lib/supabase/server";

export type FacilityResource = {
  id: string;
  name: string;
  capacity: number;
  status: "live" | "maintenance" | "offline" | "retired";
  category: string;
  lastService: string;
  nextService: string;
  notes: string | null;
};

const FIXTURE: FacilityResource[] = [
  {
    id: "sauna-1",
    name: "Sauna · Cedar",
    capacity: 12,
    status: "live",
    category: "sauna",
    lastService: "Apr 8",
    nextService: "May 6",
    notes: "Heater swap due in 6 weeks",
  },
  {
    id: "sauna-2",
    name: "Sauna · Hemlock",
    capacity: 8,
    status: "live",
    category: "sauna",
    lastService: "Apr 1",
    nextService: "May 1",
    notes: null,
  },
  {
    id: "plunge-1",
    name: "Cold plunge · 38°",
    capacity: 4,
    status: "live",
    category: "plunge",
    lastService: "Apr 14",
    nextService: "May 14",
    notes: "Chiller upgrade installed Apr 4",
  },
  {
    id: "plunge-2",
    name: "Cold plunge · 42°",
    capacity: 4,
    status: "maintenance",
    category: "plunge",
    lastService: "Apr 22",
    nextService: "Apr 30",
    notes: "Refilling and recalibrating; back online Apr 30",
  },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function loadFacilities(): Promise<FacilityResource[]> {
  const supabase = await createSupabaseServer();

  const { data: resources } = await supabase
    .from("facility_resources")
    .select("id, name, capacity, status, category, notes")
    .eq("studio_id", STUDIO_ID)
    .order("name");

  const rows = resources ?? [];
  if (!rows.length) return FIXTURE;

  // Last service + next service per resource — single round-trip,
  // bucket per resource_id with the most recent record.
  const ids = rows.map((r) => r.id);
  const { data: maint } = await supabase
    .from("facility_maintenance")
    .select("resource_id, performed_at, next_service_at")
    .eq("studio_id", STUDIO_ID)
    .in("resource_id", ids)
    .order("performed_at", { ascending: false });

  const latest = new Map<
    string,
    { performed: string | null; next: string | null }
  >();
  for (const m of maint ?? []) {
    if (!m.resource_id) continue;
    if (!latest.has(m.resource_id)) {
      latest.set(m.resource_id, {
        performed: m.performed_at,
        next: m.next_service_at,
      });
    }
  }

  return rows.map<FacilityResource>((r) => {
    const entry = latest.get(r.id);
    return {
      id: r.id,
      name: r.name,
      capacity: r.capacity ?? 0,
      status:
        (r.status as FacilityResource["status"]) ?? "live",
      category: r.category ?? "sauna",
      lastService: fmtDate(entry?.performed ?? null),
      nextService: fmtDate(entry?.next ?? null),
      notes: r.notes,
    };
  });
}
