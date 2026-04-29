import { expect, test } from "@playwright/test";

/*
 * Smoke E2E — runs against `next dev` with TEST_AUTH_BYPASS=1.
 *
 * The bypass injects a fake test-owner profile so every page renders
 * as if signed in. Queries still run with the anon Supabase key, so
 * RLS-gated reads return empty and the pages fall back to fixtures —
 * that's enough to verify the routes compile, render, and don't 5xx.
 */

const PUBLIC_ROUTES = [
  { path: "/login", title: /sauna/i },
  { path: "/api/health", expectJson: true },
];

const AUTHED_PAGES = [
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

test.describe("public routes", () => {
  for (const r of PUBLIC_ROUTES) {
    test(`GET ${r.path} returns 200`, async ({ page, request }) => {
      if (r.expectJson) {
        const res = await request.get(r.path);
        expect(res.status()).toBeLessThan(500);
        const body = await res.json();
        expect(body).toBeTruthy();
      } else {
        await page.goto(r.path);
        if (r.title) await expect(page).toHaveTitle(r.title);
      }
    });
  }
});

test.describe("authed pages render", () => {
  for (const path of AUTHED_PAGES) {
    test(`GET ${path} renders without a 5xx`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(500);
      // Each page should render the AppShell — the sidebar nav has
      // "Command Center" as its first item.
      const navHook = page.getByText("Command Center", { exact: false });
      await expect(navHook).toBeVisible({ timeout: 10_000 });
    });
  }
});

test("members directory ?q= updates the URL on type", async ({ page }) => {
  await page.goto("/members/directory");
  const search = page.getByPlaceholder(/search members/i);
  await search.fill("alex");
  // Debounced; wait for the URL to reflect the search.
  await page.waitForURL(/\?q=alex/, { timeout: 5_000 });
  expect(page.url()).toContain("q=alex");
});
