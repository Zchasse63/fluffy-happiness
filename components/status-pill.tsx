/*
 * StatusPill — membership status badge. Used on the members directory
 * + segments list + member profile. Centralized so the color/copy
 * mapping stays consistent across modules.
 *
 * ToneBadge is the generic sibling — pages that compute their own
 * tone (campaigns, corporate, leads, transactions, settings) feed
 * the resolved {fg, soft} pair in directly. Both render the same
 * <span className="badge" style={{ background, color }}> shape.
 */

import type { Member } from "@/lib/fixtures";

export type Tone = { fg: string; soft: string };

const STATUS_MAP: Record<Member["status"], Tone & { label: string }> = {
  active: { fg: "var(--pos)", soft: "var(--pos-soft)", label: "Active" },
  paused: { fg: "var(--warn)", soft: "var(--warn-soft)", label: "Paused" },
  cancelled: {
    fg: "var(--text-3)",
    soft: "var(--surface-3)",
    label: "Cancelled",
  },
  trialing: { fg: "var(--cobalt)", soft: "var(--cobalt-soft)", label: "Trial" },
};

export function StatusPill({ status }: { status: Member["status"] }) {
  const m = STATUS_MAP[status];
  return <ToneBadge tone={m}>{m.label}</ToneBadge>;
}

export function ToneBadge({
  tone,
  style,
  children,
}: {
  tone: Tone;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <span
      className="badge"
      style={{ background: tone.soft, color: tone.fg, ...style }}
    >
      {children}
    </span>
  );
}
