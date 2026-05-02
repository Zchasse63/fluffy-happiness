/*
 * Per-segment people drill-down. Wraps the segment_people RPC (migration
 * 0019) and returns a typed shape the segments + leads pages render.
 *
 * Ordered by total spend desc + visits_30d desc so the most actionable
 * person in each segment surfaces first.
 */

import { STUDIO_ID } from "@/lib/constants";
import { fixtureFallback, logQueryError } from "@/lib/data/_log";
import { MEMBERS } from "@/lib/fixtures";
import { createSupabaseServer } from "@/lib/supabase/server";

export type SegmentPerson = {
  email: string | null;
  fullName: string | null;
  phone: string | null;
  memberId: string | null;
  leadId: string | null;
  membershipStatus: string | null;
  membershipTier: string | null;
  creditBalance: number;
  visits30d: number;
  lastVisitAt: string | null;
  lastPurchaseAt: string | null;
  totalSpendCents: number;
};

export async function loadSegmentPeople(
  segmentId: string,
  limit = 200,
): Promise<SegmentPerson[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc("segment_people", {
    p_studio_id: STUDIO_ID,
    p_segment_id: segmentId,
    p_limit: limit,
  });
  logQueryError(`segments.people.${segmentId}`, error);

  const rows = (data ?? []) as Array<{
    email: string | null;
    full_name: string | null;
    phone: string | null;
    member_id: string | null;
    lead_id: string | null;
    membership_status: string | null;
    membership_tier: string | null;
    credit_balance: number;
    visits_30d: number;
    last_visit_at: string | null;
    last_purchase_at: string | null;
    total_spend_cents: number;
  }>;

  if (!rows.length) {
    // Bypass demo: project a few fixture members into the SegmentPerson
    // shape so the e2e suite has stable drill-down data.
    return fixtureFallback(
      MEMBERS.slice(0, 5).map<SegmentPerson>((m) => ({
        email: m.email,
        fullName: m.name,
        phone: m.phone,
        memberId: m.id,
        leadId: null,
        membershipStatus: m.status,
        membershipTier: m.tier,
        creditBalance: m.credits,
        visits30d: 0,
        lastVisitAt: null,
        lastPurchaseAt: null,
        totalSpendCents: m.ltv * 100,
      })),
      [],
    );
  }

  return rows.map<SegmentPerson>((r) => ({
    email: r.email,
    fullName: r.full_name,
    phone: r.phone,
    memberId: r.member_id,
    leadId: r.lead_id,
    membershipStatus: r.membership_status,
    membershipTier: r.membership_tier,
    creditBalance: r.credit_balance ?? 0,
    visits30d: r.visits_30d ?? 0,
    lastVisitAt: r.last_visit_at,
    lastPurchaseAt: r.last_purchase_at,
    totalSpendCents: r.total_spend_cents ?? 0,
  }));
}
