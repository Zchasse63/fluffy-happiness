/*
 * Marketing · Content — feed of social/blog posts with engagement stats.
 * Channels: Instagram, Threads, Email digest, Blog.
 *
 * Live from `content_posts`. Fixture below is the fallback when the
 * table is empty — keeps the page useful in dev before any real
 * content has been authored.
 */

export const dynamic = "force-dynamic";

import { Icon, type IconName } from "@/components/icon";
import { PageHero, SectionHead } from "@/components/primitives";
import { loadContentPosts, type ContentPost } from "@/lib/data/content";

type FixturePost = ContentPost & { icon: IconName };

const FIXTURE_POSTS: FixturePost[] = [
  {
    id: "p1",
    channel: "Instagram",
    title: "Tuesday night Open Sauna · 7 spots open",
    body: "Wind down before Wednesday. We have 7 spots between 5–8 PM tonight.",
    publishedAt: "2h ago",
    impressions: 1240,
    reactions: 86,
    saves: 12,
    clicks: 41,
    icon: "globe" as const,
  },
  {
    id: "p2",
    channel: "Blog",
    title: "Why we fired the cold plunge that wasn't cold",
    body: "Chest-deep means chest-deep. We installed a chiller upgrade after our 30-day audit found average temps drifting from 38° to 44°.",
    publishedAt: "1d ago",
    impressions: 2280,
    reactions: 132,
    saves: 28,
    clicks: 96,
    icon: "edit" as const,
  },
  {
    id: "p3",
    channel: "Threads",
    title: "10-pack tip: book 4 in one week, not 2",
    body: "The members who get the most out of a 10-pack are the ones who treat it like a 4-week sprint.",
    publishedAt: "3d ago",
    impressions: 540,
    reactions: 27,
    saves: 4,
    clicks: 11,
    icon: "chat" as const,
  },
];

function iconForChannel(channel: string): IconName {
  switch (channel.toLowerCase()) {
    case "blog":
      return "edit";
    case "instagram":
    case "threads":
    case "twitter":
    case "x":
      return "globe";
    case "email":
    case "newsletter":
      return "mail";
    default:
      return "chat";
  }
}

export default async function ContentPage() {
  const live = await loadContentPosts();
  const POSTS: Array<ContentPost & { icon: IconName }> = live.length
    ? live.map((p) => ({ ...p, icon: iconForChannel(p.channel) }))
    : FIXTURE_POSTS;
  return (
    <>
      <PageHero
        meta="Last 30 days · Tampa"
        title="Content hub"
        subtitle="Operator-authored posts. The studio voice is warm and direct — no marketing fluff."
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="filter" size={13} /> Channels
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="plus" size={13} /> New post
            </button>
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {POSTS.map((p) => (
            <div key={p.id} className="card" style={{ padding: 18 }}>
              <div
                className="row"
                style={{
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span
                  className="badge"
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--text-2)",
                  }}
                >
                  <Icon name={p.icon} size={11} /> {p.channel}
                </span>
                <span
                  className="mono text-3"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {p.publishedAt}
                </span>
              </div>
              <div
                className="serif"
                style={{
                  fontSize: 22,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                  marginBottom: 8,
                }}
              >
                {p.title}
              </div>
              <div
                className="muted"
                style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 14 }}
              >
                {p.body}
              </div>
              <div className="row" style={{ gap: 24 }}>
                {[
                  ["Impressions", p.impressions.toLocaleString()],
                  ["Reactions", String(p.reactions)],
                  ["Saves", String(p.saves)],
                  ["Clicks", String(p.clicks)],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div className="metric-label">{l}</div>
                    <div
                      className="mono"
                      style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}
                    >
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 18 }}>
          <SectionHead>Suggested topics</SectionHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Heat shock proteins · why 20-minute sessions matter",
              "Member spotlight · Whitney's 6-week cold plunge streak",
              "Behind the scenes · how we built the new humidor",
              "Field guide · contrast therapy for desk workers",
            ].map((t) => (
              <div
                key={t}
                style={{
                  padding: "10px 12px",
                  borderRadius: 9,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
