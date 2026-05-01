/*
 * cc-focus.spec.ts — Focus queue card tests.
 *
 * Tests: CC-011, CC-012, CC-034, CC-035, CC-046
 * Priority: CC-011–012 = P0; CC-034–035 = P1; CC-046 = P2
 *
 * Under TEST_AUTH_BYPASS=1 the live focus queue returns [] and the page
 * falls back to FOCUS_QUEUE (7 items from lib/fixtures.ts).
 */

import { expect, test } from "@playwright/test";

import { CommandCenterPage } from "../../tests/pages/command-center.page";

test.describe("Focus queue", () => {
  // CC-011
  test("renders heading and '7 items' count badge", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.focusQueueCard;
    await expect(card.getByText("Focus queue")).toBeVisible();
    await expect(card.getByText("7 items")).toBeVisible();
  });

  // CC-012
  test("P1 failed payment items are visible", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.focusQueueCard;

    await expect(
      card.getByText("Failed payment · Ben Kniesly"),
    ).toBeVisible();
    await expect(
      card.getByText("Failed payment · Trent Lott"),
    ).toBeVisible();
  });

  // CC-034
  test("P2 Whitney's 7PM Guided item is visible", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    await expect(
      cc.focusQueueCard.getByText(/Whitney's 7 PM Guided/i),
    ).toBeVisible();
  });

  // CC-035
  test("P3 lead follow-ups item is visible", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    await expect(
      cc.focusQueueCard.getByText(/Lead follow-ups · 3 stale/i),
    ).toBeVisible();
  });

  // CC-046
  test("P1 'Retry' CTA buttons link to /revenue/dunning", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.focusQueueCard;
    // Both P1 items have href=/revenue/dunning
    const retryLinks = card.getByRole("link").filter({ hasText: /Retry/ });
    // There are 2 P1 "Retry" items — both should link to dunning.
    await expect(retryLinks).toHaveCount(2);
    for (const link of await retryLinks.all()) {
      await expect(link).toHaveAttribute("href", "/revenue/dunning");
    }
  });

  test("P1 chargeback item visible and links to transactions", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.focusQueueCard;
    await expect(card.getByText(/Chargeback filed · Dana Ortiz/i)).toBeVisible();

    const respondLink = card.getByRole("link").filter({ hasText: /Respond/ });
    await expect(respondLink).toHaveAttribute("href", "/revenue/transactions");
  });

  test("P2 credits expiring item is visible", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    await expect(
      cc.focusQueueCard.getByText(/Credits expiring · 4 members/i),
    ).toBeVisible();
  });

  test("all 7 focus items are rendered as links", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    // Each focus item is an <a> element.
    const links = cc.focusQueueCard.getByRole("link");
    // 7 items + 1 header link from "Open schedule" = may vary; use >= 7.
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(7);
  });
});
