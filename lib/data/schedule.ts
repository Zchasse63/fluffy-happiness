/*
 * Schedule queries — week grid + demand heatmap. Maps live
 * `class_instances` rows to the prototype's `ClassSlot[][]` shape so
 * the calendar page can stay declarative.
 *
 * Glofox class titles are free text ("1 Hour Guided Nordic Sauna +
 * Cold Plunge") rather than the fixed `ClassKind` enum, so a small
 * fuzzy classifier maps them. Anything unrecognised becomes
 * "Open Sauna" (the most common case for The Sauna Guys).
 */

import { STUDIO_ID } from "@/lib/constants";
import {
  KIND_META,
  SCHED_DATES as FIXTURE_DATES,
  SCHED_DAYS,
  WEEK as FIXTURE_WEEK,
  type ClassKind,
  type ClassSlot,
} from "@/lib/fixtures";
import { createSupabaseServer } from "@/lib/supabase/server";

function classifyTitle(raw: string | null): ClassKind {
  const t = (raw ?? "").toLowerCase();
  if (t.includes("cold") && !t.includes("guided")) return "Cold Plunge";
  if (t.includes("guided")) return "Guided Sauna";
  if (t.includes("breath")) return "Breathwork";
  if (t.includes("private")) return "Private";
  return "Open Sauna";
}

function startOfWeek(d: Date): Date {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  // Monday-anchored weeks. JS getDay() is 0=Sun..6=Sat.
  const dow = dt.getDay();
  const offset = (dow + 6) % 7; // 0 if Mon, 6 if Sun
  dt.setDate(dt.getDate() - offset);
  return dt;
}

function fmtTime24(d: Date): string {
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export type WeekGrid = {
  days: typeof SCHED_DAYS;
  dates: string[];
  todayIdx: number;
  week: ClassSlot[][];
};

export async function loadWeekGrid(): Promise<WeekGrid> {
  const supabase = await createSupabaseServer();
  const monday = startOfWeek(new Date());
  const nextMonday = new Date(monday);
  nextMonday.setDate(nextMonday.getDate() + 7);

  const { data } = await supabase
    .from("class_instances")
    .select("id, title, starts_at, ends_at, capacity, booked_count")
    .eq("studio_id", STUDIO_ID)
    .gte("starts_at", monday.toISOString())
    .lt("starts_at", nextMonday.toISOString())
    .order("starts_at");

  const rows = data ?? [];

  if (!rows.length) {
    return {
      days: SCHED_DAYS,
      dates: FIXTURE_DATES,
      todayIdx: ((new Date().getDay() + 6) % 7) as number,
      week: FIXTURE_WEEK,
    };
  }

  const week: ClassSlot[][] = Array.from({ length: 7 }, () => []);

  for (const r of rows) {
    const start = new Date(r.starts_at);
    const dayIndex = (start.getDay() + 6) % 7; // Mon=0..Sun=6
    const kind = classifyTitle(r.title);
    const meta = KIND_META[kind];
    const cap = r.capacity ?? meta.cap;
    const booked = r.booked_count ?? 0;
    const fill = cap ? booked / cap : 0;

    week[dayIndex].push({
      id: r.id,
      time: fmtTime24(start),
      kind,
      trainerId: null, // join with trainers when that table is wired
      booked,
      note:
        fill >= 0.99
          ? "Full"
          : fill < 0.3
            ? "Low"
            : null,
    });
  }

  for (const day of week) {
    day.sort((a, b) => a.time.localeCompare(b.time));
  }

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    dates.push(
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    );
  }

  return {
    days: SCHED_DAYS,
    dates,
    todayIdx: ((new Date().getDay() + 6) % 7) as number,
    week,
  };
}

/* ─── Roster + Waitlist for a single class instance ──────────────── */

export type RosterRow = {
  name: string;
  status: "checked-in" | "booked" | "no-show";
  credits: string;
  lastVisit: string;
  seed: number;
};

export type WaitlistRow = {
  name: string;
  joined: string;
  position: number;
  seed: number;
};

const ROSTER_STATUS_MAP: Record<string, RosterRow["status"]> = {
  checked_in: "checked-in",
  no_show: "no-show",
  booked: "booked",
};

function rosterRelativeTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type RosterQueryRow = {
  status: string;
  members:
    | {
        membership_tier: string | null;
        membership_credits: number | null;
        flex_credits: number | null;
        profiles: { full_name: string | null } | null;
      }
    | null;
};

type WaitlistQueryRow = {
  created_at: string;
  members:
    | {
        profiles: { full_name: string | null } | null;
      }
    | null;
};

export async function loadClassRoster(
  classInstanceId: string,
): Promise<RosterRow[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("bookings")
    .select(
      "status, members!inner(membership_tier, membership_credits, flex_credits, profiles!inner(full_name))",
    )
    .eq("studio_id", STUDIO_ID)
    .eq("class_instance_id", classInstanceId)
    .in("status", ["booked", "checked_in", "no_show"])
    .order("created_at", { ascending: true })
    .limit(50)
    .returns<RosterQueryRow[]>();

  const rows = data ?? [];
  return rows.map((r, i) => {
    const tier = r.members?.membership_tier ?? "Member";
    const credits =
      (r.members?.membership_credits ?? 0) + (r.members?.flex_credits ?? 0);
    return {
      name: r.members?.profiles?.full_name ?? "Member",
      status: ROSTER_STATUS_MAP[r.status] ?? "booked",
      credits: credits > 0 ? `${tier} · ${credits} left` : tier,
      lastVisit: "—",
      seed: i + 1,
    };
  });
}

export async function loadClassWaitlist(
  classInstanceId: string,
): Promise<WaitlistRow[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("bookings")
    .select(
      "created_at, members!inner(profiles!inner(full_name))",
    )
    .eq("studio_id", STUDIO_ID)
    .eq("class_instance_id", classInstanceId)
    .eq("status", "waitlisted")
    .order("created_at", { ascending: true })
    .limit(20)
    .returns<WaitlistQueryRow[]>();

  const rows = data ?? [];
  return rows.map((r, i) => ({
    name: r.members?.profiles?.full_name ?? "Member",
    joined: rosterRelativeTime(r.created_at),
    position: i + 1,
    seed: i + 1,
  }));
}

/* ─── Demand heatmap (4 evening hour buckets × 7 days) ───────────── */

export async function loadDemandHeatmap(
  windowDays = 30,
): Promise<number[][]> {
  const supabase = await createSupabaseServer();
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data } = await supabase
    .from("class_instances")
    .select("starts_at, capacity, booked_count")
    .eq("studio_id", STUDIO_ID)
    .gte("starts_at", since);

  const rows = data ?? [];

  // [day-of-week 0..6][hour-bucket 0..3] = [sumFill, count]
  const buckets: Array<Array<[number, number]>> = Array.from(
    { length: 7 },
    () => Array.from({ length: 4 }, () => [0, 0]),
  );

  for (const r of rows) {
    const cap = r.capacity ?? 0;
    if (!cap) continue;
    const fillPct = Math.min(1, (r.booked_count ?? 0) / cap) * 100;
    const d = new Date(r.starts_at);
    const dow = (d.getDay() + 6) % 7;
    const h = d.getHours();
    let hbucket = -1;
    if (h === 17) hbucket = 0;
    else if (h === 18) hbucket = 1;
    else if (h === 19) hbucket = 2;
    else if (h === 20) hbucket = 3;
    if (hbucket < 0) continue;
    buckets[dow][hbucket][0] += fillPct;
    buckets[dow][hbucket][1] += 1;
  }

  return buckets.map((day) =>
    day.map(([sum, count]) => (count ? Math.round(sum / count) : 0)),
  );
}
