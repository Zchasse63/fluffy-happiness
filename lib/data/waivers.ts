/*
 * Waivers — `member_waivers` joined to `waiver_templates` and member
 * profiles. Computes a status from `expires_at` so the UI can render
 * an "expired"/"expiring" badge without doing date math itself.
 */

import { STUDIO_ID } from "@/lib/constants";
import { createSupabaseServer } from "@/lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;

export type WaiverRow = {
  id: string;
  member: string;
  memberId: string;
  template: string;
  signed: string;
  expires: string;
  status: "active" | "expiring" | "expired";
  seed: number;
};

const FIXTURE: WaiverRow[] = [
  {
    id: "w1",
    member: "Alex Park",
    memberId: "m1",
    template: "Cold plunge · v3",
    signed: "Sep 12, 2025",
    expires: "Sep 12, 2026",
    status: "active",
    seed: 12,
  },
  {
    id: "w4",
    member: "Maya Chen",
    memberId: "m2",
    template: "Sauna contraindications · v1",
    signed: "Apr 14, 2025",
    expires: "Apr 14, 2026",
    status: "expired",
    seed: 51,
  },
];

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusOf(expiresAt: string | null): WaiverRow["status"] {
  if (!expiresAt) return "active";
  const expires = new Date(expiresAt).getTime();
  const now = Date.now();
  if (expires < now) return "expired";
  if (expires - now < 30 * DAY_MS) return "expiring";
  return "active";
}

type Row = {
  id: string;
  signed_at: string | null;
  expires_at: string | null;
  member_id: string;
  members: { profiles: { full_name: string | null } | null } | null;
  waiver_templates: { name: string; version: string } | null;
};

export async function loadWaivers(): Promise<WaiverRow[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("member_waivers")
    .select(
      "id, signed_at, expires_at, member_id, members!inner(profiles!inner(full_name)), waiver_templates!inner(name, version)",
    )
    .eq("studio_id", STUDIO_ID)
    .order("signed_at", { ascending: false })
    .limit(100)
    .returns<Row[]>();

  const rows = data ?? [];
  if (!rows.length) return FIXTURE;

  return rows.map<WaiverRow>((r, i) => ({
    id: r.id,
    member: r.members?.profiles?.full_name ?? "Member",
    memberId: r.member_id,
    template: r.waiver_templates
      ? `${r.waiver_templates.name} · ${r.waiver_templates.version}`
      : "Template",
    signed: fmt(r.signed_at),
    expires: fmt(r.expires_at),
    status: statusOf(r.expires_at),
    seed: i + 1,
  }));
}
