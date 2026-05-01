/*
 * Campaign queries — list with live aggregates, with fixture fallback
 * when the DB is empty so the page never looks broken in dev.
 */

import { STUDIO_ID } from "@/lib/constants";
import { logQueryError } from "@/lib/data/_log";
import { CAMPAIGNS, type Campaign } from "@/lib/fixtures";
import { createSupabaseServer } from "@/lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;

function fmtSchedule(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (d >= todayStart && d < new Date(todayStart.getTime() + DAY_MS)) {
    return `Today · ${d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type CampaignRow = {
  id: string;
  name: string;
  status: Campaign["status"] | "cancelled";
  channel: Campaign["channel"];
  segment_id: string | null;
  recipient_count: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  conversion_count: number;
  scheduled_for: string | null;
  sent_at: string | null;
};

export async function loadCampaigns(): Promise<Campaign[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("campaigns")
    .select(
      "id, name, status, channel, segment_id, recipient_count, sent_count, open_count, click_count, conversion_count, scheduled_for, sent_at",
    )
    .eq("studio_id", STUDIO_ID)
    .neq("status", "cancelled")
    .order("updated_at", { ascending: false })
    .limit(50)
    .returns<CampaignRow[]>();
  logQueryError("campaigns.list", error);

  const rows = data ?? [];
  if (!rows.length) return CAMPAIGNS;

  return rows
    .filter((r) => r.status !== "cancelled")
    .map<Campaign>((r) => ({
      id: r.id,
      name: r.name,
      status: r.status as Campaign["status"],
      channel: r.channel,
      segment: r.segment_id ?? "—",
      recipients: r.recipient_count,
      sent: r.sent_count,
      opened: r.open_count,
      clicked: r.click_count,
      converted: r.conversion_count,
      scheduledFor: r.scheduled_for ? fmtSchedule(r.scheduled_for) : undefined,
      sentAt: r.sent_at ? fmtSchedule(r.sent_at) : undefined,
    }));
}
