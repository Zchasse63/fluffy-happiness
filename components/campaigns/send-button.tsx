"use client";

/*
 * Send-campaign trigger. Hits POST /api/campaigns/[id]/send and
 * surfaces the Resend-pending message when the integration isn't
 * wired yet. The DB-side fan-out (recipient rows) succeeds either
 * way so reporting still has data to render.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Icon } from "@/components/icon";

export function SendCampaignButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();

  function handle() {
    if (!confirm("Send this campaign now? This cannot be undone.")) return;
    setMessage(null);
    setIsError(false);
    startTransition(async () => {
      const res = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!res.ok) {
        setIsError(true);
        setMessage(
          typeof body.error === "string" ? body.error : "Failed to send",
        );
        return;
      }
      setIsError(false);
      setMessage(
        typeof body.message === "string"
          ? body.message
          : "Campaign queued for delivery.",
      );
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-primary hov"
        style={{ fontSize: 12 }}
        onClick={handle}
        disabled={pending}
      >
        <Icon name="send" size={12} /> {pending ? "Sending…" : "Send"}
      </button>
      {message && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: isError ? "var(--neg-soft)" : "var(--pos-soft)",
            color: isError ? "var(--neg)" : "var(--pos)",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 12.5,
            maxWidth: 360,
            zIndex: 60,
          }}
          role="status"
          onClick={() => setMessage(null)}
        >
          {message}
        </div>
      )}
    </>
  );
}
