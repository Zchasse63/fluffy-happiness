"use client";

import { useState } from "react";

import { Icon } from "@/components/icon";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export function LoginForm({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; error?: string }>;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError(null);
    try {
      const supabase = createSupabaseBrowser();
      const next = searchParams ? (await searchParams).next : undefined;
      const redirectTo = `${window.location.origin}/auth/callback${
        next ? `?next=${encodeURIComponent(next)}` : ""
      }`;
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (err) throw err;
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (status === "sent") {
    return (
      <div
        style={{
          padding: 18,
          borderRadius: 12,
          background: "var(--pos-soft)",
          border: "1px solid var(--pos)",
          color: "var(--pos)",
        }}
      >
        <div className="row" style={{ gap: 8, marginBottom: 6, fontWeight: 600 }}>
          <Icon name="check" size={14} /> Check your inbox
        </div>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>
          We sent a magic link to <strong>{email}</strong>. The link expires in
          5 minutes — open it from the same browser.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <label
        className="metric-label"
        htmlFor="email"
        style={{ display: "block", marginBottom: 6 }}
      >
        Work email
      </label>
      <input
        id="email"
        type="email"
        autoFocus
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="zach@thesaunaguys.com"
        style={{
          width: "100%",
          height: 42,
          padding: "0 14px",
          border: "1px solid var(--border)",
          borderRadius: 10,
          background: "var(--surface-2)",
          fontSize: 14,
          color: "var(--text)",
          outline: "none",
        }}
      />
      <button
        type="submit"
        className="btn btn-primary hov"
        disabled={status === "sending"}
        style={{
          width: "100%",
          height: 42,
          marginTop: 14,
          fontSize: 14,
          justifyContent: "center",
          opacity: status === "sending" ? 0.7 : 1,
        }}
      >
        {status === "sending" ? "Sending…" : "Send magic link"}{" "}
        <Icon name="arrow-right" size={12} />
      </button>
      {error && (
        <div
          style={{
            marginTop: 10,
            padding: "8px 12px",
            borderRadius: 9,
            background: "var(--neg-soft)",
            color: "var(--neg)",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
    </form>
  );
}
