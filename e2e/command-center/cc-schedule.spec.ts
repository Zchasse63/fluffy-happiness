/*
 * cc-schedule.spec.ts — Today's schedule card tests.
 *
 * Tests: CC-023, CC-024, CC-025, CC-026, CC-027, CC-044
 * Priority: CC-023–027 = P1; CC-044 = P2
 *
 * Under TEST_AUTH_BYPASS=1, `loadTodaySchedule()` returns [] and falls
 * back to TODAY_SCHEDULE fixture (7 slots from lib/fixtures.ts).
 *
 * Fixture slots:
 *   11:00 AM  Open Sauna   (live)
 *   1:00 PM   Cold Plunge  (next)
 *   3:00 PM   Open Sauna   (none)
 *   5:00 PM   Open Sauna   (none)
 *   6:00 PM   Guided Sauna (none)
 *   7:00 PM   Guided Sauna (! — Whitney, 20% fill)
 *   8:15 PM   Cold Plunge  (none)
 *
 * Link count in the card:
 *   - 1 "Open schedule" header link (SectionHead right)
 *   - 7 slot row links
 *   = 8 total <a role=link> elements inside the card
 */

import { expect, test } from "@playwright/test";

import { CommandCenterPage } from "../../tests/pages/command-center.page";

test.describe("Today's schedule", () => {
  // CC-023
  test("renders card heading containing 'Today ·'", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    await expect(cc.todayScheduleCard).toContainText(/Today ·/);
  });

  // CC-024 — counts all links in the card: 7 slot rows + 1 header = 8
  test("renders 8 links in card (7 fixture slot rows + 1 header)", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    // `scheduleSlots` = all getByRole("link") inside the today card.
    // 7 slot rows each are <a href="/schedule/calendar"> + 1 header link.
    await expect(cc.scheduleSlots).toHaveCount(8);
  });

  // CC-024 complementary — only slot rows (exclude header)
  test("renders 7 slot rows using time-content filter", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    // `scheduleSlotRows` filters to <a> elements containing a time pattern.
    await expect(cc.scheduleSlotRows).toHaveCount(7);
  });

  // CC-025
  test("'Live' state badge is visible for the 11:00 AM slot", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.todayScheduleCard;
    const liveRow = card.getByRole("link").filter({ hasText: /11:00 AM/ });
    await expect(liveRow.getByText("Live")).toBeVisible();
  });

  // CC-026
  test("'Next up' badge is visible for the 1:00 PM slot", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.todayScheduleCard;
    const nextRow = card.getByRole("link").filter({ hasText: /1:00 PM/ });
    await expect(nextRow.getByText("Next up")).toBeVisible();
  });

  // CC-027
  test("'!' alert badge is visible for Whitney's 7:00 PM slot", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.todayScheduleCard;
    const warnRow = card.getByRole("link").filter({ hasText: /7:00 PM/ });

    // The "!" state renders as a .badge.badge-down element.
    await expect(warnRow.locator(".badge-down")).toBeVisible();
    await expect(warnRow.locator(".badge-down")).toContainText("!");
  });

  // CC-044
  test("hour tick row shows expected hour labels", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.todayScheduleCard;
    for (const tick of ["8A", "12P", "8P"]) {
      await expect(card.getByText(tick, { exact: true })).toBeVisible();
    }
  });

  test("'Open schedule' link inside card header points to /schedule/calendar", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.todayScheduleCard;
    await expect(
      card.getByRole("link", { name: /Open schedule/i }),
    ).toHaveAttribute("href", "/schedule/calendar");
  });

  test("Whitney's 7PM slot shows 20% fill percentage", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.todayScheduleCard;
    await expect(card.getByText("20% full")).toBeVisible();
  });

  test("Whitney's 7PM slot shows 2/10 capacity", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const card = cc.todayScheduleCard;
    await expect(card.getByText("2/10")).toBeVisible();
  });
});
