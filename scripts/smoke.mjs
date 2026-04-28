/*
 * Smoke test — boots `next start` and hits every UI route + API health
 * endpoint. Exits 0 if every page returns < 500. Auth-gated routes are
 * expected to redirect to /login (302/307) when the user isn't signed
 * in, which we count as a pass.
 *
 * Usage: node scripts/smoke.mjs
 *   (assumes a built app — run `npm run build` first.)
 */

import { spawn } from "node:child_process";
import process from "node:process";

const ROUTES = [
  "/login",
  "/api/health",
  // App routes — proxy will redirect to /login when not signed in.
  "/",
  "/schedule/calendar",
  "/schedule/optimization",
  "/members/directory",
  "/members/segments",
  "/corporate",
  "/revenue/overview",
  "/revenue/memberships",
  "/revenue/transactions",
  "/revenue/products",
  "/revenue/giftcards",
  "/revenue/dunning",
  "/marketing/overview",
  "/marketing/campaigns",
  "/marketing/automations",
  "/marketing/leads",
  "/marketing/content",
  "/analytics",
  "/operations/staff",
  "/operations/payroll",
  "/operations/facilities",
  "/operations/waivers",
  "/settings",
  "/portal",
];

const PORT = 3050;
const BASE = `http://localhost:${PORT}`;

const child = spawn("npx", ["next", "start", "-p", String(PORT)], {
  stdio: ["ignore", "pipe", "pipe"],
});

let resolveReady;
const ready = new Promise((r) => (resolveReady = r));
child.stdout.on("data", (b) => {
  const s = b.toString();
  if (s.includes("Ready") || s.includes("started server")) resolveReady();
});
child.stderr.on("data", (b) => process.stderr.write(b));

const timeout = setTimeout(() => {
  console.error("server failed to start in 30s");
  child.kill("SIGKILL");
  process.exit(1);
}, 30_000);

async function run() {
  await ready;
  clearTimeout(timeout);
  // Brief settle before probes.
  await new Promise((r) => setTimeout(r, 500));

  const results = [];
  for (const path of ROUTES) {
    try {
      const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
      const ok = res.status < 500;
      results.push({ path, status: res.status, ok });
      const tag = ok ? "✓" : "✗";
      const color = ok ? "\x1b[32m" : "\x1b[31m";
      console.log(`${color}${tag}\x1b[0m  ${res.status}  ${path}`);
    } catch (err) {
      results.push({ path, status: 0, ok: false, error: String(err) });
      console.log(`\x1b[31m✗\x1b[0m   ERR  ${path} — ${err}`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} OK`);
  child.kill("SIGTERM");
  setTimeout(() => child.kill("SIGKILL"), 2000);
  process.exit(failed.length ? 1 : 0);
}

run();
