/*
 * Staff query — surface profiles whose roles include trainer, owner,
 * manager, or front_desk. Joined with `trainers` for compensation when
 * present.
 */

import { STUDIO_ID } from "@/lib/constants";
import { inBypassMode } from "@/lib/data/_log";
import { TRAINERS } from "@/lib/fixtures";
import { createSupabaseServer } from "@/lib/supabase/server";

export type StaffMember = {
  id: string;
  name: string;
  seed: number;
  role: string;
  status: "active" | "paused";
  base: string;
  bonus: string;
  classes30: number;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  trainer: "Trainer",
  front_desk: "Front desk",
};

function describeRoles(roles: string[]): string {
  if (!roles.length) return "—";
  return roles.map((r) => ROLE_LABELS[r] ?? r).join(" · ");
}

function formatDollars(cents: number | null): string {
  if (!cents) return "—";
  return `$${(cents / 100).toFixed(0)}/class`;
}

function formatBonus(rate: number | null, threshold: number | null): string {
  if (!rate || !threshold) return "—";
  return `+${Math.round(rate * 100)}% over ${Math.round(threshold * 100)}% fill`;
}

export async function loadStaff(): Promise<StaffMember[]> {
  const supabase = await createSupabaseServer();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, roles")
    .eq("studio_id", STUDIO_ID)
    .overlaps("roles", ["owner", "manager", "trainer", "front_desk"]);

  const profileRows = profiles ?? [];

  if (!profileRows.length) {
    if (!inBypassMode()) return [];
    return TRAINERS.map((t, i) => ({
      id: t.id,
      name: t.name,
      seed: t.seed,
      role: i === 0 ? "Lead trainer" : "Trainer",
      status: "active" as const,
      base: i === 0 ? "$65/class" : "$50/class",
      bonus: "10% over 80% fill",
      classes30: 0,
    }));
  }

  // Pull trainer pay info for the trainer profiles.
  const trainerIds = profileRows
    .filter((p) => p.roles?.includes("trainer"))
    .map((p) => p.id);

  let payByProfile = new Map<
    string,
    {
      base_pay_per_class_cents: number | null;
      bonus_threshold: number | null;
      bonus_rate: number | null;
      is_active: boolean;
    }
  >();
  if (trainerIds.length) {
    const { data: trainers } = await supabase
      .from("trainers")
      .select(
        "profile_id, base_pay_per_class_cents, bonus_threshold, bonus_rate, is_active",
      )
      .eq("studio_id", STUDIO_ID)
      .in("profile_id", trainerIds);
    payByProfile = new Map((trainers ?? []).map((t) => [t.profile_id, t]));
  }

  // Class counts per trainer over the last 30 days. Pulled in one shot
  // with a simple aggregate-in-memory.
  const since = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: instances } = await supabase
    .from("class_instances")
    .select("trainer_id")
    .eq("studio_id", STUDIO_ID)
    .gte("starts_at", since);
  const classCount = new Map<string, number>();
  for (const r of instances ?? []) {
    if (!r.trainer_id) continue;
    classCount.set(r.trainer_id, (classCount.get(r.trainer_id) ?? 0) + 1);
  }

  return profileRows.map((p, i) => {
    const trainer = payByProfile.get(p.id);
    const isTrainer = p.roles?.includes("trainer");
    return {
      id: p.id,
      name: p.full_name ?? "Staff",
      seed: i + 1,
      role: describeRoles(p.roles ?? []),
      status: trainer && !trainer.is_active ? "paused" : "active",
      base: isTrainer
        ? formatDollars(trainer?.base_pay_per_class_cents ?? null)
        : "—",
      bonus: isTrainer
        ? formatBonus(
            trainer?.bonus_rate ?? null,
            trainer?.bonus_threshold ?? null,
          )
        : "—",
      classes30: classCount.get(p.id) ?? 0,
    };
  });
}
