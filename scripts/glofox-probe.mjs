/*
 * Glofox API probe — confirms creds work and reports row counts for
 * each entity type. Pure read-only; no Supabase writes.
 *
 * Usage: node scripts/glofox-probe.mjs
 */

import "dotenv/config";

const BASE = "https://gf-api.aws.glofox.com/prod";
const HEADERS = {
  "x-glofox-api-token": process.env.GLOFOX_API_TOKEN,
  "x-api-key": process.env.GLOFOX_API_KEY,
  "x-glofox-branch-id": process.env.GLOFOX_BRANCH_ID,
  "Content-Type": "application/json",
};

const branch = process.env.GLOFOX_BRANCH_ID;

const ENDPOINTS = [
  ["members", `/2.0/branches/${branch}/members`, {}],
  ["staff", `/2.0/branches/${branch}/staff`, {}],
  ["programs", `/2.0/branches/${branch}/programs`, {}],
  ["events", `/2.0/branches/${branch}/events`, {}],
  ["bookings", `/2.2/branches/${branch}/bookings`, {}],
  ["leads", `/2.1/branches/${branch}/leads/filter`, {}],
];

async function probe(path, params) {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries({ ...params, limit: 1 })) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: HEADERS });
  const ok = res.ok;
  let body;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { ok, status: res.status, body };
}

console.log("Probing Glofox API…");
console.log(`  Branch: ${branch}`);
console.log(`  Base:   ${BASE}\n`);

for (const [name, path, params] of ENDPOINTS) {
  try {
    const r = await probe(path, params);
    const tag = r.ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
    const count = Array.isArray(r.body?.data)
      ? r.body.data.length
      : Array.isArray(r.body)
        ? r.body.length
        : "—";
    const total =
      r.body?.total_count ?? r.body?.total ?? r.body?.count ?? "—";
    console.log(
      `${tag}  ${r.status}  ${name.padEnd(10)} count=${count} total=${total}  ${path}`,
    );
    if (!r.ok && typeof r.body === "object") {
      console.log("       error:", JSON.stringify(r.body).slice(0, 240));
    }
  } catch (err) {
    console.log(
      `\x1b[31m✗\x1b[0m  ERR  ${name.padEnd(10)} ${path} — ${err.message}`,
    );
  }
}
