/*
 * Centralized fixture data — used by the UI until Supabase tables are
 * populated. Each block mirrors the prototype's data.jsx + per-module
 * fixtures, but typed and with comments so the eventual API replacement
 * stays predictable.
 *
 * When the real `/api/*` routes return data, swap callers to fetch from
 * those routes; the shapes here are the contract.
 */

import type { Insight, Kpi } from "@/components/primitives";

// ─── Classes / Schedule ────────────────────────────────────────────────

export type ClassKind =
  | "Open Sauna"
  | "Guided Sauna"
  | "Cold Plunge"
  | "Breathwork"
  | "Private";

export type Trainer = { id: string; name: string; seed: number };

export const TRAINERS: Trainer[] = [
  { id: "whitney", name: "Whitney Abrams", seed: 21 },
  { id: "trent", name: "Trent Lott", seed: 44 },
  { id: "ben", name: "Ben Kniesly", seed: 12 },
  { id: "sim", name: "Sim Harmon", seed: 7 },
];

export const KIND_META: Record<
  ClassKind,
  { color: string; soft: string; cap: number; dur: number }
> = {
  "Open Sauna": {
    color: "var(--moss)",
    soft: "var(--moss-soft)",
    cap: 12,
    dur: 50,
  },
  "Guided Sauna": {
    color: "var(--accent)",
    soft: "var(--accent-soft)",
    cap: 10,
    dur: 60,
  },
  "Cold Plunge": {
    color: "var(--cobalt)",
    soft: "var(--cobalt-soft)",
    cap: 6,
    dur: 45,
  },
  Breathwork: {
    color: "var(--teal)",
    soft: "var(--teal-soft)",
    cap: 10,
    dur: 50,
  },
  Private: {
    color: "var(--plum)",
    soft: "var(--plum-soft)",
    cap: 2,
    dur: 60,
  },
};

export type ClassSlot = {
  /** DB id when sourced from `class_instances`; absent for fixture slots. */
  id?: string;
  time: string; // "HH:MM" 24h
  kind: ClassKind;
  trainerId: string | null;
  booked: number;
  note: "Past" | "Live" | "Next" | "Full" | "Low" | null;
};

export const SCHED_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const SCHED_DATES = [
  "Apr 20",
  "Apr 21",
  "Apr 22",
  "Apr 23",
  "Apr 24",
  "Apr 25",
  "Apr 26",
];
export const TODAY_IDX = 1;

export const WEEK: ClassSlot[][] = [
  [
    { time: "06:00", kind: "Open Sauna", trainerId: null, booked: 8, note: null },
    { time: "07:30", kind: "Cold Plunge", trainerId: "ben", booked: 6, note: "Full" },
    { time: "12:00", kind: "Open Sauna", trainerId: null, booked: 4, note: null },
    { time: "17:00", kind: "Open Sauna", trainerId: null, booked: 11, note: null },
    { time: "18:00", kind: "Guided Sauna", trainerId: "trent", booked: 9, note: null },
    { time: "19:00", kind: "Breathwork", trainerId: "whitney", booked: 7, note: null },
  ],
  [
    { time: "06:00", kind: "Open Sauna", trainerId: null, booked: 9, note: "Past" },
    { time: "11:00", kind: "Open Sauna", trainerId: null, booked: 7, note: "Live" },
    { time: "13:00", kind: "Cold Plunge", trainerId: "ben", booked: 4, note: "Next" },
    { time: "15:00", kind: "Open Sauna", trainerId: null, booked: 9, note: null },
    { time: "17:00", kind: "Open Sauna", trainerId: null, booked: 7, note: null },
    { time: "18:00", kind: "Guided Sauna", trainerId: "trent", booked: 6, note: null },
    { time: "19:00", kind: "Guided Sauna", trainerId: "whitney", booked: 2, note: "Low" },
    { time: "20:15", kind: "Cold Plunge", trainerId: "ben", booked: 5, note: null },
  ],
  [
    { time: "06:00", kind: "Open Sauna", trainerId: null, booked: 7, note: null },
    { time: "12:00", kind: "Open Sauna", trainerId: null, booked: 3, note: null },
    { time: "17:00", kind: "Open Sauna", trainerId: null, booked: 10, note: null },
    { time: "18:30", kind: "Guided Sauna", trainerId: "whitney", booked: 8, note: null },
    { time: "19:30", kind: "Breathwork", trainerId: "sim", booked: 6, note: null },
  ],
  [
    { time: "06:00", kind: "Open Sauna", trainerId: null, booked: 11, note: null },
    { time: "07:30", kind: "Cold Plunge", trainerId: "ben", booked: 6, note: "Full" },
    { time: "17:00", kind: "Open Sauna", trainerId: null, booked: 12, note: "Full" },
    { time: "18:00", kind: "Guided Sauna", trainerId: "trent", booked: 10, note: "Full" },
    { time: "19:00", kind: "Guided Sauna", trainerId: "whitney", booked: 9, note: null },
    { time: "20:00", kind: "Cold Plunge", trainerId: "ben", booked: 5, note: null },
  ],
  [
    { time: "06:00", kind: "Open Sauna", trainerId: null, booked: 8, note: null },
    { time: "12:00", kind: "Open Sauna", trainerId: null, booked: 5, note: null },
    { time: "17:00", kind: "Open Sauna", trainerId: null, booked: 9, note: null },
    { time: "18:00", kind: "Breathwork", trainerId: "whitney", booked: 7, note: null },
  ],
  [
    { time: "08:00", kind: "Open Sauna", trainerId: null, booked: 11, note: null },
    { time: "09:30", kind: "Guided Sauna", trainerId: "trent", booked: 10, note: "Full" },
    { time: "11:00", kind: "Cold Plunge", trainerId: "ben", booked: 6, note: "Full" },
    { time: "12:30", kind: "Private", trainerId: "whitney", booked: 2, note: "Full" },
    { time: "15:00", kind: "Open Sauna", trainerId: null, booked: 9, note: null },
    { time: "16:30", kind: "Guided Sauna", trainerId: "sim", booked: 8, note: null },
  ],
  [
    { time: "09:00", kind: "Open Sauna", trainerId: null, booked: 7, note: null },
    { time: "10:30", kind: "Breathwork", trainerId: "whitney", booked: 6, note: null },
    { time: "12:00", kind: "Open Sauna", trainerId: null, booked: 4, note: "Low" },
    { time: "17:00", kind: "Guided Sauna", trainerId: "trent", booked: 5, note: null },
  ],
];

export type RosterEntry = {
  name: string;
  status: "checked-in" | "booked" | "no-show";
  credits: string;
  lastVisit: string;
  seed?: number;
};

export type WaitlistEntry = {
  name: string;
  joined: string;
  position: number;
  seed?: number;
};

export const DEFAULT_ROSTER: RosterEntry[] = [
  { name: "Alex Park", status: "checked-in", credits: "Monthly Unlimited", lastVisit: "2d ago", seed: 12 },
  { name: "Simone Okafor", status: "checked-in", credits: "10-pack · 3 left", lastVisit: "5d ago", seed: 32 },
  { name: "Maya Chen", status: "booked", credits: "10-pack · 7 left", lastVisit: "today", seed: 51 },
  { name: "Ian Delaney", status: "booked", credits: "Monthly Unlimited", lastVisit: "1w ago", seed: 7 },
  { name: "Priya Shah", status: "booked", credits: "Single session", lastVisit: "new", seed: 88 },
  { name: "Daniel Ruiz", status: "booked", credits: "Monthly Unlimited", lastVisit: "3d ago", seed: 63 },
  { name: "Hana Ito", status: "booked", credits: "10-pack · 1 left", lastVisit: "4d ago", seed: 17 },
];

export const DEFAULT_WAITLIST: WaitlistEntry[] = [
  { name: "Noah Weatherly", joined: "2h ago", position: 1, seed: 22 },
  { name: "Leila Banks", joined: "40m ago", position: 2, seed: 41 },
  { name: "Oscar Greene", joined: "15m ago", position: 3, seed: 9 },
];

// 7 days × 4 evening slots demand heatmap (avg fill % over 30 days)
export const DEMAND_HEATMAP: number[][] = [
  // Mon
  [62, 71, 84, 73],
  // Tue
  [54, 88, 94, 81],
  // Wed
  [71, 79, 73, 67],
  // Thu
  [82, 91, 95, 87],
  // Fri
  [58, 73, 79, 65],
  // Sat
  [88, 92, 78, 61],
  // Sun
  [44, 58, 67, 49],
];

// ─── Members ───────────────────────────────────────────────────────────

export type EngagementBadge =
  | "Power"
  | "Active"
  | "Engaged"
  | "Cooling"
  | "At risk"
  | "New"
  | "Lapsed";

export type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: "Monthly Unlimited" | "10-pack" | "Single session" | "Annual";
  status: "active" | "paused" | "cancelled" | "trialing";
  engagement: EngagementBadge;
  credits: number;
  walletCents: number;
  ltv: number;
  lastVisit: string;
  joined: string;
  seed: number;
  strikes: number;
  promoCode?: string;
};

export const MEMBERS: Member[] = [
  { id: "m1", name: "Alex Park", email: "alex@example.com", phone: "(813) 555-0142", tier: "Monthly Unlimited", status: "active", engagement: "Power", credits: 4, walletCents: 0, ltv: 1845, lastVisit: "2 days ago", joined: "Jan 4, 2025", seed: 12, strikes: 0 },
  { id: "m2", name: "Sim Harmon", email: "sim@example.com", phone: "(813) 555-0107", tier: "10-pack", status: "active", engagement: "Active", credits: 3, walletCents: 0, ltv: 660, lastVisit: "5 days ago", joined: "Mar 11, 2025", seed: 7, strikes: 0 },
  { id: "m3", name: "Whitney Abrams", email: "whitney@example.com", phone: "(813) 555-0188", tier: "Annual", status: "active", engagement: "Power", credits: 999, walletCents: 0, ltv: 2400, lastVisit: "today", joined: "Aug 22, 2024", seed: 21, strikes: 0 },
  { id: "m4", name: "Ben Kniesly", email: "ben@example.com", phone: "(813) 555-0166", tier: "Monthly Unlimited", status: "paused", engagement: "At risk", credits: 0, walletCents: 0, ltv: 1115, lastVisit: "23 days ago", joined: "Jun 1, 2025", seed: 12, strikes: 1 },
  { id: "m5", name: "Maya Chen", email: "maya@example.com", phone: "(813) 555-0119", tier: "10-pack", status: "active", engagement: "Engaged", credits: 7, walletCents: 1500, ltv: 480, lastVisit: "1 day ago", joined: "Apr 2, 2026", seed: 51, strikes: 0 },
  { id: "m6", name: "Ian Delaney", email: "ian@example.com", phone: "(813) 555-0102", tier: "Monthly Unlimited", status: "active", engagement: "Cooling", credits: 0, walletCents: 0, ltv: 1995, lastVisit: "11 days ago", joined: "Sep 18, 2024", seed: 65, strikes: 0 },
  { id: "m7", name: "Priya Shah", email: "priya@example.com", phone: "(813) 555-0115", tier: "Single session", status: "trialing", engagement: "New", credits: 1, walletCents: 0, ltv: 28, lastVisit: "new", joined: "Apr 19, 2026", seed: 88, strikes: 0 },
  { id: "m8", name: "Trent Lott", email: "trent@example.com", phone: "(813) 555-0190", tier: "10-pack", status: "active", engagement: "Active", credits: 0, walletCents: 0, ltv: 720, lastVisit: "today", joined: "Feb 17, 2025", seed: 44, strikes: 0 },
  { id: "m9", name: "Dana Ortiz", email: "dana@example.com", phone: "(813) 555-0140", tier: "Monthly Unlimited", status: "active", engagement: "At risk", credits: 0, walletCents: 0, ltv: 1140, lastVisit: "21 days ago", joined: "Mar 7, 2025", seed: 33, strikes: 2 },
  { id: "m10", name: "Hana Ito", email: "hana@example.com", phone: "(813) 555-0192", tier: "10-pack", status: "active", engagement: "Engaged", credits: 1, walletCents: 0, ltv: 360, lastVisit: "4 days ago", joined: "Nov 2, 2025", seed: 17, strikes: 0 },
  { id: "m11", name: "Daniel Ruiz", email: "daniel@example.com", phone: "(813) 555-0104", tier: "Monthly Unlimited", status: "active", engagement: "Active", credits: 0, walletCents: 0, ltv: 1320, lastVisit: "3 days ago", joined: "Oct 9, 2024", seed: 63, strikes: 0 },
  { id: "m12", name: "Simone Okafor", email: "simone@example.com", phone: "(813) 555-0123", tier: "10-pack", status: "active", engagement: "Active", credits: 3, walletCents: 0, ltv: 540, lastVisit: "5 days ago", joined: "May 14, 2025", seed: 32, strikes: 0 },
  { id: "m13", name: "Noah Weatherly", email: "noah@example.com", phone: "(813) 555-0181", tier: "Single session", status: "trialing", engagement: "New", credits: 0, walletCents: 0, ltv: 28, lastVisit: "today", joined: "Apr 21, 2026", seed: 22, strikes: 0 },
  { id: "m14", name: "Leila Banks", email: "leila@example.com", phone: "(813) 555-0177", tier: "Monthly Unlimited", status: "active", engagement: "Power", credits: 0, walletCents: 0, ltv: 2010, lastVisit: "today", joined: "Aug 1, 2024", seed: 41, strikes: 0 },
];

export const ENGAGEMENT_TONE: Record<
  EngagementBadge,
  { fg: string; soft: string }
> = {
  Power: { fg: "var(--accent-deep)", soft: "var(--accent-soft)" },
  Active: { fg: "var(--moss)", soft: "var(--moss-soft)" },
  Engaged: { fg: "var(--teal)", soft: "var(--teal-soft)" },
  Cooling: { fg: "var(--warn)", soft: "var(--warn-soft)" },
  "At risk": { fg: "var(--neg)", soft: "var(--neg-soft)" },
  New: { fg: "var(--cobalt)", soft: "var(--cobalt-soft)" },
  Lapsed: { fg: "var(--text-3)", soft: "var(--surface-3)" },
};

/**
 * Behavioral segments — definitions live in
 * `supabase/migrations/0019_people_and_segments.sql` (the
 * `segment_assignments` view's CROSS JOIN LATERAL VALUES). UI metadata
 * here: display name, one-sentence "what's actionable", priority for
 * outreach, and the demo count rendered under TEST_AUTH_BYPASS.
 *
 * IMPORTANT: GloFox treats every signup as a "lead" regardless of
 * whether they later became a paying member. Membership ≠ credits — a
 * person can have credits without an active recurring membership. The
 * "Active recurring" vs "Active by attendance" split reflects that.
 */
export type SegmentMeta = {
  id: string;
  name: string;
  count: number;
  description: string;
  /** P0 = call today; P1 = email this week; P2 = batch nurture. */
  priority: "P0" | "P1" | "P2";
  auto: true;
};

export const SEGMENTS: SegmentMeta[] = [
  // Most actionable first.
  { id: "hooked-urgent",       name: "Hooked — urgent",       count: 5,   description: "5+ visits in last 21 days, not on recurring. Highest conversion likelihood — offer a 10% off membership today.", priority: "P0", auto: true },
  { id: "hooked-candidate",    name: "Hooked — candidate",    count: 12,  description: "4+ visits in last 30 days, not on recurring. Soft membership nudge.",                                            priority: "P0", auto: true },
  { id: "trial-in-flight",     name: "Trial in flight",       count: 18,  description: "On a 2-week trial, last 21 days. Hand-deliver the conversion ask before it ends.",                              priority: "P1", auto: true },
  { id: "new-face",            name: "New face, not converted", count: 47, description: "First-ever visit in last 30 days, no membership purchased. The biggest source of new MRR.",                  priority: "P1", auto: true },
  { id: "trial-lapsed",        name: "Trial lapsed",          count: 23,  description: "Bought a trial, no purchase since 30+ days. Re-engage before the relationship goes cold.",                      priority: "P1", auto: true },
  { id: "cooling",             name: "Cooling",               count: 14,  description: "Was attending regularly (4+ in 60d), zero visits in last 21 days. Catch them before churn.",                    priority: "P1", auto: true },
  { id: "stale-credits",       name: "Stale credits",         count: 87,  description: "Has unused credits AND no visit in 60 days. We owe them sessions — gentle nudge in.",                            priority: "P1", auto: true },
  { id: "cancelled-recurring", name: "Cancelled recurring",   count: 31,  description: "Was on a recurring plan, cancelled. Past loyal — surface the new memberships.",                                  priority: "P2", auto: true },
  { id: "active-recurring",    name: "Active recurring",      count: 162, description: "Current recurring membership (Monthly Unlimited / Monthly / Annual).",                                            priority: "P2", auto: true },
  { id: "active-attendance",   name: "Active by attendance",  count: 45,  description: "No recurring, but bought + attended ≥4× in last 60 days. Treat as active for retention.",                          priority: "P2", auto: true },
  { id: "trial-graduated",     name: "Trial graduated",       count: 9,   description: "Bought a trial AND converted to recurring or pack. Track conversion-rate health.",                               priority: "P2", auto: true },
  { id: "drop-in-only",        name: "Drop-in only",          count: 41,  description: "Only one-time drop-ins, no recurring or pack. Steady but limited.",                                              priority: "P2", auto: true },
  { id: "cold-lead",           name: "Cold lead",             count: 184, description: "Registered, never booked, never purchased. Includes the waiver-only signups that never made it onto a schedule.", priority: "P2", auto: true },
];

// ─── Revenue ──────────────────────────────────────────────────────────

export type RevenueKind = "membership" | "class_pack" | "retail" | "gift_card" | "walk_in" | "corporate";

export const TRANSACTION_KIND_META: Record<
  RevenueKind,
  { fg: string; soft: string; label: string }
> = {
  membership: { fg: "var(--accent-deep)", soft: "var(--accent-soft)", label: "Membership" },
  class_pack: { fg: "var(--teal)", soft: "var(--teal-soft)", label: "Pack" },
  retail: { fg: "var(--cobalt)", soft: "var(--cobalt-soft)", label: "Retail" },
  gift_card: { fg: "var(--gold)", soft: "var(--gold-soft)", label: "Gift card" },
  walk_in: { fg: "var(--moss)", soft: "var(--moss-soft)", label: "Walk-in" },
  corporate: { fg: "var(--plum)", soft: "var(--plum-soft)", label: "Corporate" },
};

export type Transaction = {
  id: string;
  occurred: string;
  member: string;
  kind: RevenueKind;
  description: string;
  amountCents: number;
  status: "completed" | "refunded" | "failed" | "pending";
  card?: string;
  seed?: number;
};

export const TRANSACTIONS: Transaction[] = [
  { id: "tx_1801", occurred: "10:42 AM", member: "Alex Park", kind: "membership", description: "Monthly Unlimited · renewal", amountCents: 22500, status: "completed", card: "Visa •• 4242", seed: 12 },
  { id: "tx_1800", occurred: "10:18 AM", member: "Maya Chen", kind: "class_pack", description: "10-pack credits", amountCents: 16500, status: "completed", card: "Mastercard •• 8821", seed: 51 },
  { id: "tx_1799", occurred: "9:47 AM", member: "Ben Kniesly", kind: "membership", description: "Monthly Unlimited · failed retry", amountCents: 8500, status: "failed", card: "Visa •• 1145", seed: 12 },
  { id: "tx_1798", occurred: "9:30 AM", member: "Priya Shah", kind: "walk_in", description: "Single session", amountCents: 2800, status: "completed", card: "Apple Pay", seed: 88 },
  { id: "tx_1797", occurred: "Yest 7:14 PM", member: "Cigar City Co.", kind: "corporate", description: "Apr 25 group event refund", amountCents: -48000, status: "refunded", card: "ACH", seed: 90 },
  { id: "tx_1796", occurred: "Yest 4:02 PM", member: "Whitney Abrams", kind: "retail", description: "Sauna towel + sweat brush", amountCents: 5400, status: "completed", card: "Visa •• 9912", seed: 21 },
  { id: "tx_1795", occurred: "Yest 11:18 AM", member: "Daniel Ruiz", kind: "gift_card", description: "Gift card · $100", amountCents: 10000, status: "completed", card: "Visa •• 1188", seed: 63 },
  { id: "tx_1794", occurred: "Apr 19", member: "Ian Delaney", kind: "membership", description: "Monthly Unlimited · renewal", amountCents: 22500, status: "completed", card: "Visa •• 7711", seed: 65 },
  { id: "tx_1793", occurred: "Apr 19", member: "Hana Ito", kind: "class_pack", description: "10-pack credits", amountCents: 16500, status: "completed", card: "Mastercard •• 4408", seed: 17 },
  { id: "tx_1792", occurred: "Apr 18", member: "Simone Okafor", kind: "membership", description: "Monthly Unlimited · renewal", amountCents: 22500, status: "completed", card: "Visa •• 4242", seed: 32 },
];

export type MembershipPlan = {
  id: string;
  name: string;
  tier: string;
  priceCents: number;
  active: number;
  mrrCents: number;
  creditsPerCycle: number | null;
  guests: number;
  legacy?: boolean;
};

export const PLANS: MembershipPlan[] = [
  { id: "p1", name: "Monthly Unlimited", tier: "Unlimited", priceCents: 22500, active: 162, mrrCents: 22500 * 162, creditsPerCycle: null, guests: 2 },
  { id: "p2", name: "Annual Unlimited", tier: "Unlimited", priceCents: 200000, active: 28, mrrCents: Math.round(200000 / 12) * 28, creditsPerCycle: null, guests: 4 },
  { id: "p3", name: "10-Pack", tier: "Pack", priceCents: 16500, active: 84, mrrCents: 16500 * 84, creditsPerCycle: 10, guests: 0 },
  { id: "p4", name: "Single session", tier: "Drop-in", priceCents: 2800, active: 14, mrrCents: 2800 * 14, creditsPerCycle: 1, guests: 0 },
  { id: "p5", name: "Founders rate · 2024", tier: "Legacy", priceCents: 19500, active: 11, mrrCents: 19500 * 11, creditsPerCycle: null, guests: 2, legacy: true },
];

export type DunningRecord = {
  id: string;
  member: string;
  plan: string;
  amountCents: number;
  reason: string;
  attempts: number;
  nextRetry: string;
  seed?: number;
};

export const DUNNING: DunningRecord[] = [
  { id: "d1", member: "Ben Kniesly", plan: "Monthly Unlimited", amountCents: 22500, reason: "Card expired", attempts: 2, nextRetry: "Tomorrow 8 AM", seed: 12 },
  { id: "d2", member: "Trent Lott", plan: "10-Pack", amountCents: 16500, reason: "Insufficient funds", attempts: 1, nextRetry: "Apr 24", seed: 44 },
  { id: "d3", member: "Dana Ortiz", plan: "Monthly Unlimited", amountCents: 22500, reason: "Chargeback filed", attempts: 0, nextRetry: "Respond by Apr 24", seed: 33 },
];

// ─── Marketing / Leads ────────────────────────────────────────────────

export type LeadStatus = "New" | "Contacted" | "Trial" | "Converted" | "Lost";

export type Lead = {
  id: string;
  name: string;
  email: string;
  source: string;
  score: number;
  status: LeadStatus;
  lastTouch: string;
  assignedTo?: string;
  seed?: number;
};

export const LEADS: Lead[] = [
  { id: "l1", name: "Carter Hill", email: "carter@example.com", source: "Instagram", score: 78, status: "New", lastTouch: "2h ago", seed: 14 },
  { id: "l2", name: "Eve Sandoval", email: "eve@example.com", source: "Referral", score: 88, status: "New", lastTouch: "1d ago", seed: 27 },
  { id: "l3", name: "Mateo Cruz", email: "mateo@example.com", source: "Google", score: 65, status: "Contacted", lastTouch: "3d ago", assignedTo: "Whitney", seed: 19 },
  { id: "l4", name: "Iris Hoang", email: "iris@example.com", source: "Walk-in", score: 72, status: "Contacted", lastTouch: "2d ago", assignedTo: "Trent", seed: 56 },
  { id: "l5", name: "Sam Pellegrini", email: "sam@example.com", source: "ClassPass", score: 91, status: "Trial", lastTouch: "today", assignedTo: "Whitney", seed: 73 },
  { id: "l6", name: "Theo Park", email: "theo@example.com", source: "Instagram", score: 84, status: "Trial", lastTouch: "today", assignedTo: "Trent", seed: 88 },
  { id: "l7", name: "Lucia Marin", email: "lucia@example.com", source: "Referral", score: 95, status: "Converted", lastTouch: "Apr 18", assignedTo: "Whitney", seed: 11 },
  { id: "l8", name: "Owen Reilly", email: "owen@example.com", source: "Google", score: 22, status: "Lost", lastTouch: "Apr 12", seed: 60 },
];

export type Campaign = {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "paused";
  channel: "email" | "sms" | "both";
  segment: string;
  recipients: number;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  scheduledFor?: string;
  sentAt?: string;
};

export const CAMPAIGNS: Campaign[] = [
  { id: "c1", name: "Weekend Warriors · April", status: "sent", channel: "email", segment: "weekend-only", recipients: 28, sent: 28, opened: 22, clicked: 9, converted: 4, sentAt: "Apr 20 · 9:30 AM" },
  { id: "c2", name: "Win-back · 30-day lapse", status: "sending", channel: "email", segment: "lapsed-30", recipients: 51, sent: 23, opened: 14, clicked: 5, converted: 1 },
  { id: "c3", name: "Credit expiry reminder", status: "scheduled", channel: "both", segment: "expiring-credits", recipients: 8, sent: 0, opened: 0, clicked: 0, converted: 0, scheduledFor: "Apr 22 · 11:30 AM" },
  { id: "c4", name: "Trial day-3 nudge", status: "sent", channel: "email", segment: "trial-day-3", recipients: 14, sent: 14, opened: 11, clicked: 6, converted: 3, sentAt: "Apr 19 · 10:00 AM" },
  { id: "c5", name: "Mother's Day gift cards", status: "draft", channel: "email", segment: "all-active", recipients: 287, sent: 0, opened: 0, clicked: 0, converted: 0 },
];

export type Automation = {
  id: string;
  name: string;
  trigger: string;
  steps: number;
  enrolled: number;
  active: number;
  status: "active" | "paused";
};

export const AUTOMATIONS: Automation[] = [
  { id: "a1", name: "Welcome series", trigger: "signup", steps: 4, enrolled: 412, active: 18, status: "active" },
  { id: "a2", name: "Win-back · 21d lapse", trigger: "inactivity", steps: 3, enrolled: 119, active: 23, status: "active" },
  { id: "a3", name: "Birthday celebration", trigger: "birthday", steps: 2, enrolled: 287, active: 4, status: "active" },
  { id: "a4", name: "Credit expiry · 7-day", trigger: "credit_expiry", steps: 2, enrolled: 64, active: 8, status: "active" },
  { id: "a5", name: "Failed payment recovery", trigger: "failed_payment", steps: 4, enrolled: 14, active: 3, status: "active" },
  { id: "a6", name: "First-class follow-up", trigger: "no_show", steps: 2, enrolled: 5, active: 2, status: "paused" },
];

// ─── Command Center ────────────────────────────────────────────────────

export const COMMAND_INSIGHTS: Insight[] = [
  {
    rank: "P1",
    tone: "neg",
    kicker: "Class below threshold",
    headline: "Whitney's 7 PM Guided is at 2/10.",
    data: [
      ["Booked", "2"],
      ["Waitlist", "0"],
      ["Last week", "9/10"],
    ],
    body:
      "Evening Guided usually fills by Monday. Two canceled on Sunday without rebooking — likely the weather flip.",
    action: "Open class details",
    altAction: "Notify Wed regulars",
    href: "/schedule/calendar",
  },
  {
    rank: "P2",
    tone: "warn",
    kicker: "Credits expiring",
    headline: "4 members have credit packs expiring this week.",
    data: [
      ["Unused credits", "11"],
      ["At-risk MRR", "$560"],
      ["Conversion when reminded", "58%"],
    ],
    body:
      "Alex Park (4), Sim Harmon (3), Ben Kniesly (2), Whitney regulars (2) — all expire by Sunday.",
    action: "Send expiry campaign",
    altAction: "Offer 2-wk extension",
    href: "/marketing/campaigns",
  },
  {
    rank: "P3",
    tone: "info",
    kicker: "Revenue anomaly",
    headline: "Monday revenue was $178 — down 34% vs last Monday.",
    data: [
      ["Yesterday", "$178"],
      ["Prior Mon", "$269"],
      ["Trend", "↓ 3rd dip"],
    ],
    body:
      "Driven by one canceled corporate booking (Cigar City). Not a pattern yet, but the 3rd Monday dip in a row.",
    action: "Open analytics",
    altAction: "Dismiss",
    href: "/analytics",
  },
];

export const COMMAND_KPIS: Kpi[] = [
  {
    label: "Revenue · today",
    value: "$234",
    delta: "+12.0%",
    foot: "vs last Tue",
    dot: "var(--accent)",
    spark: [120, 180, 95, 220, 140, 260, 234],
  },
  {
    label: "Bookings",
    value: "27",
    delta: "+4",
    foot: "6 still open",
    dot: "var(--teal)",
    spark: [18, 22, 19, 24, 21, 26, 27],
  },
  {
    label: "Walk-ins",
    value: "2",
    delta: "±0",
    foot: "rolling 7d",
    dot: "var(--cobalt)",
    spark: [1, 3, 2, 2, 4, 2, 2],
  },
  {
    label: "No-shows",
    value: "1",
    delta: "-2",
    foot: "Sim Harmon 5p",
    dot: "var(--plum)",
    spark: [2, 3, 1, 2, 3, 1, 1],
  },
  {
    label: "Attendance rate",
    value: "94%",
    delta: "+3.1%",
    foot: "last 30 days",
    dot: "var(--moss)",
    spark: [88, 90, 89, 92, 91, 93, 94],
  },
];

export type FocusItemFixture = {
  p: "P1" | "P2" | "P3";
  pc: "neg" | "warn" | "info";
  title: string;
  meta: string;
  cta: string;
  href: string;
};

export const FOCUS_QUEUE: FocusItemFixture[] = [
  {
    p: "P1",
    pc: "neg",
    title: "Failed payment · Ben Kniesly",
    meta: "Card expired 04/2026 · $85 / Monthly Unlimited",
    cta: "Retry",
    href: "/revenue/dunning",
  },
  {
    p: "P1",
    pc: "neg",
    title: "Failed payment · Trent Lott",
    meta: "Insufficient funds · $165 / 10-pack",
    cta: "Retry",
    href: "/revenue/dunning",
  },
  {
    p: "P1",
    pc: "neg",
    title: "Chargeback filed · Dana Ortiz",
    meta: "Respond by Apr 24 · Stripe dispute #d_1a2",
    cta: "Respond",
    href: "/revenue/transactions",
  },
  {
    p: "P2",
    pc: "warn",
    title: "Whitney's 7 PM Guided — 2/10",
    meta: "Cancel, promote, or swap trainer",
    cta: "Promote",
    href: "/schedule/calendar",
  },
  {
    p: "P2",
    pc: "warn",
    title: "Credits expiring · 4 members",
    meta: "11 credits · $560 at-risk MRR",
    cta: "Remind",
    href: "/marketing/campaigns",
  },
  {
    p: "P3",
    pc: "info",
    title: "Lead follow-ups · 3 stale",
    meta: "No touch in 5+ days · avg score 72",
    cta: "Review",
    href: "/marketing/leads",
  },
  {
    p: "P3",
    pc: "info",
    title: "Waiver expired · Maya Chen",
    meta: "Signed Apr 2025 · next class Fri",
    cta: "Re-send",
    href: "/operations/waivers",
  },
];

export type TodaySlotFixture = {
  time: string;
  dur: string;
  kind: string;
  trainer: string;
  cap: string;
  fill: number;
  tone: "ok" | "mid" | "low";
  state: "live" | "next" | "" | "!";
};

export const TODAY_SCHEDULE: TodaySlotFixture[] = [
  { time: "11:00 AM", dur: "50m", kind: "Open Sauna", trainer: "—", cap: "7/12", fill: 58, tone: "ok", state: "live" },
  { time: "1:00 PM", dur: "50m", kind: "Cold Plunge", trainer: "Ben Kniesly", cap: "4/6", fill: 67, tone: "ok", state: "next" },
  { time: "3:00 PM", dur: "50m", kind: "Open Sauna", trainer: "—", cap: "9/12", fill: 75, tone: "ok", state: "" },
  { time: "5:00 PM", dur: "50m", kind: "Open Sauna", trainer: "—", cap: "7/12", fill: 58, tone: "ok", state: "" },
  { time: "6:00 PM", dur: "50m", kind: "Guided Sauna", trainer: "Trent Lott", cap: "6/10", fill: 60, tone: "mid", state: "" },
  { time: "7:00 PM", dur: "60m", kind: "Guided Sauna", trainer: "Whitney Abrams", cap: "2/10", fill: 20, tone: "low", state: "!" },
  { time: "8:15 PM", dur: "45m", kind: "Cold Plunge", trainer: "Ben Kniesly", cap: "5/6", fill: 83, tone: "ok", state: "" },
];

export type ActivityEntry = {
  t: string;
  who: string;
  what: string;
  tag: string;
  tone: "pos" | "neg" | "warn" | "info" | "muted";
};

export const ACTIVITY: ActivityEntry[] = [
  { t: "10:38 AM", who: "Alex Park", what: "Booked 6 PM Guided Sauna", tag: "+1", tone: "pos" },
  { t: "10:12 AM", who: "Sim Harmon", what: "Checked in · 11 AM Open", tag: "In", tone: "pos" },
  { t: "09:47 AM", who: "Ben Kniesly", what: "Payment failed · Monthly Unlimited", tag: "−$85", tone: "neg" },
  { t: "09:30 AM", who: "Meridian", what: "Sent “Weekend Warriors” campaign", tag: "94%", tone: "info" },
  { t: "08:55 AM", who: "Maya Chen", what: "Purchased 10-pack credit", tag: "+$165", tone: "pos" },
  { t: "08:02 AM", who: "Whitney Abrams", what: "Clocked in", tag: "Staff", tone: "muted" },
  { t: "Yest 9 PM", who: "Dana Ortiz", what: "No-show · 8 PM Cold Plunge", tag: "Strike", tone: "warn" },
  { t: "Yest 7 PM", who: "Cigar City Co.", what: "Canceled corporate event (Apr 25)", tag: "−$480", tone: "neg" },
];

/** Stable count export so e2e tests can pin to fixture size without
 *  importing the array shape (BUG-007 cleanup). */
export const ACTIVITY_FIXTURE_COUNT = ACTIVITY.length;

export const ACTIVITY_TONE_TO_COLOR: Record<ActivityEntry["tone"], string> = {
  pos: "var(--pos)",
  neg: "var(--neg)",
  warn: "var(--warn)",
  info: "var(--cobalt)",
  muted: "var(--text-3)",
};

export type WeekReviewRow = {
  label: string;
  now: string;
  prior: string;
  delta: string;
  tone: "pos" | "neg";
};

export const WEEK_REVIEW: WeekReviewRow[] = [
  { label: "Revenue", now: "$412", prior: "$368", delta: "+12.0%", tone: "pos" },
  { label: "Classes booked", now: "44", prior: "41", delta: "+7.3%", tone: "pos" },
  { label: "New members", now: "3", prior: "5", delta: "-40.0%", tone: "neg" },
  { label: "Credits used", now: "38", prior: "34", delta: "+11.8%", tone: "pos" },
  { label: "Avg fill", now: "71%", prior: "68%", delta: "+3.0 pts", tone: "pos" },
  { label: "Trainer hours", now: "12.5", prior: "12.0", delta: "+4.2%", tone: "pos" },
];

// ─── Member Profile ───────────────────────────────────────────────────

export type MemberProfileTab =
  | "overview"
  | "bookings"
  | "payments"
  | "activity"
  | "wellness"
  | "notes";

export const MEMBER_PROFILE_TABS: MemberProfileTab[] = [
  "overview",
  "bookings",
  "payments",
  "activity",
  "wellness",
  "notes",
];

export type MemberProfileBookingRow = {
  time: string;
  kind: string;
  trainer: string;
  status: "booked" | "checked-in" | "no-show";
};

export const MEMBER_PROFILE_BOOKINGS: MemberProfileBookingRow[] = [
  { time: "Today · 6 PM", kind: "Guided Sauna", trainer: "Trent Lott", status: "booked" },
  { time: "Apr 19 · 5 PM", kind: "Open Sauna", trainer: "—", status: "checked-in" },
  { time: "Apr 17 · 7 PM", kind: "Guided Sauna", trainer: "Whitney Abrams", status: "checked-in" },
  { time: "Apr 14 · 6 PM", kind: "Open Sauna", trainer: "—", status: "no-show" },
  { time: "Apr 12 · 8 PM", kind: "Cold Plunge", trainer: "Ben Kniesly", status: "checked-in" },
];

export type MemberProfileAiSignal = {
  tone: string;
  soft: string;
  label: string;
  body: string;
};

export const MEMBER_PROFILE_AI_SIGNALS: MemberProfileAiSignal[] = [
  {
    tone: "var(--pos)",
    soft: "var(--pos-soft)",
    label: "Visit streak",
    body: "6 weeks · personal record territory",
  },
  {
    tone: "var(--warn)",
    soft: "var(--warn-soft)",
    label: "Credit expiry",
    body: "0 credits in pack — eligible for top-up nudge",
  },
  {
    tone: "var(--cobalt)",
    soft: "var(--cobalt-soft)",
    label: "Pattern",
    body: "Books Tue + Thu evenings — strongly attached to Whitney's class",
  },
];
