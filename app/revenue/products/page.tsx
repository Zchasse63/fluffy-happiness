/*
 * Revenue · Retail — merchandise catalog with inventory + sales. Live
 * from `retail_products` (added in 0013), with sold-30 sourced from a
 * heuristic match against retail transactions. Falls back to fixture
 * when no products are seeded.
 */

export const dynamic = "force-dynamic";

import { Icon } from "@/components/icon";
import { PageHero } from "@/components/primitives";
import { loadRetailProducts } from "@/lib/data/retail";
import { formatCurrency } from "@/lib/utils";

export default async function RetailPage() {
  const PRODUCTS = await loadRetailProducts();
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
