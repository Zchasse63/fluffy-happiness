/*
 * Glofox → Meridian schema transformers.
 *
 * Pure functions: no DB calls, no FK resolution. The caller upserts
 * profiles first, builds a glofox_id → uuid map, then upserts members
 * with profile_id set from the map (rebuild-handoff §4.3 pattern D).
 */

import type {
  GlofoxBooking,
  GlofoxClass,
  GlofoxLead,
  GlofoxMember,
  GlofoxProgram,
  GlofoxStaff,
  GlofoxTransaction,
} from "./types";

const dollarsToCents = (n: number) => Math.round(n * 100);

export function transformMember(
  m: GlofoxMember,
  studioId: string,
): {
  profile: {
    studio_id: string;
    glofox_id: string;
    email: string | null;
    full_name: string;
    phone: string | null;
    glofox_synced_at: string;
  };
  member: {
    studio_id: string;
    glofox_id: string;
    membership_status: string;
    membership_tier: string | null;
    glofox_synced_at: string;
  };
  profileGlofoxId: string;
} {
  const synced = new Date().toISOString();
  return {
    profile: {
      studio_id: studioId,
      glofox_id: m._id,
      email: m.email ?? null,
      full_name: `${m.first_name} ${m.last_name}`.trim(),
      phone: m.phone ?? null,
      glofox_synced_at: synced,
    },
    member: {
      studio_id: studioId,
      glofox_id: m._id,
      membership_status: m.membership_status ?? "active",
      membership_tier: m.membership_name ?? null,
      glofox_synced_at: synced,
    },
    profileGlofoxId: m._id,
  };
}

export function transformStaff(s: GlofoxStaff, studioId: string) {
  return {
    profile: {
      studio_id: studioId,
      glofox_id: s._id,
      email: s.email ?? null,
      full_name: `${s.first_name} ${s.last_name}`.trim(),
      phone: null,
      roles: s.is_trainer ? ["trainer"] : [s.role ?? "staff"],
      glofox_synced_at: new Date().toISOString(),
    },
    profileGlofoxId: s._id,
    isTrainer: !!s.is_trainer,
  };
}

export function transformProgram(p: GlofoxProgram, studioId: string) {
  return {
    studio_id: studioId,
    glofox_id: p._id,
    name: p.name,
    description: p.description ?? null,
    category: p.category ?? null,
    is_active: p.is_active ?? true,
  };
}

export function transformClassInstance(
  c: GlofoxClass,
  studioId: string,
  programGlofoxId: string | undefined,
  trainerGlofoxId: string | undefined,
) {
  // Glofox returns `time_start` as unix seconds and `duration` as
  // minutes. There's no `ends_at` field — synthesize it. Pre-2026-05-08
  // we read `c.starts_at` (string) which was always undefined; the
  // sync engine then dropped every row at the starts_at-not-null filter.
  const startsMs = (c.time_start ?? 0) * 1000;
  const endsMs = startsMs + (c.duration ?? 60) * 60 * 1000;
  return {
    studio_id: studioId,
    glofox_id: c._id,
    title: c.name ?? "Class",
    starts_at: c.time_start ? new Date(startsMs).toISOString() : null,
    ends_at: c.time_start ? new Date(endsMs).toISOString() : null,
    capacity: c.size,
    booked_count: c.booked ?? 0,
    waitlist_count: c.waiting ?? 0,
    status: normalizeClassStatus(c.status),
    is_one_off: false,
    /** caller resolves these to UUIDs via lookup map */
    programGlofoxId,
    trainerGlofoxId,
  };
}

export function transformBooking(
  b: GlofoxBooking,
  studioId: string,
): {
  row: {
    studio_id: string;
    glofox_id: string;
    status: string;
    source: string;
    glofox_write_status: string;
    glofox_synced_at: string;
    cancelled_at: string | null;
    is_from_waiting_list: boolean;
  };
  classGlofoxId: string;
  memberGlofoxId: string;
} {
  return {
    row: {
      studio_id: studioId,
      glofox_id: b._id,
      status: mapBookingStatus(b.status),
      source: b.source === "classpass" ? "classpass" : "glofox",
      glofox_write_status: "synced",
      glofox_synced_at: new Date().toISOString(),
      // Glofox uses American spelling `canceled_at`; project DB column
      // retains British `cancelled_at`. Date format may be ISO or the
      // legacy "YYYY-MM-DD HH:mm:ss" UTC string.
      cancelled_at: parseGlofoxDate(b.canceled_at ?? null),
      is_from_waiting_list: b.is_from_waiting_list ?? false,
    },
    classGlofoxId: b.event_id,
    memberGlofoxId: b.user_id,
  };
}

/**
 * Glofox booking status enums are uppercase strings; map case-insensitively
 * onto Meridian's lowercase enum. Anything we don't recognize falls back to
 * "booked" so an unfamiliar status never silently becomes "cancelled" — but
 * cases we DO know (check-in, waitlist, no-show, cancellation) have to
 * round-trip cleanly so downstream pages render the right state.
 */
function mapBookingStatus(raw: string | undefined | null) {
  switch ((raw ?? "").toUpperCase()) {
    case "CHECKED_IN":
    case "ATTENDED":
      return "checked_in";
    case "CANCELED":
    case "CANCELLED":
      return "cancelled";
    case "NO_SHOW":
    case "DID_NOT_ATTEND":
      return "no_show";
    case "WAITLIST":
    case "ON_WAITLIST":
    case "WAITING":
      return "waitlisted";
    case "BOOKED":
    case "CONFIRMED":
    default:
      return "booked";
  }
}

/**
 * Glofox class/event status enum is wide and includes rendering-state
 * values like BOOKING_WINDOW_PASSED. Collapse onto the four-state
 * Meridian enum: cancelled, completed, live, scheduled.
 */
function normalizeClassStatus(raw: string | undefined | null):
  | "scheduled"
  | "live"
  | "completed"
  | "cancelled" {
  switch ((raw ?? "").toUpperCase()) {
    case "CANCELED":
    case "CANCELLED":
      return "cancelled";
    case "COMPLETED":
    case "FINISHED":
      return "completed";
    case "LIVE":
    case "IN_PROGRESS":
      return "live";
    case "SCHEDULED":
    case "BOOKING_OPEN":
    case "BOOKING_WINDOW_PASSED":
    case "BOOKING_WINDOW_NOT_OPEN":
    default:
      return "scheduled";
  }
}

/**
 * Glofox emits dates in two flavors depending on endpoint:
 *   - `/Analytics/report` returns ISO strings already (with `Z`).
 *   - `/2.2/.../bookings` returns "YYYY-MM-DD HH:mm:ss" without a
 *     timezone marker (UTC implicit per Glofox docs).
 *
 * The native `Date(...)` parser accepts the second form too, but it
 * interprets it as **local time** — which silently shifts every
 * timestamp by the runtime's offset (e.g. +4h in EDT). To avoid that
 * subtle bug we always pin to UTC first, falling back to the native
 * parser only when the input has an explicit timezone marker (Z or
 * ±HH:MM offset).
 */
const GLOFOX_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;
const HAS_TZ_RE = /[Zz]$|[+-]\d{2}:?\d{2}$/;
export function parseGlofoxDate(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  // Has explicit timezone — let JS parse it.
  if (HAS_TZ_RE.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  // No tz marker. Match the Glofox naive form and pin to UTC.
  const m = raw.match(GLOFOX_DATE_RE);
  if (!m) return null;
  return new Date(
    `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`,
  ).toISOString();
}

export function transformTransaction(
  t: GlofoxTransaction,
  studioId: string,
): {
  row: {
    studio_id: string;
    glofox_id: string;
    type: string;
    status: string;
    amount_cents: number;
    currency: string;
    description: string | null;
    occurred_at: string;
  };
  memberGlofoxId: string | undefined;
  classGlofoxId: string | undefined;
} {
  return {
    row: {
      studio_id: studioId,
      glofox_id: t._id,
      type: mapTransactionType(t.type),
      status: t.status,
      amount_cents: dollarsToCents(t.amount),
      currency: t.currency || "USD",
      description: t.description ?? null,
      occurred_at: t.created_at,
    },
    memberGlofoxId: t.metadata?.user_id,
    classGlofoxId: t.metadata?.class_id,
  };
}

function mapTransactionType(t: string | undefined): string {
  switch (t) {
    case "membership":
    case "subscription":
      return "membership";
    case "credit_pack":
    case "pack":
      return "class_pack";
    case "retail":
    case "product":
      return "retail";
    case "gift_card":
      return "gift_card";
    case "refund":
      return "refund";
    case "corporate":
      return "corporate";
    default:
      return "walk_in";
  }
}

export function transformLead(l: GlofoxLead, studioId: string) {
  return {
    studio_id: studioId,
    glofox_id: l._id,
    email: l.email ?? null,
    phone: l.phone ?? null,
    full_name:
      `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim() || l.email || null,
    source: l.source ?? null,
    status: l.status === "new" ? "new" : l.status,
    score: 0,
  };
}
