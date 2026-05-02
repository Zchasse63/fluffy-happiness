/*
 * GET /api/segments/[id]/export — CSV download of every person in a
 * segment, including phone number, for batch outreach. Owner/manager
 * only because the export contains PII (phone + email + spend history).
 *
 * GloFox stays read-only — this is a pure read on `segment_people`.
 */

import { authErrorResponse, requireRole } from "@/lib/auth";
import { loadSegmentPeople } from "@/lib/data/people";
import { SEGMENTS } from "@/lib/fixtures";

type Params = Promise<{ id: string }>;

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(_request: Request, { params }: { params: Params }) {
  try {
    await requireRole("owner", "manager");
    const { id } = await params;

    const segment = SEGMENTS.find((s) => s.id === id);
    if (!segment) {
      return Response.json({ error: "Unknown segment" }, { status: 404 });
    }

    // Cap at 500 — same as the RPC default. Operators that need more
    // can iterate with offset later (not needed for current scale).
    const people = await loadSegmentPeople(id, 500);

    const header = [
      "name",
      "email",
      "phone",
      "membership_status",
      "membership_tier",
      "credit_balance",
      "visits_30d",
      "last_visit_at",
      "last_purchase_at",
      "lifetime_spend_cents",
    ].join(",");

    const lines = people.map((p) =>
      [
        csvEscape(p.fullName),
        csvEscape(p.email),
        csvEscape(p.phone),
        csvEscape(p.membershipStatus),
        csvEscape(p.membershipTier),
        csvEscape(p.creditBalance),
        csvEscape(p.visits30d),
        csvEscape(p.lastVisitAt),
        csvEscape(p.lastPurchaseAt),
        csvEscape(p.totalSpendCents),
      ].join(","),
    );

    const csv = [header, ...lines].join("\n");

    const filename = `meridian-segment-${id}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
