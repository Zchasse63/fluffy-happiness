/*
 * Marketing queries — leads and (eventually) campaigns + automations.
 * Leads come from `leads` table; falls back to LEADS fixture when the
 * table is empty (Glofox lead pull is empty for TSG today).
 */

import { STUDIO_ID } from "@/lib/constants";
import { fixtureFallback } from "@/lib/data/_log";
import { LEADS, type Lead, type LeadStatus } from "@/lib/fixtures";
import { createSupabaseServer } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, LeadStatus> = {
  new: "New",
  contacted: "Contacted",
  trial: "Trial",
  trialing: "Trial",
  converted: "Converted",
  lost: "Lost",
  closed_lost: "Lost",
  closed_won: "Converted",
};

function relativeTouch(ts: string | null): string {
  if (!ts) return "—";
  const ms = Date.now() - new Date(ts).getTime();
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export async function loadLeads(): Promise<Lead[]> {
  type LeadQueryRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    source: string | null;
    score: number | null;
    status: string | null;
    updated_at: string | null;
    profiles: { full_name: string | null } | null;
  };

  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("leads")
    .select(
      "id, full_name, email, source, score, status, updated_at, assigned_to, profiles:assigned_to(full_name)",
    )
    .eq("studio_id", STUDIO_ID)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<LeadQueryRow[]>();

  const rows = data ?? [];
  if (!rows.length) return fixtureFallback(LEADS, []);

  return rows.map((r, i) => ({
    id: r.id,
    name: r.full_name ?? "Lead",
    email: r.email ?? "",
    source: r.source ?? "Unknown",
    score: r.score ?? 0,
    status: STATUS_LABEL[r.status ?? "new"] ?? "New",
    lastTouch: relativeTouch(r.updated_at),
    assignedTo: r.profiles?.full_name ?? undefined,
    seed: i + 1,
  }));
}
