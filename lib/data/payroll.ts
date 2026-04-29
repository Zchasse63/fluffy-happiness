/*
 * Payroll computations — for each trainer, count their classes in the
 * pay period and compute base + bonus. Bonus = base × bonus_rate when
 * trainer's avg fill across the period meets bonus_threshold.
 *
 * Commission isn't modelled in the schema (yet); displays as 0 until
 * a `trainer_commission_pct` column lands.
 */

import { STUDIO_ID } from "@/lib/constants";
import { createSupabaseServer } from "@/lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;

export type PayrollRow = {
  trainerId: string;
  trainerName: string;
  classes: number;
  baseCents: number;
  bonusCents: number;
  commissionCents: number;
  totalCents: number;
  fillRatePct: number;
};

export type PayrollPeriod = {
  start: Date;
  end: Date;
  label: string;
  rows: PayrollRow[];
};

function fmtMonthDay(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function loadCurrentPayroll(): Promise<PayrollPeriod> {
  const supabase = await createSupabaseServer();
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now.getTime() - 14 * DAY_MS);
  start.setHours(0, 0, 0, 0);

  const [{ data: trainers }, { data: instances }] = await Promise.all([
    supabase
      .from("trainers")
      .select(
        "id, base_pay_per_class_cents, bonus_threshold, bonus_rate, profiles!inner(full_name)",
      )
      .eq("studio_id", STUDIO_ID)
      .eq("is_active", true),
    supabase
      .from("class_instances")
      .select("trainer_id, capacity, booked_count, status")
      .eq("studio_id", STUDIO_ID)
      .gte("starts_at", start.toISOString())
      .lte("starts_at", end.toISOString())
      .neq("status", "cancelled"),
  ]);

  type Acc = { count: number; bookedSum: number; capSum: number };
  const perTrainer = new Map<string, Acc>();
  for (const i of instances ?? []) {
    if (!i.trainer_id) continue;
    const acc = perTrainer.get(i.trainer_id) ?? {
      count: 0,
      bookedSum: 0,
      capSum: 0,
    };
    acc.count += 1;
    acc.bookedSum += i.booked_count ?? 0;
    acc.capSum += i.capacity ?? 0;
    perTrainer.set(i.trainer_id, acc);
  }

  type TrainerRow = {
    id: string;
    base_pay_per_class_cents: number | null;
    bonus_threshold: number | null;
    bonus_rate: number | null;
    profiles: { full_name: string | null } | null;
  };

  const rows: PayrollRow[] = ((trainers ?? []) as unknown as TrainerRow[])
    .map((t) => {
      const acc = perTrainer.get(t.id) ?? { count: 0, bookedSum: 0, capSum: 0 };
      const baseCents = (t.base_pay_per_class_cents ?? 0) * acc.count;
      const fillRate = acc.capSum
        ? Math.round((acc.bookedSum / acc.capSum) * 100)
        : 0;
      const meetsBonus =
        t.bonus_threshold !== null &&
        t.bonus_rate !== null &&
        fillRate / 100 >= Number(t.bonus_threshold);
      const bonusCents = meetsBonus ? Math.round(baseCents * Number(t.bonus_rate ?? 0)) : 0;
      const commissionCents = 0; // not in schema yet
      return {
        trainerId: t.id,
        trainerName: t.profiles?.full_name ?? "Trainer",
        classes: acc.count,
        baseCents,
        bonusCents,
        commissionCents,
        totalCents: baseCents + bonusCents + commissionCents,
        fillRatePct: fillRate,
      };
    })
    .filter((r) => r.classes > 0)
    .sort((a, b) => b.totalCents - a.totalCents);

  return {
    start,
    end,
    label: `${fmtMonthDay(start)} → ${fmtMonthDay(end)}`,
    rows,
  };
}
