/*
 * Retail catalog + gift card queries. Live from `retail_products` +
 * `gift_cards` (added in 0013). Each falls back to a small fixture
 * when empty so the page renders something useful.
 *
 * Sold-30 counts are sourced from `transactions` rows with
 * type='retail' and a description matching the product name (a temp
 * heuristic until per-line-item joins land).
 */

import { STUDIO_ID } from "@/lib/constants";
import { fixtureFallback } from "@/lib/data/_log";
import { createSupabaseServer } from "@/lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;

export type RetailProduct = {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  inventory: number;
  threshold: number;
  sold30: number;
  active: boolean;
};

const PRODUCT_FIXTURE: RetailProduct[] = [
  {
    id: "p1",
    name: "Cedar bath towel",
    category: "merch",
    priceCents: 4500,
    inventory: 28,
    threshold: 10,
    sold30: 14,
    active: true,
  },
  {
    id: "p2",
    name: "Recovery hat",
    category: "merch",
    priceCents: 3500,
    inventory: 4,
    threshold: 8,
    sold30: 9,
    active: true,
  },
  {
    id: "p3",
    name: "Electrolyte mix · 20 ct",
    category: "supplements",
    priceCents: 3200,
    inventory: 16,
    threshold: 6,
    sold30: 18,
    active: true,
  },
];

export async function loadRetailProducts(): Promise<RetailProduct[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("retail_products")
    .select(
      "id, name, category, price_cents, inventory, reorder_threshold, is_active",
    )
    .eq("studio_id", STUDIO_ID)
    .order("name");

  const rows = data ?? [];
  if (!rows.length) return fixtureFallback(PRODUCT_FIXTURE, []);

  // Sold-30 heuristic: count completed retail transactions with a
  // description matching the product name (case-insensitive).
  const since = new Date(Date.now() - 30 * DAY_MS).toISOString();
  const { data: txns } = await supabase
    .from("transactions")
    .select("description")
    .eq("studio_id", STUDIO_ID)
    .eq("type", "retail")
    .eq("status", "completed")
    .gte("occurred_at", since);
  const counts = new Map<string, number>();
  for (const t of txns ?? []) {
    const key = (t.description ?? "").toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return rows.map<RetailProduct>((r) => ({
    id: r.id,
    name: r.name,
    category: r.category ?? "merch",
    priceCents: r.price_cents ?? 0,
    inventory: r.inventory ?? 0,
    threshold: r.reorder_threshold ?? 0,
    sold30: counts.get(r.name.toLowerCase()) ?? 0,
    active: r.is_active ?? true,
  }));
}

export type GiftCardRow = {
  id: string;
  recipient: string;
  amountCents: number;
  remainingCents: number;
  issuedBy: string;
  issued: string;
  status: "active" | "redeemed" | "expired" | "voided";
  seed: number;
};

const CARD_FIXTURE: GiftCardRow[] = [
  {
    id: "g1",
    recipient: "Carter Hill",
    amountCents: 10000,
    remainingCents: 7500,
    issuedBy: "Front desk",
    issued: "Apr 18",
    status: "active",
    seed: 14,
  },
  {
    id: "g2",
    recipient: "Sasha Bell",
    amountCents: 5000,
    remainingCents: 0,
    issuedBy: "Whitney",
    issued: "Apr 5",
    status: "redeemed",
    seed: 27,
  },
];

function fmtMonthDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

type CardRow = {
  id: string;
  amount_cents: number;
  balance_cents: number;
  recipient_name: string | null;
  issued_at: string;
  status: GiftCardRow["status"];
  profiles: { full_name: string | null } | null;
};

export async function loadGiftCards(): Promise<GiftCardRow[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("gift_cards")
    .select(
      "id, amount_cents, balance_cents, recipient_name, issued_at, status, profiles!gift_cards_issued_by_fkey(full_name)",
    )
    .eq("studio_id", STUDIO_ID)
    .order("issued_at", { ascending: false })
    .limit(50)
    .returns<CardRow[]>();

  const rows = data ?? [];
  if (!rows.length) return fixtureFallback(CARD_FIXTURE, []);

  return rows.map<GiftCardRow>((r, i) => ({
    id: r.id,
    recipient: r.recipient_name ?? "—",
    amountCents: r.amount_cents,
    remainingCents: r.balance_cents,
    issuedBy: r.profiles?.full_name ?? "Front desk",
    issued: fmtMonthDay(r.issued_at),
    status: r.status,
    seed: i + 1,
  }));
}
