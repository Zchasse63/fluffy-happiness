/*
 * Glofox API surface — minimal but complete typing for the entities we
 * actually consume (per rebuild-handoff §4.2). Add fields as you find
 * them in real responses; never silently widen with `any`.
 *
 * Wire format is documented at: https://apidocs-plat.aws.glofox.com/
 */

export type GlofoxBranch = {
  _id: string;
  namespace: string;
  name: string;
  timezone?: string;
};

export type GlofoxMember = {
  _id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  status?: "active" | "inactive";
  membership_status?:
    | "active"
    | "paused"
    | "cancelled"
    | "expired"
    | "trialing";
  membership_name?: string;
  registered_at?: string;
  last_visit_at?: string;
  metadata?: Record<string, unknown>;
};

export type GlofoxStaff = {
  _id: string;
  email?: string;
  first_name: string;
  last_name: string;
  role?: string;
  is_trainer?: boolean;
};

export type GlofoxProgram = {
  _id: string;
  name: string;
  description?: string;
  category?: string;
  is_active?: boolean;
};

// Wire format verified 2026-05-08 against live `/2.0/events`. Glofox emits
// `time_start` as a unix-second integer (not ISO string), `size` not
// `capacity`, `booked` not `booked_count`. There is no `ends_at` — we
// compute it from `time_start + duration*60`. `waiting` is the realtime
// waitlist count; status enum is uppercase Glofox-style.
export type GlofoxClass = {
  _id: string;
  program_id?: string;
  /** Glofox returns trainers as an array; first is the primary. */
  trainers?: string[];
  branch_id: string;
  name?: string;
  /** Unix seconds. */
  time_start: number;
  /** Minutes. */
  duration?: number;
  /** Capacity (Glofox calls it `size`). */
  size: number;
  /** Booked count. */
  booked?: number;
  /** Realtime waitlist count. */
  waiting?: number;
  /** Raw Glofox status (e.g. BOOKING_OPEN, BOOKING_WINDOW_PASSED, IN_PROGRESS, COMPLETED, CANCELED). */
  status?: string;
  active?: boolean;
};

// Wire format verified 2026-05-08 against live
// `/2.2/branches/{branchId}/bookings`. Glofox emits `event_id` (not
// `class_id`), `created` as `"YYYY-MM-DD HH:mm:ss"` (not `created_at`
// ISO), `canceled_at` American spelling (not `cancelled_at`). Status
// is uppercase: BOOKED, CHECKED_IN, CANCELED, NO_SHOW, WAITLIST.
export type GlofoxBooking = {
  _id: string;
  /** The class instance this booking is for. */
  event_id: string;
  user_id: string;
  /** Raw Glofox status — normalized via mapBookingStatus(). */
  status: string;
  source?: string;
  /** "YYYY-MM-DD HH:mm:ss" UTC. Parse via parseGlofoxDate(). */
  created: string;
  modified?: string;
  /** American spelling per Glofox. May be ISO or "YYYY-MM-DD HH:mm:ss". */
  canceled_at?: string | null;
  is_from_waiting_list?: boolean;
  attended?: boolean;
  paid?: boolean;
  payment_method?: string | null;
};

export type GlofoxTransaction = {
  _id: string;
  user_id?: string;
  amount: number; // dollars (Glofox quirk — divide by 1 not 100)
  currency: string;
  status: "completed" | "failed" | "refunded" | "pending";
  type?: string;
  description?: string;
  created_at: string;
  metadata?: { user_id?: string; user_name?: string; class_id?: string };
};

/** Glofox wraps Analytics/report rows in a payment-provider key. */
export type GlofoxTransactionRow = Record<string, GlofoxTransaction>;

export type GlofoxLead = {
  _id: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  source?: string;
  status: "new" | "contacted" | "converted" | "lost";
  created_at: string;
};

// Wire format verified 2026-05-12 against live `/2.0/credits?user_id=…`.
// Each row is one credit pack (4-pack, 10-pack, etc.). A user can have
// multiple active packs; `available` is the realtime remaining count.
export type GlofoxCredit = {
  _id: string;
  user_id: string;
  membership_id: string;
  /** "(Legacy) No Commitment Class Packs", "Sauna Sampler Three-Pack", etc. */
  membership_name: string;
  /** Total sessions in the pack at purchase time. */
  num_sessions: number;
  /** Realtime remaining sessions — source of truth for member balance. */
  available: number;
  active: boolean;
  /** "programs" for class-pack credits, "appointments" for 1:1, etc. */
  model: string;
  /** Booking glofox_ids already used from this pack. */
  bookings?: string[];
  /** Unix seconds. */
  start_date?: number;
  /** Unix seconds. */
  created?: number;
  modified?: number;
};

export type Paged<T> = {
  data: T[];
  has_more?: boolean;
  total_count?: number;
};
