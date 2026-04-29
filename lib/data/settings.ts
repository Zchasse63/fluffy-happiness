/*
 * Settings data — pulls live values from `studios`, the `settings`
 * key/value table, `membership_plans`, and `profiles` (for team
 * count). Returns a single SettingsView the page renders.
 */

import { STUDIO_ID } from "@/lib/constants";
import { GlofoxClient } from "@/lib/glofox";
import { createSupabaseServer } from "@/lib/supabase/server";

export type SettingsView = {
  business: {
    name: string;
    slug: string;
    timezone: string;
    currency: string;
    taxRate: number;
  };
  bookingRules: {
    bookingWindowDays: number;
    cancellationPolicyHours: number;
    lateCancelFeeCents: number;
    noShowFeeCents: number;
    waitlistAutoPromote: boolean;
  };
  notifications: {
    bookingConfirmation: string;
    reminder: string;
    dailyBriefing: string;
    failedPaymentAlert: string;
  };
  integrations: Array<{
    name: string;
    status: "connected" | "pending" | "disabled";
    detail: string;
  }>;
  plansCount: number;
  teamCount: number;
};

type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

function asNumber(v: Json | undefined, fallback: number): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && !isNaN(Number(v))) return Number(v);
  return fallback;
}

function asBool(v: Json | undefined, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

export async function loadSettings(): Promise<SettingsView> {
  const supabase = await createSupabaseServer();

  const [
    { data: studio },
    { data: settingsRows },
    { count: plansCount },
    { count: teamCount },
  ] = await Promise.all([
    supabase
      .from("studios")
      .select("name, slug, timezone, tax_rate, currency")
      .eq("id", STUDIO_ID)
      .single(),
    supabase
      .from("settings")
      .select("key, value")
      .eq("studio_id", STUDIO_ID),
    supabase
      .from("membership_plans")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", STUDIO_ID),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", STUDIO_ID)
      .not("auth_user_id", "is", null),
  ]);

  const map = new Map<string, Json>(
    (settingsRows ?? []).map((r) => [r.key, r.value as Json]),
  );

  const business = {
    name: studio?.name ?? "—",
    slug: studio?.slug ?? "—",
    timezone: studio?.timezone ?? "America/New_York",
    currency: studio?.currency ?? "USD",
    taxRate: studio?.tax_rate ?? 0,
  };

  const bookingRules = {
    bookingWindowDays: asNumber(map.get("booking_window_days"), 14),
    cancellationPolicyHours: asNumber(
      map.get("cancellation_policy_hours"),
      12,
    ),
    lateCancelFeeCents: asNumber(map.get("late_cancel_fee_cents"), 500),
    noShowFeeCents: asNumber(map.get("no_show_fee_cents"), 500),
    waitlistAutoPromote: asBool(map.get("waitlist_auto_promote"), true),
  };

  const notifications = {
    bookingConfirmation: typeof map.get("booking_confirmation_channels") === "string"
      ? String(map.get("booking_confirmation_channels"))
      : "Email + SMS",
    reminder: typeof map.get("reminder_text") === "string"
      ? String(map.get("reminder_text"))
      : "2 hours before · Email",
    dailyBriefing: "6:00 AM ET to owners + managers",
    failedPaymentAlert: "Real-time · Email",
  };

  const integrations: SettingsView["integrations"] = [
    {
      name: "Glofox",
      status: GlofoxClient.isConfigured() ? "connected" : "disabled",
      detail: GlofoxClient.isConfigured()
        ? "Connected · live sync hourly"
        : "Disabled · GLOFOX_API_KEY required",
    },
    {
      name: "Stripe",
      status: process.env.STRIPE_SECRET_KEY ? "connected" : "pending",
      detail: process.env.STRIPE_SECRET_KEY
        ? "Connected"
        : "Pending · STRIPE_SECRET_KEY required",
    },
    {
      name: "Resend",
      status: process.env.RESEND_API_KEY ? "connected" : "pending",
      detail: process.env.RESEND_API_KEY
        ? "Connected · sender verified"
        : "Pending · domain verification + RESEND_API_KEY",
    },
    {
      name: "Anthropic",
      status: process.env.ANTHROPIC_API_KEY ? "connected" : "disabled",
      detail: process.env.ANTHROPIC_API_KEY
        ? "Connected · Sonnet 4.6 + Opus 4.7"
        : "Disabled · ANTHROPIC_API_KEY required",
    },
    {
      name: "Inngest",
      status: process.env.INNGEST_SIGNING_KEY
        ? "connected"
        : process.env.INNGEST_DEV
          ? "pending"
          : "disabled",
      detail: process.env.INNGEST_SIGNING_KEY
        ? "Connected · cloud"
        : process.env.INNGEST_DEV
          ? "Local dev only · INNGEST_SIGNING_KEY required for prod"
          : "Disabled · INNGEST_SIGNING_KEY required",
    },
  ];

  return {
    business,
    bookingRules,
    notifications,
    integrations,
    plansCount: plansCount ?? 0,
    teamCount: teamCount ?? 0,
  };
}
