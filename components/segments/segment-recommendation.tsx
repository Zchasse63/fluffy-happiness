"use client";

/*
 * "Suggest outreach" panel on a segment drill-down. Lazy — only fires
 * the AI call when the operator clicks the button. Renders subject /
 * email body / SMS variant / channel / rationale once the response
 * comes back, with a copy-to-clipboard for each piece.
 */

import { useCallback, useState } from "react";

import { Icon } from "@/components/icon";

type Recommendation = {
  segmentId: string;
  segmentName: string;
  subject: string;
  emailBody: string;
  smsVariant: string;
  recommendedChannel: "email" | "sms" | "both";
  rationale: string;
  priority: string;
};

type Props = {
  segmentId: string;
  segmentName: string;
};

export function SegmentRecommendation({ segmentId }: Props) {
  const [pending, setPending] = useState(false);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (force = false) => {
      setPending(true);
      setError(null);
      try {
        const url = `/api/ai/segment/${segmentId}/recommend${force ? "?force=1" : ""}`;
        const res = await fetch(url, { method: "POST" });
        const json = (await res.json()) as Recommendation & { error?: string };
        if (!res.ok && !json.subject) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        setRec(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate.");
      } finally {
        setPending(false);
      }
    },
    [segmentId],
  );

  if (!rec && !pending && !error) {
    return (
      <div
        className="card"
        style={{
          padding: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div className="serif" style={{ fontSize: 18, marginBottom: 4 }}>
            Suggest outreach for this segment
          </div>
          <div
            className="muted"
            style={{ fontSize: 13, color: "var(--text-2)" }}
          >
            Claude reads the cohort + a sample of people and drafts an
            email + SMS tuned to their behavior. Cached 1h per segment.
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary hov"
          onClick={() => generate(false)}
        >
          <Icon name="sparkle" size={13} /> Suggest outreach
        </button>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="card" style={{ padding: 18 }}>
        <div className="row" style={{ gap: 8, color: "var(--text-2)" }}>
          <Icon name="sparkle" size={13} /> Generating recommendation…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="card"
        style={{
          padding: 18,
          background: "var(--neg-soft)",
          color: "var(--neg)",
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <strong>Couldn&apos;t generate:</strong> {error}
        </div>
        <button
          type="button"
          className="btn btn-ghost hov"
          onClick={() => generate(false)}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!rec) return null;

  return (
    <div className="card" style={{ padding: 22 }}>
      <div
        className="row"
        style={{ justifyContent: "space-between", marginBottom: 12 }}
      >
        <div className="row" style={{ gap: 8 }}>
          <span
            className="badge"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent-deep)",
            }}
          >
            <Icon name="sparkle" size={11} /> AI suggestion
          </span>
          <span
            className="badge"
            style={{
              background: "var(--surface-2)",
              color: "var(--text-2)",
              textTransform: "capitalize",
            }}
          >
            Channel: {rec.recommendedChannel}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-ghost hov"
          onClick={() => generate(true)}
          style={{ fontSize: 12 }}
        >
          <Icon name="spark" size={11} /> Regenerate
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div
          className="metric-label"
          style={{ marginBottom: 4 }}
        >
          Subject
        </div>
        <div
          className="serif"
          style={{ fontSize: 22, lineHeight: 1.25, marginBottom: 8 }}
        >
          {rec.subject}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="metric-label" style={{ marginBottom: 4 }}>
          Email body
        </div>
        <div
          style={{
            whiteSpace: "pre-wrap",
            background: "var(--surface-2)",
            padding: 14,
            borderRadius: 10,
            fontSize: 13.5,
            lineHeight: 1.6,
            color: "var(--text)",
          }}
        >
          {rec.emailBody}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="metric-label" style={{ marginBottom: 4 }}>
          SMS variant
        </div>
        <div
          style={{
            background: "var(--surface-2)",
            padding: 14,
            borderRadius: 10,
            fontSize: 13.5,
            lineHeight: 1.6,
            color: "var(--text)",
          }}
        >
          {rec.smsVariant}
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          color: "var(--text-2)",
          fontStyle: "italic",
        }}
      >
        Why this approach: {rec.rationale}
      </div>
    </div>
  );
}
