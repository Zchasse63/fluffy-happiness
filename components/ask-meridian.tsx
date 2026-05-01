"use client";

import { useState } from "react";

import { Icon } from "@/components/icon";

type AskResult = {
  answer: string;
  followups: string[];
};

const SUGGESTIONS = [
  "Who hasn't booked in 21 days?",
  "Top 5 days by revenue this month",
  "Average fill of Whitney's classes",
];

export function AskMeridian() {
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = async (q: string) => {
    if (!q.trim() || pending) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const json = (await res.json()) as Partial<AskResult> & {
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setResult({
        answer: json.answer ?? "",
        followups: json.followups ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      id="ask-meridian"
      className="card"
      style={{
        background:
          "linear-gradient(135deg, #1B140A 0%, #2A1E10 55%, #3B2413 100%)",
        borderColor: "var(--accent-deep)",
        color: "#F4E6D0",
        padding: 24,
        position: "relative",
        overflow: "hidden",
        // Leave clearance for the sticky topbar when navigated via #anchor.
        scrollMarginTop: 80,
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -60,
          top: -60,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
          opacity: 0.35,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative" }}>
        <div
          className="row"
          style={{
            gap: 8,
            marginBottom: 12,
            color: "#F4BA8A",
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          <Icon name="sparkle" size={13} /> Ask Meridian · beta
        </div>
        <div
          className="serif"
          style={{
            fontSize: 32,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            marginBottom: 18,
            color: "#FBF0E3",
            maxWidth: 760,
            textWrap: "pretty",
          }}
        >
          Ask a question about your studio. Meridian will read your data and
          answer in plain English.
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
          className="row"
          style={{
            gap: 10,
            background: "rgba(251,240,227,0.08)",
            border: "1px solid rgba(251,240,227,0.18)",
            borderRadius: 14,
            padding: "10px 14px",
            marginBottom: 14,
          }}
        >
          <Icon name="search" size={16} />
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="How many members booked both last week and this week?"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#F4E6D0",
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            className="btn btn-primary hov"
            style={{ height: 30, fontSize: 12.5 }}
            disabled={pending || !question.trim()}
          >
            {pending ? "Thinking…" : "Ask"} <Icon name="arrow-right" size={11} />
          </button>
        </form>
        <div
          className="row"
          style={{
            gap: 8,
            flexWrap: "wrap",
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "#D6BFA0",
          }}
        >
          <span>Try:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQuestion(s);
                void ask(s);
              }}
              className="hov"
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                padding: 0,
                cursor: "pointer",
                opacity: 0.85,
                font: "inherit",
              }}
            >
              “{s}”
            </button>
          ))}
        </div>

        {error && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(220, 38, 38, 0.18)",
              border: "1px solid rgba(220, 38, 38, 0.36)",
              color: "#FCA5A5",
              fontSize: 12.5,
            }}
          >
            {error}
          </div>
        )}

        {result && (
          <div
            style={{
              marginTop: 14,
              padding: 16,
              borderRadius: 12,
              background: "rgba(251,240,227,0.06)",
              border: "1px solid rgba(251,240,227,0.18)",
              color: "#FBF0E3",
              fontSize: 13.5,
              lineHeight: 1.55,
            }}
          >
            <div style={{ whiteSpace: "pre-wrap" }}>{result.answer}</div>
            {result.followups.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#F4BA8A",
                    marginBottom: 6,
                  }}
                >
                  Follow-ups
                </div>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {result.followups.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setQuestion(f);
                        void ask(f);
                      }}
                      className="hov"
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        background: "rgba(251,240,227,0.08)",
                        border: "1px solid rgba(251,240,227,0.16)",
                        color: "#F4E6D0",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
