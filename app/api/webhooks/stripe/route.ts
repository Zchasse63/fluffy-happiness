/*
 * POST /api/webhooks/stripe — Stripe webhook receiver.
 *
 * Verifies the signature using STRIPE_WEBHOOK_SECRET, dispatches by
 * event type, and writes to Supabase. The actual side-effects per event
 * are stubbed for now; uncomment + flesh out as Stripe is wired.
 *
 * Public route per the proxy's PUBLIC_PREFIXES allowlist.
 *
 * activity_log.studio_id is NOT NULL — single-tenant for now.
 */

import { STUDIO_ID } from "@/lib/constants";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return Response.json(
      { error: "Stripe webhook not configured" },
      { status: 503 },
    );
  }

  const raw = await request.text();
  type StripeEvent = { type: string; data: { object: Record<string, unknown> } };
  let event: StripeEvent;
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
    event = stripe.webhooks.constructEvent(
      raw,
      sig,
      secret,
    ) as unknown as StripeEvent;
  } catch (err) {
    return Response.json(
      {
        error: `Signature verification failed: ${
          err instanceof Error ? err.message : "unknown"
        }`,
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServer();
  // event.data.object is Stripe's `Record<string, unknown>` which is
  // structurally JSON-serializable; the DB column is `jsonb`. Cast
  // through unknown so TS accepts the assignment.
  const obj = event.data.object as unknown as Json;

  switch (event.type) {
    case "payment_intent.succeeded": {
      // TODO: insert / upsert into transactions
      await supabase.from("activity_log").insert({
        studio_id: STUDIO_ID,
        type: "stripe_payment_succeeded",
        payload: obj,
      });
      break;
    }
    case "invoice.payment_failed": {
      await supabase.from("activity_log").insert({
        studio_id: STUDIO_ID,
        type: "stripe_payment_failed",
        payload: obj,
      });
      break;
    }
    case "customer.subscription.updated": {
      await supabase.from("activity_log").insert({
        studio_id: STUDIO_ID,
        type: "stripe_subscription_updated",
        payload: obj,
      });
      break;
    }
    case "charge.dispute.created": {
      await supabase.from("activity_log").insert({
        studio_id: STUDIO_ID,
        type: "stripe_dispute_created",
        payload: obj,
      });
      break;
    }
    default:
      // Fine — Stripe sends a lot of types we don't care about.
      break;
  }

  return Response.json({ received: true });
}
