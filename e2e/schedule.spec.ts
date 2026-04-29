import { expect, test } from "@playwright/test";

/*
 * Schedule — calendar week view + optimization page (heatmap + AI recs).
 *
 * The optimization page calls Claude Sonnet via /api/ai/recommendations
 * which is cached for 22h. First test run seeds the cache; subsequent
 * runs are free. We avoid `?force=1` deliberately.
 */

test.describe("schedule calendar", () => {
  test("renders the calendar page", async ({ page }) => {
    const res = await page.goto("/schedule/calendar");
    expect(res?.status()).toBeLessThan(500);
    // Page heading or a calendar-shaped element should be present.
    await expect(
      page.getByRole("heading", { level: 1 }).first(),
    ).toBeVisible();
    // A week-view typically has weekday labels — at least one should appear.
    await expect(
      page.getByText(/(monday|mon|tuesday|tue|wednesday|wed)/i).first(),
    ).toBeVisible();
  });
});

test.describe("schedule optimization", () => {
  test("renders heading + recommendation block", async ({ page }) => {
    const res = await page.goto("/schedule/optimization");
    expect(res?.status()).toBeLessThan(500);
    await expect(
      page.getByRole("heading", { level: 1 }).first(),
    ).toBeVisible();
    // The page should mention "recommendation" or "optimization" somewhere
    // — exact copy is AI-generated, so we match loosely.
    await expect(
      page
        .getByText(/(recommend|optimi[sz]e|fill rate|attendance)/i)
        .first(),
    ).toBeVisible();
  });
});
