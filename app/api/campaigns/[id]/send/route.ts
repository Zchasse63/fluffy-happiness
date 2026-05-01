/*
 * POST /api/campaigns/[id]/send — send a draft campaign.
 *
 * Behavior:
 *   1. Verify campaign exists, belongs to caller's studio, is in draft.
 *   2. Resolve segment members → emails (segment logic deferred —
 *      currently picks active members as a baseline).
 *   3. Insert campaign_recipients rows in `queued` status.
 *   4. If `RESEND_API_KEY` is set, hand off to Resend (NOT IMPLEMENTED
 *      yet — pending Resend creds; see DEFERRED.md). For now we return
 *      `{ pending: 'resend' }` and leave recipients queued.
 *   5. Mark campaign `status = 'sending'` so the UI reflects the queue.
 *      Resend's webhook handler will flip it to `sent` once delivery
 *      events come back.
 */

import { authErrorResponse, requireRole } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

export async function POST(_request: Request, { params }: { params: Params }) {
  try {
    const profile = await requireRole("owner", "manager");
    const supabase = await createSupabaseServer();
    const { id } = await params;

    const { data: campaign, error: fetchErr } = await supabase
      .from("campaigns")
      .select("id, status, channel, segment_id, subject, body_html, body_text")
      .eq("id", id)
      .eq("studio_id", profile.studio_id)
      .maybeSingle();

    if (fetchErr) {
      return Response.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!campaign) {
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }
    if (campaign.status !== "draft") {
      return Response.json(
        { error: `Cannot send a campaign in status '${campaign.status}'` },
        { status: 409 },
      );
    }

    // M-04: refuse to send to a non-trivial segment_id until real segment
    // resolution lands. Sending to "all active members" silently when the
    // operator picked a specific segment would be a real-money bug. The
    // operator can either clear the segment_id (send to all) or wait for
    // the segment-resolution feature.
    const segmentId = (campaign.segment_id ?? "").trim();
    const isAllAudience =
      segmentId === "" || segmentId === "all" || segmentId === "all-active";
    if (!isAllAudience) {
      return Response.json(
        {
          error: `Segment '${segmentId}' resolution is deferred. Update the campaign to target 'all-active' or wait for the segment-resolution feature (DEFERRED.md M-04).`,
          code: "segment_resolution_deferred",
        },
        { status: 422 },
      );
    }

    // Resolve audience — picks all active members with an email on file
    // (the only audience type currently supported; see segment_id check
    // above).
    const { data: members, error: memberErr } = await supabase
      .from("members")
      .select("id, profiles!inner(email)")
      .eq("studio_id", profile.studio_id)
      .eq("membership_status", "active")
      .returns<Array<{ id: string; profiles: { email: string | null } }>>();

    if (memberErr) {
      return Response.json({ error: memberErr.message }, { status: 500 });
    }

    const audience = (members ?? []).filter(
      (m): m is { id: string; profiles: { email: string } } =>
        Boolean(m.profiles?.email),
    );

    if (!audience.length) {
      return Response.json(
        { error: "No deliverable recipients found for segment" },
        { status: 422 },
      );
    }

    // Insert recipients in chunks — `campaign_recipients` will fan out
    // to one row per audience member.
    const recipientRows = audience.map((m) => ({
      studio_id: profile.studio_id,
      campaign_id: id,
      member_id: m.id,
      email: m.profiles.email,
      status: "queued" as const,
    }));

    for (let i = 0; i < recipientRows.length; i += 500) {
      const chunk = recipientRows.slice(i, i + 500);
      const { error } = await supabase
        .from("campaign_recipients")
        .insert(chunk);
      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }
    }

    // Mark campaign sending. recipient_count snapshot here so the UI
    // can render before Resend webhooks come back.
    await supabase
      .from("campaigns")
      .update({
        status: "sending",
        recipient_count: recipientRows.length,
      })
      .eq("id", id)
      .eq("studio_id", profile.studio_id);

    const resendConfigured = Boolean(process.env.RESEND_API_KEY);

    return Response.json({
      sent: false,
      pending: resendConfigured ? null : "resend",
      message: resendConfigured
        ? "Recipients queued — Resend dispatch pending integration"
        : "Recipients queued · Resend integration pending (see DEFERRED.md). Recipients are saved and will be dispatched once RESEND_API_KEY is set.",
      recipient_count: recipientRows.length,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
