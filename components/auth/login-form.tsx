"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/icon";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Status = "idle" | "signing" | "error";

const URL_ERROR_COPY: Record<string, string> = {
  not_authorized:
    "That email isn't on the owner / manager allowlist. Ask an existing owner to invite you.",
  missing_code: "The magic link was incomplete — request a new one.",
  missing_email:
    "We couldn't read the email on that magic link — try sending a new one.",
};

export function LoginForm({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; error?: string }>;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [next, setNext] = useState<string>("/");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!searchParams) return;
    let active = true;
    void searchParams.then((p) => {
      if (!active) return;
      if (p.error) setError(URL_ERROR_COPY[p.error] ?? p.error);
      if (p.next?.startsWith("/") && !p.next.startsWith("//")) {
        setNext(p.next);
      }
    });
    return () => {
      active = false;
    };
  }, [searchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setStatus("signing");
    setError(null);
    try {
      const supabase = createSupabaseBrowser();
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      // Server components read auth from cookies, so a hard navigation
      // ensures the next page sees the freshly-set session.
      router.replace(next);
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error ? err.message : "Invalid email or password.",
      );
    }
  };

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
        autoComplete="email"
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
      <label
        className="metric-label"
        htmlFor="password"
        style={{ display: "block", marginTop: 14, marginBottom: 6 }}
      >
        Password
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
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
        disabled={status === "signing"}
        style={{
          width: "100%",
          height: 42,
          marginTop: 14,
          fontSize: 14,
          justifyContent: "center",
          opacity: status === "signing" ? 0.7 : 1,
        }}
      >
        {status === "signing" ? "Signing in…" : "Sign in"}{" "}
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
