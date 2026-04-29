/*
 * Command Center server-side data loaders. Each helper returns either
 * real Supabase data when present, or fixture data otherwise — keeps
 * the page declarative.
 */

import type { Insight } from "@/components/primitives";
import { dateKey, withKpiCache } from "@/lib/cache";
import { STUDIO_ID } from "@/lib/constants";
import {
  ACTIVITY,
  WEEK_REVIEW,
  type ActivityEntry,
  type WeekReviewRow,
} from "@/lib/fixtures";
import { formatCurrency } from "@/lib/utils";
import { createSupabaseServer } from "@/lib/supabase/server";

/* ─── AI briefing (today, latest) ────────────────────────────────── */

type BriefingRow = {
  generated_at: string;
  insights: Array<{
    rank: "P1" | "P2" | "P3";
    tone: "neg" | "warn" | "info" | "pos";
    kicker: string;
    headline: string;
    body: string;
    action: string;
  }>;
};

export type LatestBriefing = {
  generatedAt: Date;
  insights: Insight[];
} | null;

export async function loadLatestBriefing(): Promise<LatestBriefing> {
  const supabase = await createSupabaseServer();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("ai_briefings")
    .select("generated_at, insights")
    .eq("studio_id", STUDIO_ID)
    .eq("date", today)
    .maybeSingle()
    .returns<BriefingRow>();
  if (!data) return null;
  return {
    generatedAt: new Date(data.generated_at),
    insights: data.insights.map((i) => ({
      ...i,
      data: [],
    })),
  };
}

export type TodaySlot = {
  id: string;
  time: string;
  dur: string;
  kind: string;
  trainer: string;
  cap: string;
  fill: number;
  tone: "ok" | "mid" | "low";
  state: "live" | "next" | "" | "!";
};

const startOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const endOfDay = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

function tone(fill: number): TodaySlot["tone"] {
  if (fill < 30) return "low";
  if (fill < 60) return "mid";
  return "ok";
}

function fmtDuration(min: number) {
  return `${min}m`;
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export async function loadTodaySchedule(): Promise<TodaySlot[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("class_instances")
    .select(
      "id, title, starts_at, ends_at, capacity, booked_count, trainer_id, program_id",
    )
    .eq("studio_id", STUDIO_ID)
    .gte("starts_at", startOfDay().toISOString())
    .lte("starts_at", endOfDay().toISOString())
    .order("starts_at", { ascending: true });

  if (!data?.length) return [];

  const now = new Date();
  let foundLive = false;
  let foundNext = false;

  return data.map((c, i) => {
    const start = new Date(c.starts_at);
    const end = new Date(c.ends_at);
    const dur = Math.round((end.getTime() - start.getTime()) / 60000);
    const fill = c.capacity
      ? Math.round((c.booked_count / c.capacity) * 100)
      : 0;
    let state: TodaySlot["state"] = "";
    if (!foundLive && start <= now && now <= end) {
      state = "live";
      foundLive = true;
    } else if (foundLive && !foundNext && start > now) {
      state = "next";
      foundNext = true;
    }
    if (fill < 30 && start > now) state = "!";
    return {
      id: c.id,
      time: fmtTime(start),
      dur: fmtDuration(dur),
      kind: c.title ?? "Class",
      trainer: "—",
      cap: `${c.booked_count}/${c.capacity}`,
      fill,
      tone: tone(fill),
      state: state ?? ("" as const),
    };
  });
}

export type RevenueSnapshot = {
  todayCents: number;
  todayBookings: number;
  walkIns: number;
  noShows: number;
  attendanceRate: number;
  weekRevenueCents: number;
  weekClasses: number;
  newMembersThisWeek: number;
};

export async function loadRevenueSnapshot(): Promise<RevenueSnapshot> {
  const supabase = await createSupabaseServer();
  const today = dateKey();
  return withKpiCache<RevenueSnapshot>(
    supabase,
    STUDIO_ID,
    { bucket: "revenue_snapshot", periodStart: today, periodEnd: today },
    () => computeRevenueSnapshot(),
  );
}

async function computeRevenueSnapshot(): Promise<RevenueSnapshot> {
  const supabase = await createSupabaseServer();
  const today = startOfDay();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    todayTxns,
    weekTxns,
    todayClasses,
    weekClasses,
    newMembers,
    walkInsCount,
    noShowsCount,
    weekBookings,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount_cents, status")
      .eq("studio_id", STUDIO_ID)
      .gte("occurred_at", today.toISOString()),
    supabase
      .from("transactions")
      .select("amount_cents, status")
      .eq("studio_id", STUDIO_ID)
      .gte("occurred_at", weekAgo.toISOString()),
    supabase
      .from("class_instances")
      .select("booked_count")
      .eq("studio_id", STUDIO_ID)
      .gte("starts_at", today.toISOString())
      .lte("starts_at", endOfDay().toISOString()),
    supabase
      .from("class_instances")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", STUDIO_ID)
      .gte("starts_at", weekAgo.toISOString()),
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", STUDIO_ID)
      .gte("created_at", weekAgo.toISOString()),
    // Walk-ins today = completed retail-style transactions of type=walk_in.
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", STUDIO_ID)
      .eq("status", "completed")
      .eq("type", "walk_in")
      .gte("occurred_at", today.toISOString()),
    // No-shows today via the bookings whose class falls in today.
    supabase
      .from("bookings")
      .select(
        "id, class_instances!inner(starts_at, studio_id)",
        { count: "exact", head: true },
      )
      .eq("status", "no_show")
      .eq("class_instances.studio_id", STUDIO_ID)
      .gte("class_instances.starts_at", today.toISOString())
      .lte("class_instances.starts_at", endOfDay().toISOString()),
    // 7-day attendance proxy: checked-in vs all non-cancelled bookings.
    supabase
      .from("bookings")
      .select("status")
      .eq("studio_id", STUDIO_ID)
      .gte("created_at", weekAgo.toISOString())
      .neq("status", "cancelled"),
  ]);

  const weekRows = weekBookings.data ?? [];
  const checkedIn = weekRows.filter((r) => r.status === "checked_in").length;
  const attendanceRate = weekRows.length
    ? Number((checkedIn / weekRows.length).toFixed(2))
    : 0;

  return {
    todayCents:
      (todayTxns.data ?? [])
        .filter((t) => t.status === "completed")
        .reduce((s, t) => s + (t.amount_cents ?? 0), 0),
    todayBookings: (todayClasses.data ?? []).reduce(
      (s, c) => s + (c.booked_count ?? 0),
      0,
    ),
    walkIns: walkInsCount.count ?? 0,
    noShows: noShowsCount.count ?? 0,
    attendanceRate,
    weekRevenueCents:
      (weekTxns.data ?? [])
        .filter((t) => t.status === "completed")
        .reduce((s, t) => s + (t.amount_cents ?? 0), 0),
    weekClasses: weekClasses.count ?? 0,
    newMembersThisWeek: newMembers.count ?? 0,
  };
}

export type FocusItem = {
  p: "P1" | "P2" | "P3";
  pc: "neg" | "warn" | "info";
  title: string;
  meta: string;
  cta: string;
  href: string;
};

export async function loadFocusQueue(): Promise<FocusItem[]> {
  const supabase = await createSupabaseServer();
  const items: FocusItem[] = [];

  // P1: failed payments
  const { data: failed } = await supabase
    .from("transactions")
    .select("id, description, amount_cents, member_id, members!inner(profiles!inner(full_name))")
    .eq("studio_id", STUDIO_ID)
    .eq("status", "failed")
    .order("occurred_at", { ascending: false })
    .limit(3);
  for (const t of failed ?? []) {
    type Joined = typeof t & {
      members: { profiles: { full_name: string } } | null;
    };
    const j = t as Joined;
    items.push({
      p: "P1",
      pc: "neg",
      title: `Failed payment · ${j.members?.profiles?.full_name ?? "Member"}`,
      meta: `${j.description ?? "Charge"} · $${(j.amount_cents / 100).toFixed(0)}`,
      cta: "Retry",
      href: "/revenue/dunning",
    });
  }

  // P2: underbooked classes today
  const { data: under } = await supabase
    .from("class_instances")
    .select("id, title, starts_at, capacity, booked_count")
    .eq("studio_id", STUDIO_ID)
    .gte("starts_at", new Date().toISOString())
    .lt(
      "starts_at",
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    );
  for (const c of (under ?? []).filter((c) => c.booked_count / c.capacity < 0.5)) {
    const t = new Date(c.starts_at);
    items.push({
      p: "P2",
      pc: "warn",
      title: `${c.title} · ${c.booked_count}/${c.capacity}`,
      meta: `Today ${fmtTime(t)} — below 50% threshold`,
      cta: "Promote",
      href: "/schedule/calendar",
    });
  }

  return items.slice(0, 7);
}

/* ─── Activity feed (last 24h from activity_log) ────────────────── */

const ACTIVITY_TYPE_TO_TONE: Record<string, ActivityEntry["tone"]> = {
  booking_created: "pos",
  booking_checked_in: "pos",
  booking_no_show: "warn",
  booking_cancelled: "muted",
  member_created: "pos",
  member_cancelled: "neg",
  payment_completed: "pos",
  payment_failed: "neg",
  payment_refunded: "warn",
  stripe_payment_succeeded: "pos",
  stripe_payment_failed: "neg",
  stripe_subscription_updated: "info",
  stripe_dispute_created: "neg",
  campaign_sent: "info",
  resend_email_sent: "info",
  resend_email_delivered: "info",
  resend_email_opened: "info",
  resend_email_clicked: "pos",
  resend_email_bounced: "warn",
  resend_email_complained: "warn",
  membership_cancelled: "neg",
  glofox_sync_completed: "muted",
};

function describeActivity(
  type: string,
  payload: unknown,
): { what: string; tag: string } {
  // payload is jsonb — defensive: it might be a number, string, array, or object.
  const p = (payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const amountCents = typeof p.amount_cents === "number" ? p.amount_cents : 0;
  const description =
    typeof p.description === "string" ? p.description : type.replace(/_/g, " ");
  switch (type) {
    case "stripe_payment_succeeded":
    case "payment_completed":
      return {
        what: `Payment received · ${description}`,
        tag: amountCents
          ? `+${formatCurrency(amountCents)}`
          : "OK",
      };
    case "stripe_payment_failed":
    case "payment_failed":
      return {
        what: `Payment failed · ${description}`,
        tag: amountCents ? `−${formatCurrency(amountCents)}` : "✕",
      };
    case "payment_refunded":
      return {
        what: `Refund · ${description}`,
        tag: amountCents ? `−${formatCurrency(amountCents)}` : "Refund",
      };
    case "stripe_subscription_updated":
      return { what: "Subscription updated", tag: "Sub" };
    case "stripe_dispute_created":
      return { what: "Chargeback filed", tag: "Dispute" };
    case "campaign_sent":
      return { what: `Sent campaign · ${description}`, tag: "Campaign" };
    case "membership_cancelled":
      return {
        what: "Membership cancelled",
        tag: typeof p.effective_immediately === "boolean" && p.effective_immediately
          ? "Immediate"
          : "End of cycle",
      };
    case "glofox_sync_completed":
      return { what: "Glofox sync completed", tag: "Sync" };
    default:
      return {
        what: type.replace(/_/g, " "),
        tag: typeof p.tag === "string" ? p.tag : "",
      };
  }
}

function formatRelativeTimestamp(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "Just now";
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const ts = new Date(iso);
  if (ts >= todayStart) {
    return ts.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  if (ts >= yesterdayStart) {
    return `Yest ${ts.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }
  return ts.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type ActivityRow = {
  type: string;
  payload: unknown;
  created_at: string;
  actor_id: string | null;
  profiles: { full_name: string | null } | null;
};

export async function loadActivityFeed(): Promise<ActivityEntry[]> {
  const supabase = await createSupabaseServer();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("activity_log")
    .select(
      "type, payload, created_at, actor_id, profiles:actor_id(full_name)",
    )
    .eq("studio_id", STUDIO_ID)
    .gte("created_at", dayAgo)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<ActivityRow[]>();

  const rows = data ?? [];
  if (!rows.length) return ACTIVITY;

  return rows.map((r) => {
    const { what, tag } = describeActivity(r.type, r.payload);
    return {
      t: formatRelativeTimestamp(r.created_at),
      who: r.profiles?.full_name ?? "Meridian",
      what,
      tag,
      tone: ACTIVITY_TYPE_TO_TONE[r.type] ?? "info",
    };
  });
}

/* ─── Weekly review (this week vs prior week) ────────────────────── */

const DAY_MS = 24 * 60 * 60 * 1000;

function pctDelta(current: number, prior: number): {
  delta: string;
  tone: WeekReviewRow["tone"];
} {
  if (prior === 0 && current === 0) return { delta: "+0%", tone: "pos" };
  if (prior === 0) return { delta: "+∞", tone: "pos" };
  const change = ((current - prior) / prior) * 100;
  const formatted = `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
  return { delta: formatted, tone: change >= 0 ? "pos" : "neg" };
}

function pointsDelta(current: number, prior: number): {
  delta: string;
  tone: WeekReviewRow["tone"];
} {
  const change = current - prior;
  return {
    delta: `${change >= 0 ? "+" : ""}${change.toFixed(1)} pts`,
    tone: change >= 0 ? "pos" : "neg",
  };
}

export async function loadWeeklyReview(): Promise<WeekReviewRow[]> {
  const supabase = await createSupabaseServer();
  const now = Date.now();
  const weekStart = new Date(now - 7 * DAY_MS).toISOString();
  const priorWeekStart = new Date(now - 14 * DAY_MS).toISOString();
  const priorWeekEnd = new Date(now - 7 * DAY_MS).toISOString();

  const [thisWeekTxns, priorWeekTxns, thisWeekBookings, priorWeekBookings, thisWeekMembers, priorWeekMembers, thisWeekClasses, priorWeekClasses] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("amount_cents, status")
        .eq("studio_id", STUDIO_ID)
        .eq("status", "completed")
        .gte("occurred_at", weekStart),
      supabase
        .from("transactions")
        .select("amount_cents, status")
        .eq("studio_id", STUDIO_ID)
        .eq("status", "completed")
        .gte("occurred_at", priorWeekStart)
        .lt("occurred_at", priorWeekEnd),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("studio_id", STUDIO_ID)
        .gte("created_at", weekStart),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("studio_id", STUDIO_ID)
        .gte("created_at", priorWeekStart)
        .lt("created_at", priorWeekEnd),
      supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("studio_id", STUDIO_ID)
        .gte("created_at", weekStart),
      supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("studio_id", STUDIO_ID)
        .gte("created_at", priorWeekStart)
        .lt("created_at", priorWeekEnd),
      supabase
        .from("class_instances")
        .select("capacity, booked_count")
        .eq("studio_id", STUDIO_ID)
        .gte("starts_at", weekStart),
      supabase
        .from("class_instances")
        .select("capacity, booked_count")
        .eq("studio_id", STUDIO_ID)
        .gte("starts_at", priorWeekStart)
        .lt("starts_at", priorWeekEnd),
    ]);

  const thisRev =
    (thisWeekTxns.data ?? []).reduce(
      (s, t) => s + (t.amount_cents ?? 0),
      0,
    ) / 100;
  const priorRev =
    (priorWeekTxns.data ?? []).reduce(
      (s, t) => s + (t.amount_cents ?? 0),
      0,
    ) / 100;

  const fillPct = (rows: Array<{ capacity: number | null; booked_count: number | null }> | null) => {
    if (!rows?.length) return 0;
    const cap = rows.reduce((s, r) => s + (r.capacity ?? 0), 0);
    const booked = rows.reduce((s, r) => s + (r.booked_count ?? 0), 0);
    return cap ? (booked / cap) * 100 : 0;
  };

  const thisFill = fillPct(thisWeekClasses.data);
  const priorFill = fillPct(priorWeekClasses.data);

  const thisBookings = thisWeekBookings.count ?? 0;
  const priorBookings = priorWeekBookings.count ?? 0;
  const thisNew = thisWeekMembers.count ?? 0;
  const priorNew = priorWeekMembers.count ?? 0;

  // If there's literally nothing for either week, fall back to the
  // authored fixture so the panel doesn't look broken.
  if (
    thisRev === 0 &&
    priorRev === 0 &&
    thisBookings === 0 &&
    priorBookings === 0 &&
    thisNew === 0 &&
    priorNew === 0
  ) {
    return WEEK_REVIEW;
  }

  const revDelta = pctDelta(thisRev, priorRev);
  const bookDelta = pctDelta(thisBookings, priorBookings);
  const newDelta = pctDelta(thisNew, priorNew);
  const fillDelta = pointsDelta(thisFill, priorFill);

  return [
    {
      label: "Revenue",
      now: `$${thisRev.toFixed(0)}`,
      prior: `$${priorRev.toFixed(0)}`,
      delta: revDelta.delta,
      tone: revDelta.tone,
    },
    {
      label: "Bookings made",
      now: thisBookings.toLocaleString(),
      prior: priorBookings.toLocaleString(),
      delta: bookDelta.delta,
      tone: bookDelta.tone,
    },
    {
      label: "New members",
      now: thisNew.toLocaleString(),
      prior: priorNew.toLocaleString(),
      delta: newDelta.delta,
      tone: newDelta.tone,
    },
    {
      label: "Avg fill",
      now: `${thisFill.toFixed(0)}%`,
      prior: `${priorFill.toFixed(0)}%`,
      delta: fillDelta.delta,
      tone: fillDelta.tone,
    },
  ];
}
