"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/icon";

/*
 * Command palette — global search + actions surface (SPEC §1.1).
 * Navigation entries route via Next.js client navigation. Action entries
 * are stubs for now (the eventual implementation runs server actions).
 *
 * Eventually this should fuzzy-search across members/classes/transactions
 * via a fuse.js index. For now it filters a static seeded list — same as
 * the prototype.
 */

type CommandItem = {
  label: string;
  scope: "Nav" | "Action" | "Member" | "Trainer" | "Class";
  go?: string;
};

const ITEMS: CommandItem[] = [
  { label: "Go to Command Center", scope: "Nav", go: "/" },
  { label: "Go to Schedule", scope: "Nav", go: "/schedule/calendar" },
  { label: "Go to Members", scope: "Nav", go: "/members/directory" },
  { label: "Go to Revenue", scope: "Nav", go: "/revenue/overview" },
  { label: "Go to Marketing", scope: "Nav", go: "/marketing/overview" },
  { label: "Go to Analytics", scope: "Nav", go: "/analytics" },
  { label: "Go to Operations · Staff", scope: "Nav", go: "/operations/staff" },
  { label: "Go to Settings", scope: "Nav", go: "/settings" },
  { label: "> New class", scope: "Action", go: "/schedule/calendar" },
  { label: "> New campaign", scope: "Action", go: "/marketing/campaigns" },
  { label: "> Refund transaction", scope: "Action", go: "/revenue/transactions" },
  { label: "> Record walk-in payment", scope: "Action", go: "/revenue/overview" },
  { label: "> Export daily report", scope: "Action" },
  { label: "Alex Park — Monthly Unlimited", scope: "Member", go: "/members/directory" },
  { label: "Sim Harmon — 10-pack", scope: "Member", go: "/members/directory" },
  { label: "Ben Kniesly — Payment failed", scope: "Member", go: "/members/directory" },
  { label: "Whitney Abrams — Guided", scope: "Trainer", go: "/operations/staff" },
  { label: "Trent Lott — Guided", scope: "Trainer", go: "/operations/staff" },
  { label: "Wed 7pm Guided Sauna", scope: "Class", go: "/schedule/calendar" },
  { label: "Tue 6pm Open Sauna", scope: "Class", go: "/schedule/calendar" },
];

const SCOPE_ICON = {
  Nav: "arrow-right",
  Action: "sparkle",
  Member: "user",
  Trainer: "user",
  Class: "box",
} as const;

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return ITEMS;
    return ITEMS.filter((i) => i.label.toLowerCase().includes(term));
  }, [q]);

  useEffect(() => setSel(0), [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSel((s) => Math.min(filtered.length - 1, s + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSel((s) => Math.max(0, s - 1));
      } else if (e.key === "Enter") {
        const it = filtered[sel];
        if (it?.go) {
          router.push(it.go);
          onClose();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, sel, router, onClose]);

  if (!open) return null;

  return (
    <div className="cmdk-back" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk-input">
          <Icon name="search" size={16} />
          <input
            autoFocus
            placeholder="Type a command or search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span
            className="mono"
            style={{ fontSize: 10, color: "var(--text-3)" }}
          >
            esc
          </span>
        </div>
        <div className="cmdk-results">
          {filtered.length === 0 && (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--text-2)",
              }}
            >
              No matches
            </div>
          )}
          {filtered.map((it, i) => (
            <div
              key={`${it.label}-${i}`}
              className={`cmdk-row ${i === sel ? "sel" : ""}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => {
                if (it.go) router.push(it.go);
                onClose();
              }}
            >
              <Icon name={SCOPE_ICON[it.scope]} size={14} />
              <span>{it.label}</span>
              <span className="scope">{it.scope}</span>
            </div>
          ))}
        </div>
        <div className="cmdk-foot">
          <span>↑↓ to navigate · ↵ to select</span>
          <span>esc to close</span>
        </div>
      </div>
    </div>
  );
}
