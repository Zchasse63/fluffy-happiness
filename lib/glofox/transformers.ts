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
  return {
    studio_id: studioId,
    glofox_id: c._id,
    title: c.name ?? "Class",
    starts_at: c.starts_at,
    ends_at: c.ends_at,
    capacity: c.capacity,
    booked_count: c.booked_count ?? 0,
    status: (c.status ?? "scheduled") as
      | "scheduled"
      | "live"
      | "completed"
      | "cancelled",
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
      cancelled_at: b.cancelled_at ?? null,
    },
    classGlofoxId: b.class_id,
    memberGlofoxId: b.user_id,
  };
}

function mapBookingStatus(s: GlofoxBooking["status"]) {
  switch (s) {
    case "checked_in":
      return "checked_in";
    case "cancelled":
      return "cancelled";
    case "no_show":
      return "no_show";
    case "waitlisted":
      return "waitlisted";
    case "booked":
    default:
      return "booked";
  }
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
