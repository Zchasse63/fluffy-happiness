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

export type GlofoxClass = {
  _id: string;
  program_id?: string;
  trainer_id?: string;
  branch_id: string;
  name?: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  booked_count?: number;
  status?: "scheduled" | "live" | "completed" | "cancelled";
};

export type GlofoxBooking = {
  _id: string;
  class_id: string;
  user_id: string;
  status: "booked" | "checked_in" | "cancelled" | "no_show" | "waitlisted";
  source?: string;
  created_at: string;
  cancelled_at?: string;
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

export type Paged<T> = {
  data: T[];
  has_more?: boolean;
  total_count?: number;
};
