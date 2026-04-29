"use client";

import { useState } from "react";

type Action = "refund" | "retry";

export function TransactionActionButton({
  txnId,
  action,
}: {
  txnId: string;
  action: Action;
}) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const click = async () => {
    if (pending || done) return;
    if (action === "refund") {
      const ok = window.confirm(
        "Issue a full refund for this transaction?",
      );
      if (!ok) return;
    }
    setPending(true);
    setError(null);
    try {
      if (action === "refund") {
        const res = await fetch(`/api/transactions/${txnId}/refund`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Issued from transactions table" }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        setDone(true);
      } else {
        // Retry: Stripe payment retry isn't wired yet — surface the
        // intent so the operator can act manually until then.
        setError("Stripe retry pending integration");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <span
        className="badge"
        style={{ background: "var(--surface-3)", color: "var(--text-2)" }}
      >
        {action === "refund" ? "Refunded" : "Retried"}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void click()}
        className={`btn ${action === "refund" ? "btn-ghost" : "btn-primary"} hov`}
        style={{ height: 26, fontSize: 11.5 }}
        disabled={pending}
      >
        {pending
          ? action === "refund"
            ? "Refunding…"
            : "Retrying…"
          : action === "refund"
            ? "Refund"
            : "Retry"}
      </button>
      {error && (
        <div
          className="mono"
          style={{
            marginTop: 4,
            fontSize: 10,
            color: "var(--neg)",
          }}
        >
          {error}
        </div>
      )}
    </>
  );
}
