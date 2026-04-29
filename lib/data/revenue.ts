/*
 * Revenue queries — overview, transactions, dunning, plans. All run
 * against `transactions` + `membership_plans` + (joined) `members /
 * profiles` for display names. Each helper falls back to fixtures
 * when the DB returns zero rows.
 */

import { dateKey, withKpiCache, type KpiBucket } from "@/lib/cache";
import { STUDIO_ID } from "@/lib/constants";
import {
  DUNNING,
  PLANS,
  TRANSACTIONS,
  type DunningRecord,
  type MembershipPlan,
  type RevenueKind,
  type Transaction,
} from "@/lib/fixtures";
import { createSupabaseServer } from "@/lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;

function fmtOccurred(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - DAY_MS);

  if (d >= today) {
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (d >= yesterday) {
    const t = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    return `Yest ${t}`;
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const KNOWN_KINDS = new Set<RevenueKind>([
  "membership",
  "class_pack",
  "retail",
  "gift_card",
  "walk_in",
  "corporate",
]);

function normaliseKind(raw: string | null): RevenueKind {
  if (raw && KNOWN_KINDS.has(raw as RevenueKind)) return raw as RevenueKind;
  return "walk_in";
}

/* ─── Transactions list (with optional status filter) ─────────────── */

type TxnRow = {
  id: string;
  type: string | null;
  status: string;
  amount_cents: number | null;
  description: string | null;
  occurred_at: string | null;
  member_id: string | null;
  members: {
    profiles: { full_name: string | null } | null;
  } | null;
};

export type LoadTransactionsParams = {
  status?: Transaction["status"];
  limit?: number;
  offset?: number;
  search?: string;
};

/**
 * Strips PostgREST/PostgreSQL pattern metacharacters from a free-text
 * search input. See `lib/data/members.ts` for the rationale.
 */
function sanitizeSearch(raw: string): string {
  return raw.replace(/[%_\\,()*]/g, "").trim();
}

export async function loadTransactions(
  params: LoadTransactionsParams = {},
): Promise<Transaction[]> {
  const { status, limit = 50, offset = 0, search } = params;
  const supabase = await createSupabaseServer();
  let q = supabase
    .from("transactions")
    .select(
      "id, type, status, amount_cents, description, occurred_at, member_id, members!left(profiles!left(full_name))",
    )
    .eq("studio_id", STUDIO_ID)
    .order("occurred_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status) q = q.eq("status", status);

  const rawSearch = search?.trim() ?? "";
  const safeSearch = rawSearch ? sanitizeSearch(rawSearch) : "";
  if (safeSearch) {
    // Try to match a dollar amount in the input ($150 → 15000 cents).
    // Cap at int4 max so an absurd value doesn't trigger a PostgREST 400
    // (which would silently swallow into an empty result).
    const numeric = Number(safeSearch.replace(/^\$/, ""));
    const cents = Math.round(numeric * 100);
    const orParts = [`description.ilike.%${safeSearch}%`];
    if (Number.isFinite(numeric) && numeric > 0 && cents <= 2_147_483_647) {
      orParts.push(`amount_cents.eq.${cents}`);
    }
    q = q.or(orParts.join(","));
  }

  const { data } = await q.returns<TxnRow[]>();
  const rows = data ?? [];
  // Same fixture-fallback rule as listMembers — see lib/data/members.ts.
  if (!rows.length) return rawSearch || status ? [] : TRANSACTIONS;

  return rows.map((r) => ({
    id: r.id,
    occurred: fmtOccurred(r.occurred_at),
    member: r.members?.profiles?.full_name ?? "—",
    kind: normaliseKind(r.type),
    description: r.description ?? "—",
    amountCents: r.amount_cents ?? 0,
    status: (r.status as Transaction["status"]) ?? "completed",
    seed: 0,
  }));
}

/* ─── Dunning queue (failed transactions) ─────────────────────────── */

export async function loadDunning(): Promise<DunningRecord[]> {
  const supabase = await createSupabaseServer();
  type DunningQueryRow = {
    id: string;
    amount_cents: number | null;
    description: string | null;
    occurred_at: string | null;
    member_id: string | null;
    members: { profiles: { full_name: string | null } | null } | null;
  };

  const { data } = await supabase
    .from("transactions")
    .select(
      "id, amount_cents, description, occurred_at, members!left(profiles!left(full_name)), member_id",
    )
    .eq("studio_id", STUDIO_ID)
    .eq("status", "failed")
    .order("occurred_at", { ascending: false })
    .limit(20)
    .returns<DunningQueryRow[]>();

  const rows = data ?? [];
  if (!rows.length) return DUNNING;

  return rows.map((r, i) => ({
    id: r.id,
    member: r.members?.profiles?.full_name ?? "Member",
    plan: r.description ?? "—",
    amountCents: r.amount_cents ?? 0,
    reason: r.description ?? "Payment failed",
    attempts: 1,
    nextRetry:
      i === 0 ? "Tomorrow 8 AM" : i === 1 ? "Apr 30 8 AM" : "Manual review",
    seed: 0,
  }));
}

/* ─── Revenue overview rollups ────────────────────────────────────── */

export type RevenueOverview = {
  totalCents: number;
  byType: Array<{ type: RevenueKind; sumCents: number; count: number }>;
  daily: Array<{ date: string; cents: number }>;
  failedCount: number;
  failedSumCents: number;
};

const OVERVIEW_BUCKETS: Record<number, KpiBucket> = {
  7: "revenue_overview_7d",
  30: "revenue_overview_30d",
  90: "revenue_overview_90d",
  365: "revenue_overview_365d",
};

export async function loadRevenueOverview(
  windowDays = 30,
): Promise<RevenueOverview> {
  const supabase = await createSupabaseServer();
  const bucket = OVERVIEW_BUCKETS[windowDays];
  if (bucket) {
    const today = dateKey();
    return withKpiCache<RevenueOverview>(
      supabase,
      STUDIO_ID,
      { bucket, periodStart: today, periodEnd: today },
      () => computeRevenueOverview(windowDays),
    );
  }
  return computeRevenueOverview(windowDays);
}

async function computeRevenueOverview(
  windowDays: number,
): Promise<RevenueOverview> {
  const supabase = await createSupabaseServer();
  const since = new Date(Date.now() - windowDays * DAY_MS).toISOString();

  const [completed, failed] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount_cents, type, occurred_at")
      .eq("studio_id", STUDIO_ID)
      .eq("status", "completed")
      .gte("occurred_at", since),
    supabase
      .from("transactions")
      .select("amount_cents")
      .eq("studio_id", STUDIO_ID)
      .eq("status", "failed")
      .gte("occurred_at", since),
  ]);

  const rows = completed.data ?? [];
  const failedRows = failed.data ?? [];

  const byTypeMap = new Map<
    RevenueKind,
    { sumCents: number; count: number }
  >();
  let total = 0;
  const dailyMap = new Map<string, number>();

  for (const r of rows) {
    const cents = r.amount_cents ?? 0;
    const kind = normaliseKind(r.type);
    total += cents;
    const acc = byTypeMap.get(kind) ?? { sumCents: 0, count: 0 };
    acc.sumCents += cents;
    acc.count += 1;
    byTypeMap.set(kind, acc);
    if (r.occurred_at) {
      const date = r.occurred_at.slice(0, 10);
      dailyMap.set(date, (dailyMap.get(date) ?? 0) + cents);
    }
  }

  const daily = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cents]) => ({ date, cents }));

  return {
    totalCents: total,
    byType: Array.from(byTypeMap.entries()).map(([type, v]) => ({
      type,
      ...v,
    })),
    daily,
    failedCount: failedRows.length,
    failedSumCents: failedRows.reduce((s, r) => s + (r.amount_cents ?? 0), 0),
  };
}

/* ─── Membership plans + active counts ────────────────────────────── */

export async function loadMembershipPlans(): Promise<MembershipPlan[]> {
  const supabase = await createSupabaseServer();
  const { data: plans } = await supabase
    .from("membership_plans")
    .select(
      "id, name, tier, price_cents, billing_interval, credits_per_cycle, guest_passes, is_active, is_legacy",
    )
    .eq("studio_id", STUDIO_ID)
    .order("price_cents", { ascending: false });

  const rows = plans ?? [];
  if (!rows.length) return PLANS;

  // Active member counts aggregated in-memory — one round trip total
  // (vs N+1 with one query per plan). At ~1k active members the
  // payload is ~16KB.
  const { data: activeMembers } = await supabase
    .from("members")
    .select("plan_id")
    .eq("studio_id", STUDIO_ID)
    .eq("membership_status", "active");
  const countMap = new Map<string, number>();
  for (const m of activeMembers ?? []) {
    if (!m.plan_id) continue;
    countMap.set(m.plan_id, (countMap.get(m.plan_id) ?? 0) + 1);
  }

  return rows.map<MembershipPlan>((r) => {
    const price = r.price_cents ?? 0;
    const active = countMap.get(r.id) ?? 0;
    const monthly =
      r.billing_interval === "annual" ? Math.round(price / 12) : price;
    return {
      id: r.id,
      name: r.name,
      tier: r.tier ?? "Plan",
      priceCents: price,
      active,
      mrrCents: monthly * active,
      creditsPerCycle: r.credits_per_cycle,
      guests: r.guest_passes ?? 0,
      legacy: r.is_legacy || undefined,
    };
  });
}
