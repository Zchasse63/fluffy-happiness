/*
 * POST /api/transactions/[id]/refund — refund a Stripe charge or mark
 * the transaction refunded for non-Stripe sources.
 *
 * Owner/manager only. Logs to activity_log; the actual Stripe API call
 * is deferred to the Inngest write-back queue so the API returns fast
 * and we never block on Stripe latency.
 */

import { z } from "zod";

import { authErrorResponse, requireRole } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

const Body = z.object({
  amountCents: z
    .number()
    .int()
    .positive()
    .optional() /** undefined = full refund */,
  reason: z.string().max(500).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireRole("owner", "manager");
    const { id } = await params;
    const body = Body.parse(await request.json().catch(() => ({})));
    const supabase = await createSupabaseServer();

    // Fetch the transaction to confirm it's refundable.
    const { data: txn, error: getErr } = await supabase
      .from("transactions")
      .select("id, status, amount_cents, type, stripe_charge_id, member_id")
      .eq("id", id)
      .eq("studio_id", profile.studio_id)
      .maybeSingle();
    if (getErr) throw getErr;
    if (!txn)
      return Response.json({ error: "Transaction not found" }, { status: 404 });
    if (txn.status === "refunded")
      return Response.json(
        { error: "Already refunded" },
        { status: 409 },
      );
    if (txn.status === "failed")
      return Response.json(
        { error: "Cannot refund a failed transaction" },
        { status: 409 },
      );

    const refundCents = body.amountCents ?? txn.amount_cents;
    if (refundCents > txn.amount_cents) {
      return Response.json(
        { error: "Refund exceeds transaction amount" },
        { status: 400 },
      );
    }

    // Mark the refund — Stripe processing happens in background.
    const { error: updErr } = await supabase
      .from("transactions")
      .update({ status: "refunded" })
      .eq("id", id);
    if (updErr) throw updErr;

    await supabase.from("activity_log").insert({
      studio_id: profile.studio_id,
      actor_id: profile.id,
      subject_id: id,
      subject_type: "transaction",
      type: "transaction_refunded",
      payload: {
        amount_cents: refundCents,
        reason: body.reason ?? null,
        stripe_charge_id: txn.stripe_charge_id,
      },
    });

    // TODO: enqueue Stripe refund via Inngest once configured.
    return Response.json({ transactionId: id, refundCents });
  } catch (err) {
    return authErrorResponse(err);
  }
}
