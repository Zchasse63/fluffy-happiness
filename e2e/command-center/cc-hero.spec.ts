/*
 * cc-hero.spec.ts — PageHero section tests.
 *
 * Tests: CC-016, CC-017, CC-018
 * Priority: P1
 *
 * The hero title is hardcoded to "Good morning, Zach."; the meta line
 * uses `new Date()` so we match the pattern, not the exact value.
 */

import { expect, test } from "@playwright/test";

import { CommandCenterPage } from "../../tests/pages/command-center.page";

test.describe("PageHero", () => {
  // CC-016 — greeting is "Good {morning|afternoon|evening}, {firstName}."
  // Under TEST_AUTH_BYPASS the synthetic profile is "Test Owner" so first
  // name = "Test". Time of day is whichever hour the test runs in.
  test("h1 contains a time-of-day greeting + the operator's first name", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    await expect(cc.heroTitle).toContainText(
      /Good (morning|afternoon|evening), Test\./,
    );
  });

  // CC-017
  test("meta line matches '{weekday}, {Month} {day} · Operational briefing'", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    // The meta is formatted as e.g. "Wednesday, April 30 · Operational briefing".
    await expect(cc.heroSection).toContainText(/·\s*Operational briefing/);
  });

  // CC-018
  test("'Daily brief' ghost button and 'New class' link are visible", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    await expect(cc.heroDailyBriefBtn).toBeVisible();
    await expect(cc.heroNewClassLink).toBeVisible();
  });

  test("'New class' link points to /schedule/calendar", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    await expect(cc.heroNewClassLink).toHaveAttribute(
      "href",
      "/schedule/calendar",
    );
  });
});
