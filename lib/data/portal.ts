/*
 * Employee portal data — for the logged-in trainer or staff member,
 * pulls today's classes (if they're a trainer), recent pay periods,
 * and recent activity_log entries authored by them.
 */

import { STUDIO_ID } from "@/lib/constants";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { AuthProfile } from "@/lib/auth";

const DAY_MS = 24 * 60 * 60 * 1000;

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function fmtDayDelta(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "Just now";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ts = new Date(iso);
  if (ts >= today) return ts.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (ms < 2 * DAY_MS) return "Yesterday";
  return ts.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export type TodayClass = {
  id: string;
  time: string;
  title: string;
  capacity: number;
  bookedCount: number;
  belowThreshold: boolean;
};

export type ActivityItem = {
  t: string;
  what: string;
  who: string;
};

export type PortalView = {
  firstName: string;
  isTrainer: boolean;
  todayClasses: TodayClass[];
  recentActivity: ActivityItem[];
};

export async function loadPortal(profile: AuthProfile): Promise<PortalView> {
  const supabase = await createSupabaseServer();
  const firstName = profile.full_name?.split(" ")[0] ?? "there";

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("studio_id", profile.studio_id)
    .eq("profile_id", profile.id)
    .maybeSingle();

  const isTrainer = Boolean(trainer);

  let todayClasses: TodayClass[] = [];
  if (trainer) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const { data: instances } = await supabase
      .from("class_instances")
      .select("id, title, starts_at, capacity, booked_count")
      .eq("studio_id", profile.studio_id)
      .eq("trainer_id", trainer.id)
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .order("starts_at");

    todayClasses = (instances ?? []).map((c) => {
      const fill = c.capacity ? c.booked_count / c.capacity : 0;
      return {
        id: c.id,
        time: fmtTime(new Date(c.starts_at)),
        title: c.title ?? "Class",
        capacity: c.capacity ?? 0,
        bookedCount: c.booked_count ?? 0,
        belowThreshold: fill < 0.5,
      };
    });
  }

  // Activity actored by the current profile in the last 14 days.
  const since = new Date(Date.now() - 14 * DAY_MS).toISOString();
  const { data: activity } = await supabase
    .from("activity_log")
    .select("type, payload, created_at")
    .eq("studio_id", profile.studio_id)
    .eq("actor_id", profile.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(8);

  const recentActivity: ActivityItem[] = (activity ?? []).map((r) => {
    const p = r.payload && typeof r.payload === "object" && !Array.isArray(r.payload)
      ? (r.payload as Record<string, unknown>)
      : ({} as Record<string, unknown>);
    const description = typeof p.description === "string" ? p.description : r.type.replace(/_/g, " ");
    return {
      t: fmtDayDelta(r.created_at),
      what: description,
      who: "You",
    };
  });

  return { firstName, isTrainer, todayClasses, recentActivity };
}

export const _STUDIO_ID = STUDIO_ID;
