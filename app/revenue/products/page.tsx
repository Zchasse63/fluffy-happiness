/*
 * Revenue · Retail — merchandise catalog with inventory + sales.
 */

import { Icon } from "@/components/icon";
import { PageHero } from "@/components/primitives";
import { formatCurrency } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  inventory: number;
  threshold: number;
  sold30: number;
  active: boolean;
};

const PRODUCTS: Product[] = [
  { id: "r1", name: "Sauna towel · cotton", category: "Apparel", priceCents: 2400, inventory: 42, threshold: 12, sold30: 18, active: true },
  { id: "r2", name: "Cold plunge thermal robe", category: "Apparel", priceCents: 8800, inventory: 8, threshold: 6, sold30: 11, active: true },
  { id: "r3", name: "Sweat brush · birch", category: "Accessories", priceCents: 1800, inventory: 26, threshold: 10, sold30: 24, active: true },
  { id: "r4", name: "Eucalyptus oil · 30ml", category: "Aromatherapy", priceCents: 1200, inventory: 4, threshold: 8, sold30: 41, active: true },
  { id: "r5", name: "Cigar City Brewing collab tee", category: "Apparel", priceCents: 3200, inventory: 16, threshold: 8, sold30: 7, active: true },
  { id: "r6", name: "Birch bundle · house steam", category: "Aromatherapy", priceCents: 900, inventory: 0, threshold: 12, sold30: 16, active: false },
];

export default function RetailPage() {
  return (
    <>
      <PageHero
        meta="Catalog · Tampa"
        title="Retail"
        subtitle="Merchandise sold at the front desk and at the post-class checkout."
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Export inventory
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="plus" size={13} /> New product
            </button>
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        {PRODUCTS.map((p) => {
          const lowStock = p.inventory <= p.threshold;
          const oos = p.inventory === 0;
          return (
            <div
              key={p.id}
              className="card"
              style={{ padding: 18, opacity: p.active ? 1 : 0.6 }}
            >
              <div
                style={{
                  height: 120,
                  borderRadius: 10,
                  background:
                    "linear-gradient(135deg, var(--surface-2) 0%, var(--surface-3) 100%)",
                  border: "1px solid var(--border)",
                  marginBottom: 14,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <span
                  className="serif"
                  style={{
                    fontSize: 32,
                    letterSpacing: "-0.02em",
                    color: "var(--text-3)",
                  }}
                >
                  {p.category[0]}
                </span>
              </div>
              <div
                className="row"
                style={{
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: "var(--text-3)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {p.category}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 14, fontWeight: 600 }}
                >
                  {formatCurrency(p.priceCents)}
                </span>
              </div>
              <div
                style={{
                  fontSize: 14.5,
                  fontWeight: 600,
                  marginBottom: 14,
                  lineHeight: 1.3,
                }}
              >
                {p.name}
              </div>
              <div
                className="row"
                style={{
                  justifyContent: "space-between",
                  paddingTop: 10,
                  borderTop: "1px dashed var(--border)",
                }}
              >
                <div>
                  <div className="metric-label">Stock</div>
                  <span
                    className="mono"
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: oos
                        ? "var(--neg)"
                        : lowStock
                          ? "var(--warn)"
                          : "var(--text)",
                    }}
                  >
                    {p.inventory} {oos && "· out"}
                    {lowStock && !oos && "· low"}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="metric-label">Sold · 30d</div>
                  <span
                    className="mono"
                    style={{ fontSize: 14, fontWeight: 600 }}
                  >
                    {p.sold30}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
