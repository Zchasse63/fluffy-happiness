/*
 * cc-activity.spec.ts — Activity feed card tests.
 *
 * Tests: CC-028, CC-029, CC-030, CC-045
 * Priority: CC-028–030 = P1; CC-045 = P2
 *
 * Under TEST_AUTH_BYPASS=1, `loadActivityFeed()` returns the ACTIVITY
 * fixture (8 entries from lib/fixtures.ts) because Supabase returns no rows.
 *
 * Fixture entries (chronological, most recent first):
 *   "10:38 AM"  Alex Park      Booked 6 PM Guided Sauna       +1    pos
 *   "10:12 AM"  Sim Harmon     Checked in · 11 AM Open        In    pos
 *   "09:47 AM"  Ben Kniesly    Payment failed · Monthly Unl.  −$85  neg
 *   "09:30 AM"  Meridian       Sent "Weekend Warriors"...     94%   info
 *   "08:55 AM"  Maya Chen      Purchased 10-pack credit       +$165 pos
 *   "08:02 AM"  Whitney Abrams Clocked in                     Staff muted
 *   "Yest 9 PM" Dana Ortiz     No-show · 8 PM Cold Plunge     Strike warn
 *   "Yest 7 PM" Cigar City Co. Canceled corporate event       −$480 neg
 */

import { expect, test } from "@playwright/test";

import { CommandCenterPage } from "../../tests/pages/command-center.page";

test.describe("Activity feed", () => {
  // CC-028
  test("renders 'Activity' heading with 'Last 24h' badge", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.activityFeedCard;
    await expect(card.getByText("Activity")).toBeVisible();
    await expect(card.getByText("Last 24h")).toBeVisible();
  });

  // CC-029 — plan says "at least 4 entries"; fixture has exactly 8.
  // Use toBeGreaterThanOrEqual for resilience if fixture changes.
  test("renders at least 4 timeline entries (fixture has 8)", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const count = await cc.timelineItems.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  // CC-030
  test("first fixture entry: Alex Park booking is visible", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.activityFeedCard;
    await expect(card.getByText("Alex Park")).toBeVisible();
    await expect(card.getByText(/Booked 6 PM Guided Sauna/i)).toBeVisible();
  });

  // CC-045
  test("negative-tone entry (Ben Kniesly payment failure) is visible", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.activityFeedCard;
    await expect(card.getByText("Ben Kniesly")).toBeVisible();
    await expect(
      card.getByText(/Payment failed · Monthly Unlimited/i),
    ).toBeVisible();
    // Tag shows "−$85" (rendered in neg color).
    await expect(card.getByText("−$85")).toBeVisible();
  });

  test("warning-tone entry (Dana Ortiz no-show) is visible", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.activityFeedCard;
    await expect(card.getByText("Dana Ortiz")).toBeVisible();
    await expect(card.getByText(/No-show · 8 PM Cold Plunge/i)).toBeVisible();
    await expect(card.getByText("Strike")).toBeVisible();
  });

  test("muted-tone entry (Whitney clocked in) is visible", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.activityFeedCard;
    await expect(card.getByText("Whitney Abrams")).toBeVisible();
    await expect(card.getByText("Clocked in")).toBeVisible();
    await expect(card.getByText("Staff")).toBeVisible();
  });

  test("Cigar City corporate cancellation is in the feed", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.activityFeedCard;
    await expect(card.getByText(/Cigar City/i)).toBeVisible();
    await expect(card.getByText("−$480")).toBeVisible();
  });
});
