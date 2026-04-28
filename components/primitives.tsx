/*
 * Shared visual primitives ported from the prototype's components.jsx.
 * Each one is intentionally simple — SVG only, no chart libraries — to
 * keep parity with the locked design contract.
 */

import { Icon, type IconName } from "./icon";

/* ───── ChangeBadge ────────────────────────────────────────────────── */

export function ChangeBadge({ value }: { value: string }) {
  const up = !value.startsWith("-");
  return (
    <span className={`badge ${up ? "badge-up" : "badge-down"}`}>
      <Icon name={up ? "arrow-up" : "arrow-down"} size={10} stroke={2.4} />
      {value.replace("+", "").replace("-", "")}
    </span>
  );
}

/* ───── SectionHead ────────────────────────────────────────────────── */

export function SectionHead({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="section-head">
      <h2>{children}</h2>
      {right && <div className="row" style={{ gap: 8 }}>{right}</div>}
    </div>
  );
}

/* ───── StatusDot ──────────────────────────────────────────────────── */

export function StatusDot({
  status,
}: {
  status: "active" | "draft" | "offline";
}) {
  const cls =
    status === "active"
      ? "dot-active"
      : status === "draft"
        ? "dot-draft"
        : "dot-offline";
  return <span className={`dot-status ${cls}`} />;
}

/* ───── LineChart ──────────────────────────────────────────────────── */

type LineChartProps = {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  fill?: boolean;
};

export function LineChart({
  data,
  color = "var(--accent-2)",
  height = 80,
  width = 220,
  fill = false,
}: LineChartProps) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map<[number, number]>((v, i) => [
    i * stepX,
    height - ((v - min) / range) * (height - 6) - 3,
  ]);
  let smooth = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    smooth += ` Q ${x1} ${y1} ${(x1 + x2) / 2} ${(y1 + y2) / 2} T ${x2} ${y2}`;
  }
  return (
    <div
      className="anno-chart"
      style={{ width, height, position: "relative" }}
    >
      <svg
        width={width}
        height={height}
        style={{ display: "block", overflow: "visible" }}
      >
        {fill && (
          <path
            d={`${smooth} L ${width} ${height} L 0 ${height} Z`}
            fill={color}
            opacity="0.08"
          />
        )}
        <path
          d={smooth}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/* ───── Donut ──────────────────────────────────────────────────────── */

export function Donut({
  value,
  size = 110,
  stroke = 12,
  color = "var(--text)",
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--surface-3)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
        >
          <div className="serif" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>
            {value}%
          </div>
          {label && (
            <div
              className="mono"
              style={{
                fontSize: 9,
                color: "var(--text-2)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───── KPI strip ──────────────────────────────────────────────────── */

export type Kpi = {
  label: string;
  value: string;
  delta: string;
  foot: string;
  dot: string;
  spark: number[];
};

export function KpiStrip({ items }: { items: Kpi[] }) {
  return (
    <div className="card card-tight" style={{ overflow: "hidden" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${items.length}, 1fr)`,
          alignItems: "stretch",
        }}
      >
        {items.map((k, i) => (
          <div
            key={k.label}
            style={{
              padding: "20px 22px",
              borderRight:
                i < items.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <div
              className="row"
              style={{ gap: 8, alignItems: "center", marginBottom: 10 }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 2,
                  background: k.dot,
                }}
              />
              <div className="metric-label" style={{ margin: 0 }}>
                {k.label}
              </div>
            </div>
            <div className="big" style={{ fontSize: 44, marginBottom: 10 }}>
              {k.value}
            </div>
            <div
              className="row"
              style={{
                gap: 8,
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <ChangeBadge value={k.delta === "±0" ? "+0" : k.delta} />
                <span className="muted" style={{ fontSize: 11 }}>{k.foot}</span>
              </div>
              <LineChart
                data={k.spark}
                width={60}
                height={26}
                color={k.dot}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───── IDA Insight Card (Insight → Detail → Action) ─────────────── */

export type Insight = {
  rank: "P1" | "P2" | "P3" | "P4";
  tone: "neg" | "warn" | "info" | "pos";
  kicker: string;
  headline: string;
  data: Array<[string, string]>;
  body: string;
  action: string;
  altAction?: string;
  href?: string;
};

const TONE_COLORS: Record<Insight["tone"], { fg: string; soft: string }> = {
  neg: { fg: "var(--neg)", soft: "var(--neg-soft)" },
  warn: { fg: "var(--warn)", soft: "var(--warn-soft)" },
  info: { fg: "var(--cobalt)", soft: "var(--cobalt-soft)" },
  pos: { fg: "var(--pos)", soft: "var(--pos-soft)" },
};

export function InsightCard({
  insight,
  onDismiss,
}: {
  insight: Insight;
  onDismiss?: () => void;
}) {
  const { fg, soft } = TONE_COLORS[insight.tone];
  return (
    <div className="card" style={{ padding: 20, position: "relative" }}>
      <div
        className="row"
        style={{ justifyContent: "space-between", marginBottom: 10 }}
      >
        <span
          className="badge"
          style={{ background: soft, color: fg, letterSpacing: "0.08em" }}
        >
          {insight.rank} · {insight.kicker}
        </span>
        {onDismiss && (
          <button
            type="button"
            className="hov"
            onClick={onDismiss}
            style={{
              color: "var(--text-3)",
              fontSize: 16,
              lineHeight: 1,
              padding: 2,
            }}
            aria-label="Dismiss"
            title="Dismiss"
          >
            ×
          </button>
        )}
      </div>
      <div
        className="serif"
        style={{
          fontSize: 22,
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
          marginBottom: 12,
          textWrap: "pretty",
        }}
      >
        {insight.headline}
      </div>
      <div
        className="row"
        style={{
          gap: 18,
          marginBottom: 12,
          paddingBottom: 12,
          borderBottom: "1px dashed var(--border)",
        }}
      >
        {insight.data.map(([l, v]) => (
          <div key={l}>
            <div
              className="mono text-3"
              style={{
                fontSize: 9.5,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 3,
              }}
            >
              {l}
            </div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>
              {v}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: "var(--text-2)",
          lineHeight: 1.5,
          marginBottom: 14,
          textWrap: "pretty",
        }}
      >
        {insight.body}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <a
          className="btn btn-primary hov"
          style={{ height: 32, fontSize: 12.5 }}
          href={insight.href ?? "#"}
        >
          {insight.action} <Icon name="arrow-right" size={11} />
        </a>
        {insight.altAction && (
          <button
            type="button"
            className="btn btn-link hov"
            style={{ fontSize: 12 }}
          >
            {insight.altAction}
          </button>
        )}
      </div>
    </div>
  );
}

/* ───── PageHero ───────────────────────────────────────────────────── */

export function PageHero({
  meta,
  title,
  subtitle,
  actions,
}: {
  meta: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-hero">
      <div>
        <div className="meta">{meta}</div>
        <h1>{title}</h1>
        {subtitle && <p className="sub">{subtitle}</p>}
      </div>
      {actions && <div className="row" style={{ gap: 8 }}>{actions}</div>}
    </div>
  );
}

/* ───── ModuleStub (used by all stub pages) ────────────────────────── */

export function ModuleStub({
  crumb,
  title,
  message = "Phase 1 stub. Structure and data model are defined in the spec; this screen is reserved for the next build pass.",
}: {
  crumb: string[];
  title: string;
  message?: string;
}) {
  return (
    <div
      className="card"
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: 400,
        textAlign: "center",
        padding: 48,
      }}
    >
      <div>
        <div
          className="mono"
          style={{
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text-3)",
            marginBottom: 12,
          }}
        >
          {crumb.join(" · ")}
        </div>
        <div
          className="serif"
          style={{ fontSize: 44, letterSpacing: "-0.02em" }}
        >
          {title}
        </div>
        <div className="muted" style={{ marginTop: 12, maxWidth: 440, marginInline: "auto" }}>
          {message}
        </div>
        <a
          className="btn btn-primary hov"
          style={{ marginTop: 24 }}
          href="/"
        >
          Back to Command Center
        </a>
      </div>
    </div>
  );
}
