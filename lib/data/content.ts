/*
 * Content posts list — live from the `content_posts` table. The
 * fixture POSTS in app/marketing/content/page.tsx remain as a
 * fallback when the table is empty so the page never goes blank.
 */

import { STUDIO_ID } from "@/lib/constants";
import { createSupabaseServer } from "@/lib/supabase/server";

export type ContentPost = {
  id: string;
  channel: string;
  title: string;
  body: string;
  publishedAt: string;
  impressions: number;
  reactions: number;
  saves: number;
  clicks: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function fmtRelative(iso: string | null): string {
  if (!iso) return "Draft";
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  if (ms < 60 * 60 * 1000) return `${Math.max(1, Math.round(ms / 60000))}m ago`;
  if (ms < DAY_MS) return `${Math.round(ms / (60 * 60 * 1000))}h ago`;
  if (ms < 7 * DAY_MS) return `${Math.round(ms / DAY_MS)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function loadContentPosts(): Promise<ContentPost[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("content_posts")
    .select(
      "id, channel, title, body, published_at, impressions, reactions, saves, clicks",
    )
    .eq("studio_id", STUDIO_ID)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(20);

  return (data ?? []).map((r) => ({
    id: r.id,
    channel: r.channel,
    title: r.title,
    body: r.body ?? "",
    publishedAt: fmtRelative(r.published_at),
    impressions: r.impressions ?? 0,
    reactions: r.reactions ?? 0,
    saves: r.saves ?? 0,
    clicks: r.clicks ?? 0,
  }));
}
