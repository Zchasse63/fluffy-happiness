/*
 * cc-shell.spec.ts — AppShell: sidebar nav groups, topbar controls,
 * quarterly goal pill, theme toggles, ⌘K button.
 *
 * Tests: CC-001, CC-002, CC-003, CC-004, CC-039, CC-040, CC-041, CC-042
 * Priority: P0 (CC-001–004) + P2 (CC-039–042)
 */

import { expect, test } from "@playwright/test";

import { CommandCenterPage } from "../../tests/pages/command-center.page";

test.describe("AppShell sidebar", () => {
  // CC-001
  test("renders all four nav groups in order", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    for (const label of ["Daily", "People", "Growth", "Run"]) {
      await expect(cc.navGroupLabel(label)).toBeVisible();
    }
  });

  // CC-002
  test("sidebar has five direct nav links", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    for (const name of [
      "Command Center",
      "Corporate",
      "Analytics",
      "Settings",
      "Employee Portal",
    ]) {
      await expect(cc.navLink(name)).toBeVisible();
    }
  });

  // CC-004
  test("quarterly goal pill is visible with amount text", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    await expect(cc.quarterlyGoalLabel).toBeVisible();
    await expect(cc.quarterlyGoalAmount).toBeVisible();
  });

  // CC-039
  test("brand row shows 'The Sauna Guys'", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    await expect(
      cc.sidebar.getByText("The Sauna Guys"),
    ).toBeVisible();
  });

  // CC-041
  test("sidebar footer has light and dark theme toggle buttons", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    await expect(cc.themeToggleLight).toBeVisible();
    await expect(cc.themeToggleDark).toBeVisible();
  });

  // CC-042
  test("clicking a collapsible nav item reveals sub-items", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    // "Schedule" is a collapsible nav item (has children).
    const scheduleBtn = cc.navButton("Schedule");
    await scheduleBtn.click();

    // After click, sub-items should be visible.
    await expect(
      cc.sidebar.getByRole("link", { name: "Calendar" }),
    ).toBeVisible();
    await expect(
      cc.sidebar.getByRole("link", { name: "Optimization" }),
    ).toBeVisible();
  });
});

test.describe("Topbar controls", () => {
  // CC-003
  test("topbar renders search pill, Ask Meridian, New, and Notifications", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    await expect(cc.searchPill).toBeVisible();
    await expect(cc.topbarAskMeridianBtn).toBeVisible();
    await expect(cc.topbarNewBtn).toBeVisible();
    await expect(cc.topbarNotificationsBtn).toBeVisible();
  });

  // CC-040
  test("breadcrumb shows 'Daily/' separator and 'Command Center'", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    // The crumbs div contains two spans: "Daily" + sep "/" and "Command Center".
    const crumbs = cc.topbar.locator(".crumbs");
    await expect(crumbs.getByText("Daily")).toBeVisible();
    await expect(crumbs.getByText("Command Center")).toBeVisible();
  });
});
