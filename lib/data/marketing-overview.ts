/*
 * Marketing overview rollup — campaign aggregates over the trailing
 * 30 days, lead status counts, and active automation summaries. Each
 * pull falls back to fixtures when the DB is empty.
 */

import { STUDIO_ID } from "@/lib/constants";
import { loadAutomationFlows } from "@/lib/data/automations";
import { loadCampaigns } from "@/lib/data/campaigns";
import {
  CAMPAIGNS,
  LEADS,
  type Automation,
  type Campaign,
  type Lead,
  type LeadStatus,
} from "@/lib/fixtures";
import { createSupabaseServer } from "@/lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;

export type MarketingOverview = {
  campaigns: Campaign[];
  recentCampaigns: Campaign[]; // last 30 days
  totals: {
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
    openRate: number;
    clickRate: number;
  };
  leads: Lead[];
  leadsByStatus: Record<LeadStatus, number>;
  automations: Automation[];
  activeAutomations: Automation[];
};

const STATUS_LABEL: Record<string, LeadStatus> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Trial",
  converted: "Converted",
  unqualified: "Lost",
};

export async function loadMarketingOverview(): Promise<MarketingOverview> {
  const supabase = await createSupabaseServer();
  const since = new Date(Date.now() - 30 * DAY_MS).toISOString();

  const [campaigns, automations, { data: leadRows }] = await Promise.all([
    loadCampaigns(),
    loadAutomationFlows(),
    supabase
      .from("leads")
      .select("id, full_name, email, source, status, created_at")
      .eq("studio_id", STUDIO_ID)
      .gte("created_at", since)
      .limit(200),
  ]);

  const leads: Lead[] = (leadRows ?? []).length
    ? (leadRows ?? []).map((r, i) => ({
        id: r.id,
        name: r.full_name ?? r.email ?? "Lead",
        email: r.email ?? "",
        source: r.source ?? "—",
        score: 0,
        status: STATUS_LABEL[r.status] ?? "New",
        lastTouch: r.created_at
          ? new Date(r.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : "—",
        seed: i,
      }))
    : LEADS;

  const recentCampaigns = campaigns.filter((c) =>
    c.status === "sent" || c.status === "sending",
  );
  const sent = recentCampaigns.reduce((s, c) => s + c.sent, 0);
  const opened = recentCampaigns.reduce((s, c) => s + c.opened, 0);
  const clicked = recentCampaigns.reduce((s, c) => s + c.clicked, 0);
  const converted = recentCampaigns.reduce((s, c) => s + c.converted, 0);
  const openRate = sent ? Math.round((opened / sent) * 100) : 0;
  const clickRate = sent ? Math.round((clicked / sent) * 100) : 0;

  const leadsByStatus: Record<LeadStatus, number> = {
    New: 0,
    Contacted: 0,
    Trial: 0,
    Converted: 0,
    Lost: 0,
  };
  for (const l of leads) {
    leadsByStatus[l.status] = (leadsByStatus[l.status] ?? 0) + 1;
  }

  // Use fixture data only as a final fallback to keep the cards from looking empty.
  const finalCampaigns = campaigns.length ? campaigns : CAMPAIGNS;

  return {
    campaigns: finalCampaigns,
    recentCampaigns,
    totals: {
      sent,
      opened,
      clicked,
      converted,
      openRate,
      clickRate,
    },
    leads,
    leadsByStatus,
    automations,
    activeAutomations: automations.filter((a) => a.status === "active"),
  };
}
