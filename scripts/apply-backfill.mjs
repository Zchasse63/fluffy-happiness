/*
 * Apply each backfill payload via PostgREST → backfill_* RPCs.
 *
 * The RPCs were created via Supabase MCP and granted EXECUTE to anon,
 * so the publishable key is enough auth.
 *
 * Order matters: members must exist before bookings/transactions, and
 * events before bookings.
 */

import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!URL || !KEY) throw new Error("Supabase env missing");

const PAYLOAD_DIR = "/tmp/meridian-backfill/payloads";

// Each entity → which RPC + ordering
const PHASES = [
  { entity: "members", rpc: "backfill_members" },
  { entity: "events", rpc: "backfill_events" },
  { entity: "bookings", rpc: "backfill_bookings" },
  { entity: "transactions", rpc: "backfill_transactions" },
];

async function callRpc(name, payload) {
  const res = await fetch(`${URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({ payload }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${name} ${res.status} — ${body.slice(0, 240)}`);
  }
  return res.json();
}

console.log("=== Applying backfill via PostgREST ===\n");

for (const { entity, rpc } of PHASES) {
  const files = readdirSync(PAYLOAD_DIR)
    .filter((f) => f.startsWith(`${entity}_`) && f.endsWith(".json"))
    .sort();
  console.log(`→ ${entity} (${files.length} batches)`);
  let total = 0;
  for (const f of files) {
    const payload = JSON.parse(readFileSync(`${PAYLOAD_DIR}/${f}`, "utf8"));
    try {
      const inserted = await callRpc(rpc, payload);
      total += Number(inserted) || 0;
      console.log(
        `  ✓ ${f.padEnd(28)} ${payload.length} sent → ${inserted} upserted (running ${total})`,
      );
    } catch (err) {
      console.error(`  ✗ ${f} — ${err.message}`);
      throw err;
    }
  }
  console.log(`  total upserts: ${total}\n`);
}

console.log("✓ backfill complete");
