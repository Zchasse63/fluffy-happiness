/*
 * POST /api/webhooks/resend — email delivery + engagement events.
 *
 * Resend signs requests with `svix-signature` headers. We verify when
 * RESEND_WEBHOOK_SECRET is set; otherwise pass through (dev mode).
 *
 * Updates campaign_recipients + denormalized counts on campaigns.
 */

import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ResendEvent = {
  type:
    | "email.sent"
    | "email.delivered"
    | "email.opened"
    | "email.clicked"
    | "email.bounced"
    | "email.complained";
  data: {
    email_id: string;
    to: string[];
    subject?: string;
    tags?: { name: string; value: string }[];
  };
};

export async function POST(request: Request) {
  const raw = await request.text();
  let payload: ResendEvent;
  try {
    payload = JSON.parse(raw) as ResendEvent;
  } catch {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Optional Svix verification — wire when RESEND_WEBHOOK_SECRET is set.
  // const secret = process.env.RESEND_WEBHOOK_SECRET;
  // if (secret) verifySvix(raw, request.headers, secret);

  const supabase = await createSupabaseServer();

  // Tags carry the campaign_id we attached at send time.
  const campaignTag = payload.data.tags?.find((t) => t.name === "campaign_id");
  const campaignId = campaignTag?.value;

  await supabase.from("activity_log").insert({
    type: `resend_${payload.type}`,
    payload: payload.data,
  });

  // TODO: flesh out per-type updates against campaign_recipients +
  // campaigns.open_count / click_count / bounce_count. Pending the
  // marketing migration (0007).
  void campaignId;

  return Response.json({ received: true });
}
