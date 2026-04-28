/*
 * Members · Profile — 360° view of a single member (SPEC §1.5 + §B
 * journey). 6 tabs per the design contract: Overview, Bookings,
 * Payments, Activity, Wellness, Notes.
 *
 * Reads from Supabase first; falls back to the fixture matching the
 * id when there's no DB row (autonomous-build default).
 */

import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { ChangeBadge, SectionHead } from "@/components/primitives";
import { ENGAGEMENT_TONE, MEMBERS, type Member } from "@/lib/fixtures";
import { createSupabaseServer } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

type Tab = "overview" | "bookings" | "payments" | "activity" | "wellness" | "notes";

const TABS: Tab[] = [
  "overview",
  "bookings",
  "payments",
  "activity",
  "wellness",
  "notes",
];

async function loadMember(id: string): Promise<Member | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("members")
    .select(
      "id, membership_status, membership_tier, plan_code, plan_price_cents, membership_credits, flex_credits, wallet_balance_cents, strike_count, glofox_id, profiles!inner(full_name, email, phone)",
    )
    .eq("id", id)
    .maybeSingle();
  if (data) {
    type Row = NonNullable<typeof data>;
    const r = data as Row & {
      profiles: { full_name: string; email: string | null; phone: string | null };
    };
    return {
      id: r.id,
      name: r.profiles.full_name,
      email: r.profiles.email ?? "",
      phone: r.profiles.phone ?? "",
      tier: (r.membership_tier as Member["tier"]) ?? "Monthly Unlimited",
      status: (r.membership_status as Member["status"]) ?? "active",
      engagement: "Active",
      credits: r.membership_credits + r.flex_credits,
      walletCents: r.wallet_balance_cents,
      ltv: 0,
      lastVisit: "—",
      joined: "—",
      seed: 0,
      strikes: r.strike_count,
    };
  }
  return MEMBERS.find((m) => m.id === id) ?? null;
}

export default async function MemberProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: Tab = (TABS as string[]).includes(tabParam ?? "")
    ? (tabParam as Tab)
    : "overview";
  const m = await loadMember(id);
  if (!m) notFound();

  const tone = ENGAGEMENT_TONE[m.engagement];

  return (
    <>
      {/* Header */}
      <div className="card" style={{ padding: 24 }}>
        <div className="row" style={{ gap: 16, alignItems: "flex-start" }}>
          <Avatar name={m.name} seed={m.seed} size={64} />
          <div style={{ flex: 1 }}>
            <div className="row" style={{ gap: 10, marginBottom: 6 }}>
              <span
                className="serif"
                style={{
                  fontSize: 32,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                {m.name}
              </span>
              <span
                className="badge"
                style={{ background: tone.soft, color: tone.fg }}
              >
                {m.engagement}
              </span>
              {m.strikes > 0 && (
                <span
                  className="badge"
                  style={{
                    background: "var(--neg-soft)",
                    color: "var(--neg)",
                  }}
                >
                  {m.strikes} strike{m.strikes > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
              {m.tier} · {m.email} · {m.phone || "no phone"}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn btn-primary hov" style={{ fontSize: 12.5 }}>
                <Icon name="plus" size={12} /> Book class
              </button>
              <button type="button" className="btn btn-ghost hov" style={{ fontSize: 12.5 }}>
                <Icon name="income" size={12} /> Record payment
              </button>
              <button type="button" className="btn btn-ghost hov" style={{ fontSize: 12.5 }}>
                <Icon name="income" size={12} /> Issue credit
              </button>
              <button type="button" className="btn btn-ghost hov" style={{ fontSize: 12.5 }}>
                <Icon name="edit" size={12} /> Add note
              </button>
              <button type="button" className="btn btn-ghost hov" style={{ fontSize: 12.5 }}>
                <Icon name="mail" size={12} /> Message
              </button>
            </div>
          </div>
          <div style={{ textAlign: "right", minWidth: 200 }}>
            <div className="metric-label">Credits · Wallet</div>
            <div
              className="row"
              style={{ gap: 18, marginTop: 6, justifyContent: "flex-end" }}
            >
              <div>
                <div
                  className="serif"
                  style={{ fontSize: 28, letterSpacing: "-0.02em" }}
                >
                  {m.credits === 999 ? "∞" : m.credits}
                </div>
                <div className="metric-label" style={{ marginBottom: 0 }}>
                  credits
                </div>
              </div>
              <div>
                <div
                  className="serif"
                  style={{ fontSize: 28, letterSpacing: "-0.02em" }}
                >
                  {formatCurrency(m.walletCents)}
                </div>
                <div className="metric-label" style={{ marginBottom: 0 }}>
                  wallet
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <ChangeBadge value="+$0" />
            </div>
          </div>
        </div>
      </div>

      {/* Status banners */}
      {m.status === "paused" && (
        <div
          className="card"
          style={{
            background: "var(--warn-soft)",
            borderColor: "var(--warn)",
            color: "var(--warn)",
            padding: 14,
            fontSize: 13,
          }}
        >
          <strong>Membership paused.</strong>{" "}
          <span style={{ color: "var(--text-2)" }}>
            Resumes on next billing cycle. No charges in the meantime.
          </span>
        </div>
      )}
      {m.strikes >= 2 && (
        <div
          className="card"
          style={{
            background: "var(--neg-soft)",
            borderColor: "var(--neg)",
            color: "var(--neg)",
            padding: 14,
            fontSize: 13,
          }}
        >
          <strong>{m.strikes} no-shows this month.</strong>{" "}
          <span style={{ color: "var(--text-2)" }}>
            Next no-show triggers a $5 fee per studio policy.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ alignSelf: "flex-start" }}>
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/members/${id}?tab=${t}`}
            className={`tab ${t === tab ? "active" : ""}`}
            style={{ textDecoration: "none" }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && <OverviewTab member={m} />}
      {tab === "bookings" && <BookingsTab />}
      {tab === "payments" && <PaymentsTab />}
      {tab === "activity" && <ActivityTab />}
      {tab === "wellness" && <WellnessTab />}
      {tab === "notes" && <NotesTab />}
    </>
  );
}

function OverviewTab({ member }: { member: Member }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr",
        gap: 16,
        alignItems: "flex-start",
      }}
    >
      <div className="card">
        <SectionHead>Membership</SectionHead>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16,
          }}
        >
          {[
            ["Tier", member.tier],
            ["Status", member.status],
            ["Joined", member.joined],
            ["Last visit", member.lastVisit],
            ["LTV", formatCurrency(member.ltv * 100)],
            ["Strikes (30d)", String(member.strikes)],
          ].map(([l, v]) => (
            <div
              key={l}
              style={{
                padding: "12px 14px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
              }}
            >
              <div className="metric-label">{l}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>
                {v}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <SectionHead>AI signal</SectionHead>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { tone: "var(--pos)", soft: "var(--pos-soft)", label: "Visit streak", body: "6 weeks · personal record territory" },
            { tone: "var(--warn)", soft: "var(--warn-soft)", label: "Credit expiry", body: "0 credits in pack — eligible for top-up nudge" },
            { tone: "var(--cobalt)", soft: "var(--cobalt-soft)", label: "Pattern", body: "Books Tue + Thu evenings — strongly attached to Whitney's class" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                padding: "12px 14px",
                background: s.soft,
                borderLeft: `3px solid ${s.tone}`,
                borderRadius: 10,
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 10.5,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: s.tone,
                  marginBottom: 4,
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: 13, color: "var(--text)" }}>{s.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BookingsTab() {
  const rows = [
    { time: "Today · 6 PM", kind: "Guided Sauna", trainer: "Trent Lott", status: "booked" },
    { time: "Apr 19 · 5 PM", kind: "Open Sauna", trainer: "—", status: "checked-in" },
    { time: "Apr 17 · 7 PM", kind: "Guided Sauna", trainer: "Whitney Abrams", status: "checked-in" },
    { time: "Apr 14 · 6 PM", kind: "Open Sauna", trainer: "—", status: "no-show" },
    { time: "Apr 12 · 8 PM", kind: "Cold Plunge", trainer: "Ben Kniesly", status: "checked-in" },
  ];
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
            {["When", "Class", "Trainer", "Status", ""].map((l) => (
              <th
                key={l}
                style={{
                  padding: "12px 14px",
                  textAlign: "left",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--text-3)",
                  fontWeight: 600,
                }}
              >
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
              <td className="mono" style={{ padding: "12px 14px", fontSize: 12.5 }}>{r.time}</td>
              <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.kind}</td>
              <td className="muted" style={{ padding: "12px 14px", fontSize: 12.5 }}>{r.trainer}</td>
              <td style={{ padding: "12px 14px" }}>
                <span
                  className="badge"
                  style={{
                    background:
                      r.status === "checked-in"
                        ? "var(--pos-soft)"
                        : r.status === "no-show"
                          ? "var(--neg-soft)"
                          : "var(--surface-2)",
                    color:
                      r.status === "checked-in"
                        ? "var(--pos)"
                        : r.status === "no-show"
                          ? "var(--neg)"
                          : "var(--text-2)",
                  }}
                >
                  {r.status}
                </span>
              </td>
              <td style={{ padding: "12px 14px", textAlign: "right" }}>
                {r.status === "booked" && (
                  <button type="button" className="btn btn-ghost hov" style={{ height: 26, fontSize: 11.5 }}>
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsTab() {
  return <PlaceholderTab label="Payments" message="Stripe payment history loads from /api/transactions?member_id=…" />;
}
function ActivityTab() {
  return <PlaceholderTab label="Activity" message="Chronological event stream from activity_log + Glofox webhooks." />;
}
function WellnessTab() {
  return <PlaceholderTab label="Wellness" message="Visit streaks, attendance heatmap, personal records." />;
}
function NotesTab() {
  return <PlaceholderTab label="Notes" message="Staff-only and member-visible notes. Watch for HIPAA-adjacent content." />;
}

function PlaceholderTab({ label, message }: { label: string; message: string }) {
  return (
    <div
      className="card"
      style={{ display: "grid", placeItems: "center", padding: 48, textAlign: "center" }}
    >
      <div>
        <div className="metric-label" style={{ marginBottom: 8 }}>{label}</div>
        <div className="serif" style={{ fontSize: 28, letterSpacing: "-0.02em", marginBottom: 8 }}>
          Coming next
        </div>
        <div className="muted" style={{ fontSize: 13, maxWidth: 480, marginInline: "auto" }}>
          {message}
        </div>
      </div>
    </div>
  );
}
