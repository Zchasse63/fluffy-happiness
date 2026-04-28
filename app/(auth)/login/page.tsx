/*
 * Login — magic-link / OTP only. No password. Branded with the same
 * Atelier palette as the rest of Meridian. Landing here means the
 * caller wasn't authenticated; on submit we kick off Supabase Auth's
 * email OTP flow and tell the user to check their inbox.
 */

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "linear-gradient(135deg, var(--bg) 0%, var(--surface) 60%, var(--accent-soft) 140%)",
      }}
    >
      <div
        style={{
          width: "min(440px, 100%)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          boxShadow: "var(--shadow-lg)",
          padding: 32,
        }}
      >
        <div className="row" style={{ gap: 12, marginBottom: 24 }}>
          <div className="brand-mark" aria-hidden />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span
              style={{
                fontFamily: "var(--serif)",
                fontSize: 18,
                letterSpacing: "-0.01em",
              }}
            >
              The Sauna Guys
            </span>
            <span
              className="mono"
              style={{
                fontSize: 9.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--text-3)",
              }}
            >
              Tampa · Meridian
            </span>
          </div>
        </div>
        <h1
          className="serif"
          style={{
            fontSize: 32,
            letterSpacing: "-0.02em",
            margin: "0 0 12px",
            fontWeight: 500,
          }}
        >
          Sign in
        </h1>
        <p
          className="muted"
          style={{ marginBottom: 24, fontSize: 13.5, lineHeight: 1.6 }}
        >
          Enter your work email — we&apos;ll send you a link to log in. No
          passwords here.
        </p>
        <LoginForm searchParams={searchParams} />
        <div
          className="mono text-3"
          style={{
            marginTop: 20,
            fontSize: 10.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          Owners + managers only · members use the app
        </div>
      </div>
    </div>
  );
}
