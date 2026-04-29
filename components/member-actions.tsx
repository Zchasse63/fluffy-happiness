"use client";

import { useState } from "react";

import { Icon } from "@/components/icon";

type Status = "idle" | "pending" | "success" | "error";

export function MemberActions({ memberId }: { memberId: string }) {
  const [showCredit, setShowCredit] = useState(false);
  const [credit, setCredit] = useState<{
    type: "membership" | "flex" | "guest_pass" | "wallet";
    delta: number;
    reason: string;
  }>({ type: "flex", delta: 1, reason: "Issued from member profile" });
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const submitCredit = async () => {
    setStatus("pending");
    setMessage(null);
    try {
      const res = await fetch(`/api/members/${memberId}/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credit),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setStatus("success");
      setMessage(
        `Issued ${credit.delta} ${credit.type} credit${
          Math.abs(credit.delta) === 1 ? "" : "s"
        }.`,
      );
      setShowCredit(false);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Request failed");
    }
  };

  return (
    <>
      <div className="row" style={{ gap: 8 }}>
        <a
          href="/schedule/calendar"
          className="btn btn-primary hov"
          style={{ fontSize: 12.5 }}
        >
          <Icon name="plus" size={12} /> Book class
        </a>
        <button
          type="button"
          className="btn btn-ghost hov"
          style={{ fontSize: 12.5 }}
          title="Stripe integration pending — record manual payments via the
            Transactions module once wired."
          disabled
        >
          <Icon name="income" size={12} /> Record payment
        </button>
        <button
          type="button"
          className="btn btn-ghost hov"
          style={{ fontSize: 12.5 }}
          onClick={() => setShowCredit((v) => !v)}
        >
          <Icon name="income" size={12} /> Issue credit
        </button>
        <button
          type="button"
          className="btn btn-ghost hov"
          style={{ fontSize: 12.5 }}
          title="Notes table not yet wired"
          disabled
        >
          <Icon name="edit" size={12} /> Add note
        </button>
        <button
          type="button"
          className="btn btn-ghost hov"
          style={{ fontSize: 12.5 }}
          title="Resend integration pending"
          disabled
        >
          <Icon name="mail" size={12} /> Message
        </button>
      </div>

      {showCredit && (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 12,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 2fr auto",
            gap: 10,
            alignItems: "end",
          }}
        >
          <label style={{ fontSize: 12 }}>
            <div className="metric-label">Type</div>
            <select
              value={credit.type}
              onChange={(e) =>
                setCredit({
                  ...credit,
                  type: e.target.value as typeof credit.type,
                })
              }
              style={{
                width: "100%",
                height: 32,
                padding: "0 8px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--surface)",
                fontSize: 13,
              }}
            >
              <option value="flex">Flex</option>
              <option value="membership">Membership</option>
              <option value="guest_pass">Guest pass</option>
              <option value="wallet">Wallet (cents)</option>
            </select>
          </label>
          <label style={{ fontSize: 12 }}>
            <div className="metric-label">Delta</div>
            <input
              type="number"
              value={credit.delta}
              onChange={(e) =>
                setCredit({ ...credit, delta: Number(e.target.value) })
              }
              style={{
                width: "100%",
                height: 32,
                padding: "0 8px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--surface)",
                fontSize: 13,
              }}
            />
          </label>
          <label style={{ fontSize: 12 }}>
            <div className="metric-label">Reason</div>
            <input
              type="text"
              value={credit.reason}
              onChange={(e) => setCredit({ ...credit, reason: e.target.value })}
              style={{
                width: "100%",
                height: 32,
                padding: "0 8px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--surface)",
                fontSize: 13,
              }}
            />
          </label>
          <button
            type="button"
            className="btn btn-primary hov"
            disabled={status === "pending" || !credit.delta || !credit.reason}
            onClick={() => void submitCredit()}
            style={{ fontSize: 12.5, height: 32 }}
          >
            {status === "pending" ? "Issuing…" : "Apply"}
          </button>
        </div>
      )}

      {message && (
        <div
          style={{
            marginTop: 10,
            padding: "6px 12px",
            borderRadius: 8,
            background:
              status === "error" ? "var(--neg-soft)" : "var(--pos-soft)",
            color: status === "error" ? "var(--neg)" : "var(--pos)",
            fontSize: 12,
          }}
        >
          {message}
        </div>
      )}
    </>
  );
}
