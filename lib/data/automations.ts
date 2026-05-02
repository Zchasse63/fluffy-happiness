/*
 * Automation flow queries + seed helpers. Reads `automation_flows`
 * and aggregates enrollment counts from `automation_enrollments`.
 *
 * Flow execution itself (event listeners, step delivery) is the next
 * iteration — these queries plus the active/paused toggle make the
 * page real. Records are persistent so when the executor lands, no UI
 * change is needed.
 */

import { STUDIO_ID } from "@/lib/constants";
import { fixtureFallback } from "@/lib/data/_log";
import { AUTOMATIONS, type Automation } from "@/lib/fixtures";
import { createSupabaseServer } from "@/lib/supabase/server";

type FlowRow = {
  id: string;
  name: string;
  trigger: string;
  status: "active" | "paused" | "draft";
  steps: unknown;
};

export async function loadAutomationFlows(): Promise<Automation[]> {
  const supabase = await createSupabaseServer();
  const { data: flows } = await supabase
    .from("automation_flows")
    .select("id, name, trigger, status, steps")
    .eq("studio_id", STUDIO_ID)
    .order("created_at", { ascending: true })
    .returns<FlowRow[]>();

  const rows = flows ?? [];
  if (!rows.length) return fixtureFallback(AUTOMATIONS, []);

  // Count enrollments per flow in a single round trip.
  const flowIds = rows.map((r) => r.id);
  const { data: enrollments } = await supabase
    .from("automation_enrollments")
    .select("flow_id, status")
    .eq("studio_id", STUDIO_ID)
    .in("flow_id", flowIds);

  const totals = new Map<string, number>();
  const active = new Map<string, number>();
  for (const e of enrollments ?? []) {
    if (!e.flow_id) continue;
    totals.set(e.flow_id, (totals.get(e.flow_id) ?? 0) + 1);
    if (e.status === "active") {
      active.set(e.flow_id, (active.get(e.flow_id) ?? 0) + 1);
    }
  }

  return rows.map<Automation>((r) => {
    const stepsCount = Array.isArray(r.steps) ? r.steps.length : 0;
    const status: Automation["status"] =
      r.status === "paused" ? "paused" : "active";
    return {
      id: r.id,
      name: r.name,
      trigger: r.trigger,
      steps: stepsCount,
      enrolled: totals.get(r.id) ?? 0,
      active: active.get(r.id) ?? 0,
      status,
    };
  });
}

/* ─── Default flow seeds ──────────────────────────────────────────── */

const DEFAULT_FLOWS = [
  {
    name: "Welcome series",
    trigger: "signup",
    cooldown_days: 0,
    steps: [
      { kind: "send_email", delay_hours: 0, template: "welcome_intro" },
      { kind: "wait", delay_hours: 48 },
      { kind: "send_email", delay_hours: 0, template: "welcome_first_class" },
      { kind: "wait", delay_hours: 120 },
      { kind: "send_email", delay_hours: 0, template: "welcome_membership" },
    ],
  },
  {
    name: "Win-back · 21-day lapse",
    trigger: "inactivity",
    cooldown_days: 60,
    steps: [
      { kind: "send_email", delay_hours: 0, template: "winback_we_miss_you" },
      { kind: "wait", delay_hours: 72 },
      { kind: "send_email", delay_hours: 0, template: "winback_credit_offer" },
    ],
  },
  {
    name: "Credit expiry reminder",
    trigger: "credit_expiry",
    cooldown_days: 30,
    steps: [
      { kind: "send_email", delay_hours: 0, template: "credit_expiry_warn" },
      { kind: "wait", delay_hours: 96 },
      { kind: "send_email", delay_hours: 0, template: "credit_expiry_final" },
    ],
  },
  {
    name: "Failed-payment recovery",
    trigger: "failed_payment",
    cooldown_days: 7,
    steps: [
      { kind: "send_email", delay_hours: 0, template: "dunning_first" },
      { kind: "wait", delay_hours: 48 },
      { kind: "send_email", delay_hours: 0, template: "dunning_second" },
      { kind: "wait", delay_hours: 72 },
      { kind: "send_sms", delay_hours: 0, template: "dunning_final" },
    ],
  },
];

export async function seedDefaultAutomations(
  studioId: string,
  createdBy: string,
): Promise<{ inserted: number }> {
  const supabase = await createSupabaseServer();
  const { data: existing } = await supabase
    .from("automation_flows")
    .select("name")
    .eq("studio_id", studioId);
  const have = new Set((existing ?? []).map((r) => r.name));

  const toInsert = DEFAULT_FLOWS.filter((f) => !have.has(f.name)).map((f) => ({
    studio_id: studioId,
    name: f.name,
    trigger: f.trigger,
    status: "draft" as const,
    cooldown_days: f.cooldown_days,
    steps: f.steps as never,
    exit_conditions: {} as never,
    created_by: createdBy,
  }));

  if (!toInsert.length) return { inserted: 0 };
  const { error } = await supabase.from("automation_flows").insert(toInsert);
  if (error) throw new Error(error.message);
  return { inserted: toInsert.length };
}
