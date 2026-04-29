/*
 * Members · Profile — 360° view of a single member (SPEC §1.5 + §B
 * journey). 6 tabs per the design contract: Overview, Bookings,
 * Payments, Activity, Wellness, Notes.
 *
 * Reads from Supabase first; falls back to the fixture matching the
 * id when there's no DB row (autonomous-build default).
 */

export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { ActivityTab } from "@/components/member-profile/activity-tab";
import { BookingsTab } from "@/components/member-profile/bookings-tab";
import { OverviewTab } from "@/components/member-profile/overview-tab";
import { PaymentsTab } from "@/components/member-profile/payments-tab";
import { ProfileHeader } from "@/components/member-profile/profile-header";
import { ProfileTabs } from "@/components/member-profile/tabs";
import {
  loadMemberActivity,
  loadMemberBookings,
  loadMemberPayments,
} from "@/lib/data/members";
import {
  MEMBER_PROFILE_TABS,
  MEMBERS,
  type Member,
  type MemberProfileTab,
} from "@/lib/fixtures";
import { createSupabaseServer } from "@/lib/supabase/server";

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
  const tab: MemberProfileTab = (MEMBER_PROFILE_TABS as string[]).includes(
    tabParam ?? "",
  )
    ? (tabParam as MemberProfileTab)
    : "overview";
  const m = await loadMember(id);
  if (!m) notFound();

  // Fan out the per-tab data fetches in parallel — the tabs themselves
  // are conditionally rendered, but parallel fetch keeps the cold-load
  // latency flat regardless of which tab is active.
  const [bookings, payments, activity] = await Promise.all([
    loadMemberBookings(id),
    loadMemberPayments(id),
    loadMemberActivity(id),
  ]);

  return (
    <>
      <ProfileHeader member={m} />

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

      <ProfileTabs memberId={id} active={tab} />

      {/* Tab content */}
      {tab === "overview" && <OverviewTab member={m} />}
      {tab === "bookings" && <BookingsTab rows={bookings} />}
      {tab === "payments" && <PaymentsTab rows={payments} />}
      {tab === "activity" && <ActivityTab entries={activity} />}
      {tab === "wellness" && (
        <PlaceholderTab
          label="Wellness"
          message="Visit streaks, attendance heatmap, personal records."
        />
      )}
      {tab === "notes" && (
        <PlaceholderTab
          label="Notes"
          message="Staff-only and member-visible notes. Watch for HIPAA-adjacent content."
        />
      )}
    </>
  );
}

function PlaceholderTab({ label, message }: { label: string; message: string }) {
  return (
    <div
      className="card"
      style={{
        display: "grid",
        placeItems: "center",
        padding: 48,
        textAlign: "center",
      }}
    >
      <div>
        <div className="metric-label" style={{ marginBottom: 8 }}>
          {label}
        </div>
        <div
          className="serif"
          style={{ fontSize: 28, letterSpacing: "-0.02em", marginBottom: 8 }}
        >
          Coming next
        </div>
        <div
          className="muted"
          style={{ fontSize: 13, maxWidth: 480, marginInline: "auto" }}
        >
          {message}
        </div>
      </div>
    </div>
  );
}
