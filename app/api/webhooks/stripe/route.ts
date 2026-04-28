/*
 * POST /api/webhooks/stripe — Stripe webhook receiver.
 *
 * Verifies the signature using STRIPE_WEBHOOK_SECRET, dispatches by
 * event type, and writes to Supabase. The actual side-effects per event
 * are stubbed for now; uncomment + flesh out as Stripe is wired.
 *
 * Public route per the proxy's PUBLIC_PREFIXES allowlist.
 */

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
  const obj = event.data.object;

  switch (event.type) {
    case "payment_intent.succeeded": {
      // TODO: insert / upsert into transactions
      await supabase.from("activity_log").insert({
        type: "stripe_payment_succeeded",
        payload: obj,
      });
      break;
    }
    case "invoice.payment_failed": {
      await supabase.from("activity_log").insert({
        type: "stripe_payment_failed",
        payload: obj,
      });
      break;
    }
    case "customer.subscription.updated": {
      await supabase.from("activity_log").insert({
        type: "stripe_subscription_updated",
        payload: obj,
      });
      break;
    }
    case "charge.dispute.created": {
      await supabase.from("activity_log").insert({
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
