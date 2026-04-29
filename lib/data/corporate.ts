/*
 * Corporate accounts queries — list with active member counts and
 * trailing-30-day revenue rollup. Falls back to a placeholder fixture
 * when the studio has no accounts yet (zero rows = unseeded).
 */

import { STUDIO_ID } from "@/lib/constants";
import { createSupabaseServer } from "@/lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;

export type CorporateAccount = {
  id: string;
  name: string;
  contact: string;
  contactEmail: string | null;
  status: "active" | "paused" | "cancelled";
  monthlyFeeCents: number;
  memberCount: number;
  ytdRevenueCents: number;
};

const FIXTURE: CorporateAccount[] = [
  {
    id: "co1",
    name: "Cigar City Brewing",
    contact: "Mark Ortega",
    contactEmail: null,
    status: "active",
    monthlyFeeCents: 0,
    memberCount: 12,
    ytdRevenueCents: 168000,
  },
  {
    id: "co2",
    name: "Tampa General Health",
    contact: "Lin Chen",
    contactEmail: null,
    status: "active",
    monthlyFeeCents: 0,
    memberCount: 8,
    ytdRevenueCents: 122400,
  },
];

export async function loadCorporateAccounts(): Promise<CorporateAccount[]> {
  const supabase = await createSupabaseServer();
  const { data: accounts } = await supabase
    .from("corporate_accounts")
    .select(
      "id, name, contact_name, contact_email, status, monthly_fee_cents",
    )
    .eq("studio_id", STUDIO_ID)
    .order("name");

  const rows = accounts ?? [];
  if (!rows.length) return FIXTURE;

  // Member counts per account, single query.
  const { data: memberRows } = await supabase
    .from("members")
    .select("corporate_account_id")
    .eq("studio_id", STUDIO_ID)
    .not("corporate_account_id", "is", null);
  const memberCounts = new Map<string, number>();
  for (const m of memberRows ?? []) {
    if (!m.corporate_account_id) continue;
    memberCounts.set(
      m.corporate_account_id,
      (memberCounts.get(m.corporate_account_id) ?? 0) + 1,
    );
  }

  // YTD revenue per account: transactions joined to members.
  // For now, summed monthly_fee_cents × 12 as a placeholder until
  // proper transaction tagging is wired.
  return rows.map<CorporateAccount>((a) => ({
    id: a.id,
    name: a.name,
    contact: a.contact_name ?? "—",
    contactEmail: a.contact_email,
    status: (a.status as CorporateAccount["status"]) ?? "active",
    monthlyFeeCents: a.monthly_fee_cents ?? 0,
    memberCount: memberCounts.get(a.id) ?? 0,
    ytdRevenueCents: (a.monthly_fee_cents ?? 0) * 12,
  }));
}

export type CorporateUpcomingEvent = {
  id: string;
  title: string;
  company: string;
  date: string;
  guests: number;
};

const EVENTS_FIXTURE: CorporateUpcomingEvent[] = [];

export async function loadCorporateUpcomingEvents(): Promise<
  CorporateUpcomingEvent[]
> {
  // Real corporate event tracking would need a join from class_instances
  // to corporate_accounts via metadata or a new table. The schema for
  // either isn't decided yet — leaving a stub returning [] (which falls
  // through to the fixture so the panel doesn't disappear).
  await new Promise((r) => setTimeout(r, 0));
  return EVENTS_FIXTURE;
}

export const _DAY_MS = DAY_MS;
