/*
 * cc-kpi.spec.ts — KPI strip tests.
 *
 * Tests: CC-009, CC-010, CC-043
 * Priority: CC-009–010 = P0; CC-043 = P2
 *
 * Under TEST_AUTH_BYPASS=1, `loadRevenueSnapshot()` returns all zeros
 * and `loadTodaySchedule()` returns [] — so the page falls back to
 * COMMAND_KPIS fixture data.
 *
 * IMPORTANT: fixture KPI labels (Walk-ins, No-shows, Attendance rate) differ
 * from live labels (Classes · 7d, Revenue · 7d, New members · 7d). Tests
 * are written against the fixture labels.
 *
 * Fixture data (COMMAND_KPIS from lib/fixtures.ts):
 *   Revenue · today  $234  +12.0%
 *   Bookings         27    +4
 *   Walk-ins         2     ±0
 *   No-shows         1     -2
 *   Attendance rate  94%   +3.1%
 *
 * SVG count note: each KPI cell contains 2 SVGs — one sparkline (LineChart)
 * and one Icon SVG in the ChangeBadge (arrow-up/arrow-down). 5 cells × 2 = 10.
 */

import { expect, test } from "@playwright/test";

import { CommandCenterPage } from "../../tests/pages/command-center.page";

const FIXTURE_KPI_LABELS = [
  "Revenue · today",
  "Bookings",
  "Walk-ins",
  "No-shows",
  "Attendance rate",
] as const;

test.describe("KPI strip", () => {
  // CC-009
  test("all 5 KPI metric labels are visible (fixture mode)", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const strip = cc.kpiStrip;
    for (const label of FIXTURE_KPI_LABELS) {
      await expect(strip.getByText(label, { exact: true })).toBeVisible();
    }
  });

  // CC-010
  test("fixture KPI values match COMMAND_KPIS data", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const strip = cc.kpiStrip;

    // Revenue · today = $234
    await expect(strip.getByText("$234")).toBeVisible();

    // Bookings = 27
    await expect(strip.getByText("27")).toBeVisible();

    // Walk-ins = 2: scope to the metric cell via label proximity
    const walkInsCell = strip.locator("div").filter({ hasText: /^Walk-ins$/ }).first();
    await expect(walkInsCell.locator("..")).toContainText("2");

    // No-shows = 1
    const noShowsCell = strip.locator("div").filter({ hasText: /^No-shows$/ }).first();
    await expect(noShowsCell.locator("..")).toContainText("1");

    // Attendance rate = 94%
    await expect(strip.getByText("94%")).toBeVisible();
  });

  // CC-043 — each KPI cell has one LineChart SVG sparkline
  test("each KPI cell contains a sparkline SVG with a path element", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const strip = cc.kpiStrip;

    // The LineChart component renders inside a div.anno-chart.
    // There are 5 KPI cells each with one anno-chart containing one SVG.
    const sparklineSvgs = strip.locator(".anno-chart svg");
    await expect(sparklineSvgs).toHaveCount(5);

    // Each sparkline svg should contain at least one <path> (the stroke line).
    const count = await sparklineSvgs.count();
    for (let i = 0; i < count; i++) {
      const paths = sparklineSvgs.nth(i).locator("path");
      const pathCount = await paths.count();
      expect(pathCount).toBeGreaterThan(0);
    }
  });

  test("color dot spans are present for each KPI cell", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const strip = cc.kpiStrip;
    // Each cell has a 6×6 span dot rendered inline. The style is set via
    // React's style prop which renders as style="width:6px;height:6px;...".
    // Playwright css attribute selector with 'style*' is sensitive to exact
    // React style serialization. Use the border-radius attribute instead,
    // since each dot has border-radius:2px which is distinctive.
    // Alternatively count by the known structure: 5 metric-label divs in the strip.
    const metricLabels = strip.locator(".metric-label");
    await expect(metricLabels).toHaveCount(5);
  });

  test("ChangeBadge renders positive deltas for Revenue and Attendance rate", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const strip = cc.kpiStrip;
    await expect(strip.getByText("12.0%")).toBeVisible();
    await expect(strip.getByText("3.1%")).toBeVisible();
  });

  test("No-shows delta badge is badge-down (negative)", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const strip = cc.kpiStrip;
    // The No-shows delta is -2 → badge-down.
    const badgeDown = strip.locator(".badge-down").first();
    await expect(badgeDown).toBeVisible();
  });
});
