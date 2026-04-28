/*
 * Server-side member queries. Falls back to fixtures when Supabase
 * returns zero rows (the autonomous build hasn't seeded members yet).
 *
 * Keeping the fallback here means UI code stays declarative — no
 * conditional empty states scattered across components.
 */

import { MEMBERS, type EngagementBadge, type Member } from "@/lib/fixtures";
import { createSupabaseServer } from "@/lib/supabase/server";

type MemberRow = {
  id: string;
  membership_status: string;
  membership_tier: string | null;
  plan_code: string | null;
  plan_price_cents: number | null;
  membership_credits: number;
  flex_credits: number;
  wallet_balance_cents: number;
  strike_count: number;
  glofox_id: string | null;
  profiles: { full_name: string; email: string | null; phone: string | null } | null;
};

function inferEngagement(_row: MemberRow): EngagementBadge {
  // Until we have visit history, guess from membership status.
  if (_row.membership_status === "trialing") return "New";
  if (_row.membership_status === "paused") return "At risk";
  if (_row.membership_status === "cancelled") return "Lapsed";
  return "Active";
}

export async function listMembers(): Promise<Member[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("members")
    .select(
      "id, membership_status, membership_tier, plan_code, plan_price_cents, membership_credits, flex_credits, wallet_balance_cents, strike_count, glofox_id, profiles!inner(full_name, email, phone)",
    )
    .order("updated_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as unknown as MemberRow[];
  if (!rows.length) return MEMBERS;

  return rows.map((r, i) => ({
    id: r.id,
    name: r.profiles?.full_name ?? "Member",
    email: r.profiles?.email ?? "",
    phone: r.profiles?.phone ?? "",
    tier: (r.membership_tier as Member["tier"]) ?? "Monthly Unlimited",
    status: (r.membership_status as Member["status"]) ?? "active",
    engagement: inferEngagement(r),
    credits: r.membership_credits + r.flex_credits,
    walletCents: r.wallet_balance_cents,
    ltv: 0,
    lastVisit: "—",
    joined: "—",
    seed: i + 1,
    strikes: r.strike_count,
  }));
}
