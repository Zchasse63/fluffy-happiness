/*
 * Centralized fixture data — used by the UI until Supabase tables are
 * populated. Each block mirrors the prototype's data.jsx + per-module
 * fixtures, but typed and with comments so the eventual API replacement
 * stays predictable.
 *
 * When the real `/api/*` routes return data, swap callers to fetch from
 * those routes; the shapes here are the contract.
 */

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

export const SEGMENTS = [
  { id: "all-active", name: "All active members", count: 287, description: "Currently paying and not paused.", auto: true },
  { id: "power", name: "Power users", count: 42, description: "4+ bookings in last 14 days.", auto: true },
  { id: "at-risk", name: "Churn risk", count: 23, description: "No booking in 21+ days, was weekly.", auto: true },
  { id: "expiring-credits", name: "Credits expiring 7d", count: 8, description: "Pack expires within a week, has unused credits.", auto: true },
  { id: "lapsed-30", name: "Lapsed 30 days", count: 51, description: "No booking in 30+ days.", auto: true },
  { id: "new-this-month", name: "New this month", count: 14, description: "Joined within the last 30 days.", auto: true },
  { id: "corporate", name: "Corporate accounts", count: 19, description: "Linked to an active corporate account.", auto: true },
  { id: "weekend-only", name: "Weekend warriors", count: 28, description: "≥80% of bookings on Sat/Sun.", auto: false },
];

// ─── Revenue ──────────────────────────────────────────────────────────

export type RevenueKind = "membership" | "class_pack" | "retail" | "gift_card" | "walk_in" | "corporate";

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
