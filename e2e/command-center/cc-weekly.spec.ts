/*
 * cc-weekly.spec.ts — Weekly review card tests.
 *
 * Tests: CC-031, CC-032, CC-033, CC-053
 * Priority: CC-031–033 = P1; CC-053 = P2
 *
 * Under TEST_AUTH_BYPASS=1, all DB queries return 0/empty.
 * `loadWeeklyReview()` detects all-zero state and falls back to WEEK_REVIEW.
 *
 * Fixture data (WEEK_REVIEW from lib/fixtures.ts):
 *   Revenue        $412  was $368  +12.0%  pos
 *   Classes booked 44    was 41    +7.3%   pos
 *   New members    3     was 5     -40.0%  neg
 *   Credits used   38    was 34    +11.8%  pos
 *   Avg fill       71%   was 68%   +3.0 pts pos
 *   Trainer hours  12.5  was 12.0  +4.2%   pos
 *
 * Badge traversal note: Playwright's `locator("../..").locator(".badge-up")` can
 * match badges in sibling cells because the grandparent div spans multiple rows.
 * For badge tone tests, use `getByText` scoped to the card + assert badge class
 * via the text content.
 */

import { expect, test } from "@playwright/test";

import { CommandCenterPage } from "../../tests/pages/command-center.page";

test.describe("Weekly review", () => {
  // CC-031
  test("renders 'Weekly review' heading", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    await expect(cc.weeklyReviewCard).toContainText(/Weekly review/);
  });

  // CC-032
  test("Revenue row shows $412 current and 'was $368'", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.weeklyReviewCard;
    await expect(card.getByText("Revenue", { exact: true })).toBeVisible();
    await expect(card.getByText("$412")).toBeVisible();
    await expect(card.getByText("was $368")).toBeVisible();
  });

  // CC-033
  test("Revenue delta (+12.0%) and New members delta (-40.0%) visible in card", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.weeklyReviewCard;
    // Scoped to the card — "Revenue" and the delta text should be co-located.
    await expect(card.getByText("12.0%")).toBeVisible();
    await expect(card.getByText("40.0%")).toBeVisible();
  });

  // CC-053 — verify badge-up vs badge-down by checking the specific text content
  test("Revenue delta has badge-up class; New members delta has badge-down class", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.weeklyReviewCard;

    // Revenue +12.0% → badge-up. Find it by text inside the card.
    const revenueBadgeUp = card.locator(".badge-up").filter({ hasText: "12.0%" });
    await expect(revenueBadgeUp).toBeVisible();

    // New members -40.0% → badge-down.
    const newMembersBadgeDown = card.locator(".badge-down").filter({ hasText: "40.0%" });
    await expect(newMembersBadgeDown).toBeVisible();
  });

  test("all 6 fixture row labels are rendered inside the card", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.weeklyReviewCard;
    for (const label of [
      "Revenue",
      "Classes booked",
      "New members",
      "Credits used",
      "Avg fill",
      "Trainer hours",
    ]) {
      await expect(card.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("'vs last week' comparison selector is visible", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    await expect(cc.weeklyReviewCard.getByText(/vs last week/i)).toBeVisible();
  });
});
