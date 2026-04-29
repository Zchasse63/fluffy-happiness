/*
 * Server-side member queries. Falls back to fixtures when Supabase
 * returns zero rows (the autonomous build hasn't seeded members yet).
 *
 * Keeping the fallback here means UI code stays declarative — no
 * conditional empty states scattered across components.
 */

import { dateKey, withKpiCache } from "@/lib/cache";
import { STUDIO_ID } from "@/lib/constants";
import {
  MEMBER_PROFILE_BOOKINGS,
  MEMBERS,
  type EngagementBadge,
  type Member,
  type MemberProfileBookingRow,
} from "@/lib/fixtures";
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
  created_at: string | null;
  profiles: { full_name: string; email: string | null; phone: string | null } | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 7-state engagement badge derived from membership status + recent
 * check-in count (last 14 days).
 *
 * Power      ≥4 check-ins / 14d (active)
 * Active     2–3 check-ins / 14d (active)
 * Engaged    1 check-in / 14d (active)
 * Cooling    0 check-ins / 14d but ≥1 in prior 14d (active)
 * At risk    paused, OR active with no check-in in 28d
 * New        trialing, OR joined < 30d ago
 * Lapsed     cancelled
 */
function inferEngagement(
  row: MemberRow,
  recentCheckins: number,
  priorCheckins: number,
): EngagementBadge {
  if (row.membership_status === "cancelled") return "Lapsed";
  if (row.membership_status === "trialing") return "New";
  const joinedRecently =
    row.created_at &&
    Date.now() - new Date(row.created_at).getTime() < 30 * DAY_MS;
  if (joinedRecently) return "New";
  if (row.membership_status === "paused") return "At risk";
  // Active members from here.
  if (recentCheckins >= 4) return "Power";
  if (recentCheckins >= 2) return "Active";
  if (recentCheckins === 1) return "Engaged";
  if (priorCheckins >= 1) return "Cooling";
  return "At risk";
}

export type ListMembersParams = {
  limit?: number;
  offset?: number;
  status?: Member["status"];
  search?: string;
};

/**
 * Strips PostgREST/PostgreSQL pattern metacharacters from a free-text
 * search input. Without this, a `,` or `(` in the input would break
 * `.or()` clause parsing, and `%`/`_` would silently turn the input
 * into a wildcard match.
 */
function sanitizeSearch(raw: string): string {
  return raw.replace(/[%_\\,()*]/g, "").trim();
}

export async function listMembers(
  params: ListMembersParams = {},
): Promise<Member[]> {
  const { limit = 50, offset = 0, status, search } = params;
  const supabase = await createSupabaseServer();
  let q = supabase
    .from("members")
    .select(
      "id, membership_status, membership_tier, plan_code, plan_price_cents, membership_credits, flex_credits, wallet_balance_cents, strike_count, glofox_id, created_at, profiles!inner(full_name, email, phone)",
    )
    .eq("studio_id", STUDIO_ID)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status) q = q.eq("membership_status", status);

  const rawSearch = search?.trim() ?? "";
  const safeSearch = rawSearch ? sanitizeSearch(rawSearch) : "";
  if (safeSearch) {
    q = q.or(
      `full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`,
      { referencedTable: "profiles" },
    );
  }

  const { data } = await q.returns<MemberRow[]>();
  const rows = data ?? [];
  // Empty result + any narrowing intent (search or status) = real
  // "no matches", return []. Use rawSearch — if the user typed
  // something that sanitised to empty, that still expressed intent.
  // Fixtures only when nothing was narrowing the query.
  if (!rows.length) return rawSearch || status ? [] : MEMBERS;

  // Pull check-in history for these members across the last 28 days
  // in a single round trip; bucket per-member into recent (0–14d) +
  // prior (14–28d).
  const memberIds = rows.map((r) => r.id);
  const recentSince = new Date(Date.now() - 14 * DAY_MS).toISOString();
  const priorSince = new Date(Date.now() - 28 * DAY_MS).toISOString();

  const { data: checkInRows } = await supabase
    .from("bookings")
    .select("member_id, created_at")
    .eq("studio_id", STUDIO_ID)
    .eq("status", "checked_in")
    .gte("created_at", priorSince)
    .in("member_id", memberIds);

  const recent = new Map<string, number>();
  const prior = new Map<string, number>();
  for (const row of checkInRows ?? []) {
    if (!row.member_id || !row.created_at) continue;
    if (row.created_at >= recentSince) {
      recent.set(row.member_id, (recent.get(row.member_id) ?? 0) + 1);
    } else {
      prior.set(row.member_id, (prior.get(row.member_id) ?? 0) + 1);
    }
  }

  return rows.map((r, i) => ({
    id: r.id,
    name: r.profiles?.full_name ?? "Member",
    email: r.profiles?.email ?? "",
    phone: r.profiles?.phone ?? "",
    tier: (r.membership_tier as Member["tier"]) ?? "Monthly Unlimited",
    status: (r.membership_status as Member["status"]) ?? "active",
    engagement: inferEngagement(
      r,
      recent.get(r.id) ?? 0,
      prior.get(r.id) ?? 0,
    ),
    credits: r.membership_credits + r.flex_credits,
    walletCents: r.wallet_balance_cents,
    ltv: 0,
    lastVisit: "—",
    joined: "—",
    seed: i + 1,
    strikes: r.strike_count,
  }));
}

/* ─── Directory KPI strip ──────────────────────────────────────── */

export type DirectoryKpis = {
  activeCount: number;
  newThisMonthCount: number;
  mrrCents: number;
  trialCount: number;
};

export async function loadDirectoryKpis(): Promise<DirectoryKpis> {
  const supabase = await createSupabaseServer();
  const today = dateKey();
  return withKpiCache<DirectoryKpis>(
    supabase,
    STUDIO_ID,
    { bucket: "directory_kpis", periodStart: today, periodEnd: today },
    () => computeDirectoryKpis(),
  );
}

async function computeDirectoryKpis(): Promise<DirectoryKpis> {
  const supabase = await createSupabaseServer();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    { count: activeCount },
    { count: newCount },
    { data: activeMrr },
    { count: trialCount },
  ] = await Promise.all([
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", STUDIO_ID)
      .eq("membership_status", "active"),
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", STUDIO_ID)
      .gte("created_at", monthAgo.toISOString()),
    supabase
      .from("members")
      .select("plan_price_cents")
      .eq("studio_id", STUDIO_ID)
      .eq("membership_status", "active"),
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", STUDIO_ID)
      .eq("membership_status", "trialing"),
  ]);

  const mrrCents = (activeMrr ?? []).reduce(
    (s, m) => s + (m.plan_price_cents ?? 0),
    0,
  );

  return {
    activeCount: activeCount ?? 0,
    newThisMonthCount: newCount ?? 0,
    mrrCents,
    trialCount: trialCount ?? 0,
  };
}

/* ─── Per-member profile loaders (Bookings / Payments / Activity tabs) ── */

export type MemberPaymentRow = {
  id: string;
  occurred: string;
  description: string;
  amountCents: number;
  status: "completed" | "failed" | "refunded" | "pending" | "disputed";
  card: string;
};

export type MemberActivityEntry = {
  t: string;
  type: string;
  description: string;
};

const DAY_MS_2 = 24 * 60 * 60 * 1000;

function fmtTimeRow(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d >= today) {
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  const yesterday = new Date(today.getTime() - DAY_MS_2);
  if (d >= yesterday) {
    return `Yest ${d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STATUS_TO_BOOKING_TONE: Record<
  string,
  MemberProfileBookingRow["status"]
> = {
  checked_in: "checked-in",
  no_show: "no-show",
  booked: "booked",
  // Older/other statuses default to "booked".
};

type BookingQueryRow = {
  id: string;
  status: string;
  created_at: string;
  class_instances: {
    title: string | null;
    starts_at: string;
    trainer_id: string | null;
    trainers: {
      profiles: { full_name: string | null } | null;
    } | null;
  } | null;
};

export async function loadMemberBookings(
  memberId: string,
): Promise<MemberProfileBookingRow[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, status, created_at, class_instances!inner(title, starts_at, trainer_id, trainers:trainer_id(profiles:profile_id(full_name)))",
    )
    .eq("studio_id", STUDIO_ID)
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<BookingQueryRow[]>();

  const rows = data ?? [];
  if (!rows.length) return MEMBER_PROFILE_BOOKINGS;

  return rows.map((r) => {
    const start = r.class_instances?.starts_at;
    return {
      time: start ? fmtTimeRow(start) : fmtTimeRow(r.created_at),
      kind: r.class_instances?.title ?? "Class",
      trainer:
        r.class_instances?.trainers?.profiles?.full_name ?? "Unassigned",
      status: STATUS_TO_BOOKING_TONE[r.status] ?? "booked",
    };
  });
}

export async function loadMemberPayments(
  memberId: string,
): Promise<MemberPaymentRow[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("transactions")
    .select(
      "id, amount_cents, description, status, occurred_at, stripe_payment_intent",
    )
    .eq("studio_id", STUDIO_ID)
    .eq("member_id", memberId)
    .order("occurred_at", { ascending: false })
    .limit(20);

  const rows = data ?? [];
  return rows.map((r) => ({
    id: r.id,
    occurred: fmtTimeRow(r.occurred_at),
    description: r.description ?? "—",
    amountCents: r.amount_cents ?? 0,
    status: (r.status as MemberPaymentRow["status"]) ?? "completed",
    card: r.stripe_payment_intent ? "Stripe" : "—",
  }));
}

export async function loadMemberActivity(
  memberId: string,
): Promise<MemberActivityEntry[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("activity_log")
    .select("type, payload, created_at")
    .eq("studio_id", STUDIO_ID)
    .eq("subject_type", "member")
    .eq("subject_id", memberId)
    .order("created_at", { ascending: false })
    .limit(30);

  const rows = data ?? [];
  return rows.map((r) => {
    const p =
      r.payload && typeof r.payload === "object" && !Array.isArray(r.payload)
        ? (r.payload as Record<string, unknown>)
        : {};
    const description =
      typeof p.description === "string"
        ? p.description
        : typeof p.reason === "string"
          ? p.reason
          : r.type.replace(/_/g, " ");
    return {
      t: fmtTimeRow(r.created_at),
      type: r.type,
      description,
    };
  });
}
