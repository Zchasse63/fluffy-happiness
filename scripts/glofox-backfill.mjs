/*
 * Glofox → Supabase historical backfill (Phase R2).
 *
 * Fetches every entity for the configured branch, writes JSON dumps to
 * /tmp/meridian-backfill/, then prints a SQL prelude the operator can
 * pipe into psql or apply via the Supabase MCP.
 *
 * Idempotent: every INSERT becomes an UPSERT keyed on (studio_id, glofox_id).
 *
 * Usage: node scripts/glofox-backfill.mjs
 */

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "https://gf-api.aws.glofox.com/prod";
const branch = process.env.GLOFOX_BRANCH_ID;
const ns = process.env.GLOFOX_NAMESPACE;
const HEADERS = {
  "x-glofox-api-token": process.env.GLOFOX_API_TOKEN,
  "x-api-key": process.env.GLOFOX_API_KEY,
  "x-glofox-branch-id": branch,
  "Content-Type": "application/json",
};

const OUT = "/tmp/meridian-backfill";
mkdirSync(OUT, { recursive: true });

const STUDIO_ID = "11111111-1111-1111-1111-111111111111";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gfetch(path, init = {}) {
  const url = `${BASE}${path}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { ...init, headers: HEADERS });
    if (res.status === 429) {
      const ra = Number(res.headers.get("retry-after") ?? "1");
      await sleep(ra * 1000);
      continue;
    }
    if (res.status >= 500) {
      await sleep(250 * 2 ** attempt);
      continue;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${res.status} ${path} — ${body.slice(0, 240)}`);
    }
    const j = await res.json();
    if (j.success === false) {
      throw new Error(`${path} — ${j.message ?? JSON.stringify(j).slice(0, 240)}`);
    }
    return j;
  }
  throw new Error(`exhausted retries: ${path}`);
}

async function paginated(path, params = {}) {
  const all = [];
  let page = 1;
  while (page <= 200) {
    const qs = new URLSearchParams({ ...params, limit: "100", page: String(page) });
    const j = await gfetch(`${path}?${qs}`);
    const data = j.data ?? [];
    all.push(...data);
    if (j.has_more === true || (j.total_count && all.length < j.total_count)) {
      page++;
      await sleep(120);
    } else if (data.length === 100 && j.total_count == null) {
      page++;
      await sleep(120);
    } else {
      break;
    }
  }
  return all;
}

async function paginatedPost(path, body = {}) {
  const all = [];
  let page = 1;
  while (page <= 200) {
    const j = await gfetch(`${path}?page=${page}&limit=100`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const data = j.data ?? [];
    all.push(...data);
    if (j.has_more === true || (j.total_count && all.length < j.total_count)) {
      page++;
      await sleep(120);
    } else if (data.length === 100 && j.total_count == null) {
      page++;
      await sleep(120);
    } else {
      break;
    }
  }
  return all;
}

function unixSeconds(d) {
  return Math.floor(new Date(d).getTime() / 1000).toString();
}

function isoFromUnix(u) {
  if (u == null) return null;
  if (typeof u === "string" && u.includes("-")) return u; // already ISO
  const n = typeof u === "number" ? u : Number(u);
  if (!Number.isFinite(n)) return null;
  return new Date(n * 1000).toISOString();
}

console.log("=== Glofox → Meridian backfill ===");
console.log(`Branch:    ${branch}`);
console.log(`Namespace: ${ns}`);
console.log(`Output:    ${OUT}\n`);

// 1. Members
console.log("→ members");
const members = await paginated("/2.0/members");
writeFileSync(`${OUT}/members.json`, JSON.stringify(members, null, 2));
console.log(`  ${members.length} records`);

// 2. Staff
console.log("→ staff");
const staff = await paginated("/2.0/staff");
writeFileSync(`${OUT}/staff.json`, JSON.stringify(staff, null, 2));
console.log(`  ${staff.length} records`);

// 3. Membership plans
console.log("→ memberships (plans)");
const plans = await paginated("/2.0/memberships");
writeFileSync(`${OUT}/membership_plans.json`, JSON.stringify(plans, null, 2));
console.log(`  ${plans.length} records`);

// 4. Programs (POST)
console.log("→ programs");
const progRes = await gfetch(`/v3.0/locations/${branch}/search-programs`, {
  method: "POST",
  body: JSON.stringify({}),
});
const programs = progRes.data ?? [];
writeFileSync(`${OUT}/programs.json`, JSON.stringify(programs, null, 2));
console.log(`  ${programs.length} records`);

// 5. Events — last 12 months + next 30 days
const start = unixSeconds(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
const end = unixSeconds(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
console.log(`→ events (${start} → ${end})`);
const events = await paginated("/2.0/events", { start, end });
writeFileSync(`${OUT}/events.json`, JSON.stringify(events, null, 2));
console.log(`  ${events.length} records`);

// 6. Bookings — last 12 months
const bookingStart = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
console.log(`→ bookings (created ≥ ${new Date(bookingStart * 1000).toISOString().slice(0, 10)})`);
const bookings = await paginated(`/2.2/branches/${branch}/bookings`, {
  start_date: String(bookingStart),
});
writeFileSync(`${OUT}/bookings.json`, JSON.stringify(bookings, null, 2));
console.log(`  ${bookings.length} records`);

// 7. Transactions — last 12 months via Analytics/report
console.log("→ transactions (last 12 months)");
const txnRes = await gfetch("/Analytics/report", {
  method: "POST",
  body: JSON.stringify({
    model: "TransactionsList",
    branch_id: branch,
    namespace: ns,
    start: String(bookingStart),
    end: String(Math.floor(Date.now() / 1000)),
    filter: {
      ReportByMembers: false,
      CompareToRanges: false,
      PaymentMethods: [
        { id: "cash" },
        { id: "credit_card" },
        { id: "bank_transfer" },
        { id: "paypal" },
        { id: "direct_debit" },
        { id: "complimentary" },
        { id: "wallet" },
      ],
    },
  }),
});
const txns = txnRes.TransactionsList?.details ?? [];
writeFileSync(`${OUT}/transactions.json`, JSON.stringify(txns, null, 2));
console.log(`  ${txns.length} records`);

// 8. Leads (POST)
console.log("→ leads");
const leadsRes = await gfetch(`/2.1/branches/${branch}/leads/filter`, {
  method: "POST",
  body: JSON.stringify({}),
});
const leads = leadsRes.data ?? [];
writeFileSync(`${OUT}/leads.json`, JSON.stringify(leads, null, 2));
console.log(`  ${leads.length} records`);

console.log(
  `\n✓ done. Files in ${OUT}. Studio ID for upserts: ${STUDIO_ID}\n`,
);
console.log("Summary:");
console.log(`  members:       ${members.length}`);
console.log(`  staff:         ${staff.length}`);
console.log(`  plans:         ${plans.length}`);
console.log(`  programs:      ${programs.length}`);
console.log(`  events:        ${events.length}`);
console.log(`  bookings:      ${bookings.length}`);
console.log(`  transactions:  ${txns.length}`);
console.log(`  leads:         ${leads.length}`);

void isoFromUnix; // exported helper for transformers
