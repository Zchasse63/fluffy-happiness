/*
 * POST /api/webhooks/resend — email delivery + engagement events.
 *
 * Resend uses Svix for webhook signing — verified via HMAC-SHA256 of
 * `${svix-id}.${svix-timestamp}.${rawBody}` keyed by the base64-decoded
 * portion of RESEND_WEBHOOK_SECRET (Svix format: `whsec_<base64>`).
 *
 * Without the secret set we 503 — leaving this open would let any
 * client inject fake delivery events and inflate campaign counts.
 *
 * activity_log.studio_id is NOT NULL — single-tenant for now.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import { STUDIO_ID } from "@/lib/constants";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// Reject events older than 5 minutes — replay-attack defense in line
// with Svix's documented best practice.
const MAX_TIMESTAMP_SKEW_S = 5 * 60;

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

function verifySvixSignature(
  rawBody: string,
  headers: Headers,
  secret: string,
): boolean {
  const id = headers.get("svix-id") ?? headers.get("webhook-id");
  const ts = headers.get("svix-timestamp") ?? headers.get("webhook-timestamp");
  const sigHeader =
    headers.get("svix-signature") ?? headers.get("webhook-signature");
  if (!id || !ts || !sigHeader) return false;

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return false;
  const ageS = Math.abs(Date.now() / 1000 - tsNum);
  if (ageS > MAX_TIMESTAMP_SKEW_S) return false;

  // Svix secret format: `whsec_<base64>`. Strip prefix if present.
  const keyB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let key: Buffer;
  try {
    key = Buffer.from(keyB64, "base64");
  } catch {
    return false;
  }

  const signed = `${id}.${ts}.${rawBody}`;
  const expected = createHmac("sha256", key).update(signed).digest();

  // Header is space-separated `v1,<sig>` entries; any match is OK.
  for (const part of sigHeader.split(" ")) {
    const [version, sigB64] = part.split(",");
    if (version !== "v1" || !sigB64) continue;
    let actual: Buffer;
    try {
      actual = Buffer.from(sigB64, "base64");
    } catch {
      continue;
    }
    if (
      actual.length === expected.length &&
      timingSafeEqual(actual, expected)
    ) {
      return true;
    }
  }
  return false;
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json(
      { error: "Resend webhook not configured" },
      { status: 503 },
    );
  }

  const raw = await request.text();
  if (!verifySvixSignature(raw, request.headers, secret)) {
    return Response.json({ error: "Signature mismatch" }, { status: 400 });
  }

  let payload: ResendEvent;
  try {
    payload = JSON.parse(raw) as ResendEvent;
  } catch {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = await createSupabaseServer();

  // Tags carry the campaign_id we attached at send time.
  const campaignTag = payload.data.tags?.find((t) => t.name === "campaign_id");
  const campaignId = campaignTag?.value;

  await supabase.from("activity_log").insert({
    studio_id: STUDIO_ID,
    type: `resend_${payload.type}`,
    payload: payload.data as unknown as Json,
  });

  // TODO: flesh out per-type updates against campaign_recipients +
  // campaigns.open_count / click_count / bounce_count. Pending the
  // marketing migration (0007).
  void campaignId;

  return Response.json({ received: true });
}
