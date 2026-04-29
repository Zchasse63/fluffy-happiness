/*
 * Focus queue card — list of ranked items the operator should act on.
 * Accepts either the live `FocusItem` shape from `lib/data/command-center`
 * or the matching fixture shape from `lib/fixtures` — both share the
 * visual fields below.
 */

import { Icon } from "@/components/icon";
import { SectionHead } from "@/components/primitives";

export type FocusQueueItem = {
  p: "P1" | "P2" | "P3";
  pc: "neg" | "warn" | "info";
  title: string;
  meta: string;
  cta: string;
  href: string;
};

const ACCENT_BY_TONE: Record<FocusQueueItem["pc"], { fg: string; soft: string }> = {
  neg: { fg: "var(--neg)", soft: "var(--neg-soft)" },
  warn: { fg: "var(--warn)", soft: "var(--warn-soft)" },
  info: { fg: "var(--cobalt)", soft: "var(--cobalt-soft)" },
};

export function FocusQueueCard({
  items,
  totalLabelCount,
}: {
  items: FocusQueueItem[];
  totalLabelCount: number;
}) {
  return (
    <div className="card">
      <SectionHead
        right={
          <span
            className="mono text-3"
            style={{
              fontSize: 10.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {totalLabelCount} items
          </span>
        }
      >
        Focus queue
      </SectionHead>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map((r, i) => {
          const { fg, soft } = ACCENT_BY_TONE[r.pc];
          return (
            <a
              key={`${r.title}-${i}`}
              href={r.href}
              className="hov"
              style={{
                display: "grid",
                gridTemplateColumns: "42px 1fr auto",
                alignItems: "center",
                gap: 12,
                padding: "12px 6px",
                borderBottom:
                  i < items.length - 1 ? "1px solid var(--border)" : "none",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              <span
                className="badge"
                style={{
                  background: soft,
                  color: fg,
                  justifyContent: "center",
                }}
              >
                {r.p}
              </span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.title}</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                  {r.meta}
                </div>
              </div>
              <span
                className="btn btn-ghost hov"
                style={{ height: 28, fontSize: 12 }}
              >
                {r.cta} <Icon name="arrow-right" size={11} />
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
