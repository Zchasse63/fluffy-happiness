/*
 * cc-briefing.spec.ts — AI Briefing IDA cards.
 *
 * Tests: CC-005, CC-006, CC-007, CC-008, CC-019, CC-020, CC-021, CC-022, CC-048
 * Priority: CC-005–008 = P0; CC-019–022 = P1; CC-048 = P2
 *
 * Under TEST_AUTH_BYPASS=1, `loadLatestBriefing()` returns null and the page
 * falls back to `COMMAND_INSIGHTS` (3 fixture cards). We test against the
 * fixture data values defined in lib/fixtures.ts.
 */

import { expect, test } from "@playwright/test";

import { CommandCenterPage } from "../../tests/pages/command-center.page";

test.describe("AI Briefing section", () => {
  // CC-022
  test("section head shows 'AI briefing · generated' timestamp", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    await expect(page.getByText(/AI briefing · generated/i)).toBeVisible();
  });

  // CC-005
  test("renders exactly 3 IDA briefing cards", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    await expect(cc.insightCards).toHaveCount(3);
  });

  // CC-006
  test("P1 card: rank badge, headline, and action are correct", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const p1 = cc.insightCard("P1");

    await expect(p1.getByText(/P1 · Class below threshold/i)).toBeVisible();
    await expect(p1.getByText(/Whitney's 7 PM Guided is at 2\/10/i)).toBeVisible();
    await expect(p1.getByRole("link", { name: /Open class details/i })).toBeVisible();
  });

  // CC-007
  test("P2 card: rank badge, headline, and action are correct", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const p2 = cc.insightCard("P2");

    await expect(p2.getByText(/P2 · Credits expiring/i)).toBeVisible();
    await expect(p2.getByText(/4 members have credit packs expiring this week/i)).toBeVisible();
    await expect(p2.getByRole("link", { name: /Send expiry campaign/i })).toBeVisible();
  });

  // CC-008
  test("P3 card: rank badge, headline, and action are correct", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const p3 = cc.insightCard("P3");

    await expect(p3.getByText(/P3 · Revenue anomaly/i)).toBeVisible();
    // The P3 headline contains "$178" — scope to the serif headline div to
    // avoid strict-mode ambiguity with the data table row that also shows "$178".
    await expect(
      p3.locator(".serif").filter({ hasText: /\$178/ }),
    ).toBeVisible();
    await expect(p3.getByRole("link", { name: /Open analytics/i })).toBeVisible();
  });

  // CC-019
  test("P1 card data table shows Booked, Waitlist, Last week rows", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const p1 = cc.insightCard("P1");

    await expect(p1.getByText("Booked", { exact: true })).toBeVisible();
    await expect(p1.getByText("Waitlist", { exact: true })).toBeVisible();
    await expect(p1.getByText("Last week", { exact: true })).toBeVisible();
  });

  // CC-020
  test("P1 card body text contains the explanation copy", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const p1 = cc.insightCard("P1");

    await expect(
      p1.getByText(/Evening Guided usually fills by Monday/i),
    ).toBeVisible();
  });

  // CC-021
  test("P1 and P2 cards render altAction secondary buttons", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const p1 = cc.insightCard("P1");
    await expect(
      p1.getByRole("button", { name: /Notify Wed regulars/i }),
    ).toBeVisible();

    const p2 = cc.insightCard("P2");
    await expect(
      p2.getByRole("button", { name: /Offer 2-wk extension/i }),
    ).toBeVisible();
  });

  // CC-048 — BUG-002 marker
  test("[BUG-002] InsightCard altAction button has no click handler — inert", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const p1 = cc.insightCard("P1");
    const altAction = p1.getByRole("button", { name: /Notify Wed regulars/i });

    await altAction.click();
    await expect(page).toHaveURL("/");
  });

  test("P1 primary action link points to /schedule/calendar", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const p1 = cc.insightCard("P1");
    await expect(
      p1.getByRole("link", { name: /Open class details/i }),
    ).toHaveAttribute("href", "/schedule/calendar");
  });

  test("P3 primary action link points to /analytics", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const p3 = cc.insightCard("P3");
    await expect(
      p3.getByRole("link", { name: /Open analytics/i }),
    ).toHaveAttribute("href", "/analytics");
  });
});
