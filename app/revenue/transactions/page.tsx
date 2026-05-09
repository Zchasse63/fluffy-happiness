/*
 * Revenue · Transactions — filterable transaction log with refund and
 * dispute action buttons. Negative amounts render as refunds.
 *
 * Live data via `loadTransactions`; falls back to fixtures when DB is
 * empty.
 */

export const dynamic = "force-dynamic";

import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { EmptyTableState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import {
  PageHero,
  SearchBar,
  TableHead,
} from "@/components/primitives";
import { ToneBadge } from "@/components/status-pill";
import { TransactionActionButton } from "@/components/transaction-action-button";
import { loadTransactions } from "@/lib/data/revenue";
import { TRANSACTION_KIND_META, type Transaction } from "@/lib/fixtures";
import { formatCurrency } from "@/lib/utils";

const STATUS_FILTERS: Array<{ label: string; value: Transaction["status"] | null }> = [
  { label: "All", value: null },
  { label: "Completed", value: "completed" },
  { label: "Refunded", value: "refunded" },
  { label: "Failed", value: "failed" },
];

const TABLE_COLUMNS = [
  { label: "Time" },
  { label: "Member" },
  { label: "Description" },
  { label: "Kind" },
  { label: "Status" },
  { label: "Amount", align: "right" as const },
  { label: "", align: "right" as const },
];

export default async function RevenueTransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const search = params.q ?? "";
  // Validate status param against the allowed enum so a hostile URL
  // can't smuggle arbitrary text into the SQL filter.
  const statusParam = STATUS_FILTERS.find((f) => f.value === params.status)?.value
    ?? null;

  const txns = await loadTransactions({
    limit: 100,
    search,
    status: statusParam ?? undefined,
  });

  return (
    <>
      <PageHero
        meta={`${txns.length} most recent · Tampa`}
        title="Transactions"
        subtitle="Every payment, refund, and chargeback. Filter by kind, status, or date range."
        actions={
          <>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="filter" size={13} /> Filters
            </button>
            <button type="button" className="btn btn-ghost hov">
              <Icon name="download" size={13} /> Export
            </button>
            <button type="button" className="btn btn-primary hov">
              <Icon name="plus" size={13} /> Record payment
            </button>
          </>
        }
      />

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <SearchBar placeholder="Search by member, amount, or txn id…" />
          {/* Pre-2026-05-08 these tabs were visual-only (no href, no
              handler). Now wired through the ?status= query param. */}
          <span className="tabs">
            {STATUS_FILTERS.map((f) => {
              const isActive = (statusParam ?? null) === f.value;
              const href = (() => {
                const u = new URLSearchParams();
                if (search) u.set("q", search);
                if (f.value) u.set("status", f.value);
                const qs = u.toString();
                return qs ? `?${qs}` : "?";
              })();
              return (
                <Link
                  key={f.label}
                  href={href}
                  className={`tab${isActive ? " active" : ""}`}
                >
                  {f.label}
                </Link>
              );
            })}
          </span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <TableHead columns={TABLE_COLUMNS} />
          <tbody>
            {txns.length === 0 && (
              <tr>
                <td colSpan={TABLE_COLUMNS.length} style={{ padding: 0 }}>
                  <EmptyTableState>
                    {search
                      ? `No transactions match “${search}”. Clear the search or widen the date range.`
                      : "No transactions yet. They'll appear here once Glofox or Stripe records the first one."}
                  </EmptyTableState>
                </td>
              </tr>
            )}
            {txns.map((t) => {
              const tone = TRANSACTION_KIND_META[t.kind];
              const refunded = t.status === "refunded";
              const failed = t.status === "failed";
              return (
                <tr
                  key={t.id}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td
                    className="mono text-3"
                    style={{
                      padding: "12px 14px",
                      fontSize: 11.5,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {t.occurred}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div className="row" style={{ gap: 10 }}>
                      <Avatar name={t.member} seed={t.seed ?? 0} size={26} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {t.member}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13 }}>
                    {t.description}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <ToneBadge tone={tone}>{tone.label}</ToneBadge>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      className="badge"
                      style={{
                        background: refunded
                          ? "var(--surface-3)"
                          : failed
                            ? "var(--neg-soft)"
                            : "var(--pos-soft)",
                        color: refunded
                          ? "var(--text-2)"
                          : failed
                            ? "var(--neg)"
                            : "var(--pos)",
                      }}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td
                    className="mono"
                    style={{
                      padding: "12px 14px",
                      textAlign: "right",
                      fontSize: 13,
                      fontWeight: 600,
                      color:
                        t.amountCents < 0
                          ? "var(--neg)"
                          : failed
                            ? "var(--text-3)"
                            : "var(--text)",
                    }}
                  >
                    {formatCurrency(t.amountCents)}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    {!refunded && !failed && (
                      <TransactionActionButton txnId={t.id} action="refund" />
                    )}
                    {failed && (
                      <TransactionActionButton txnId={t.id} action="retry" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
