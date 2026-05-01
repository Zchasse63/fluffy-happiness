import { expect, test } from "@playwright/test";

/*
 * Members — directory, search, segments, profile drill-down, engagement badges.
 */

test.describe("members directory", () => {
  test("renders heading + KPI strip + segment list", async ({ page }) => {
    await page.goto("/members/directory");
    await expect(
      page.getByRole("heading", { name: "Members", level: 1 }),
    ).toBeVisible();

    // KPI labels appear in the metric strip (top of page); the segments
    // section below repeats some names as links — `.first()` locks to the
    // KPI strip per DOM order.
    for (const kpi of [
      "Active members",
      "MRR (estimate)",
      "New this month",
      "Trials",
    ]) {
      await expect(page.getByText(kpi, { exact: true }).first()).toBeVisible();
    }

    // Segments H2 + the canonical 8 fixture segments
    await expect(
      page.getByRole("heading", { name: "Segments", level: 2 }),
    ).toBeVisible();
    for (const seg of [
      "All active members",
      "Power users",
      "Churn risk",
      "Credits expiring 7d",
      "Lapsed 30 days",
      "Corporate accounts",
      "Weekend warriors",
    ]) {
      await expect(page.getByRole("link", { name: new RegExp(seg) })).toBeVisible();
    }
  });

  test("search input updates the URL with debounce", async ({ page }) => {
    await page.goto("/members/directory");
    const search = page.getByRole("searchbox", { name: /search members/i });
    await search.fill("alex");
    await page.waitForURL(/\?q=alex/, { timeout: 5_000 });
    expect(page.url()).toContain("q=alex");

    // Clearing the input should drop the query
    await search.fill("");
    await page.waitForURL((url) => !url.search.includes("q="), {
      timeout: 5_000,
    });
  });

  test("table renders the standard columns + at least one fixture row", async ({
    page,
  }) => {
    await page.goto("/members/directory");
    for (const col of [
      "Member",
      "Tier",
      "Status",
      "Engagement",
      "Credits",
      "LTV",
      "Last visit",
    ]) {
      await expect(
        page.getByRole("columnheader", { name: col, exact: true }),
      ).toBeVisible();
    }
    // First fixture row should always be 'Alex Park'
    await expect(
      page.getByRole("link", { name: /alex park alex@example\.com/i }),
    ).toBeVisible();
  });

  test("engagement badges cover the documented variants", async ({ page }) => {
    await page.goto("/members/directory");
    // Each engagement state from the badge taxonomy should appear on at
    // least one fixture row.
    const states = ["Power", "Active", "Engaged", "Cooling", "At risk", "New"];
    for (const s of states) {
      // The badge appears in an Engagement cell — disambiguate with `.first()`
      await expect(
        page.getByRole("cell", { name: new RegExp(`^${s}( \\d+ strikes?)?$`) }).first(),
      ).toBeVisible();
    }
  });

  test("clicking a member row navigates to the profile route", async ({
    page,
  }) => {
    await page.goto("/members/directory");
    await page.getByRole("link", { name: /alex park alex@example\.com/i }).click();
    await page.waitForURL(/\/members\/m1/);
    // ProfileHeader renders the member name as <h1> (semantic landmark
    // for screen readers) — assert via role.
    await expect(
      page.getByRole("heading", { name: /alex park/i, level: 1 }),
    ).toBeVisible();
  });
});

test.describe("members segments", () => {
  test("clicking a segment link routes to /members/segments?id=...", async ({
    page,
  }) => {
    await page.goto("/members/directory");
    await page.getByRole("link", { name: /power users/i }).click();
    await page.waitForURL(/\/members\/segments\?id=power/);
    await expect(
      page.getByRole("heading", { name: /segments/i }).first(),
    ).toBeVisible();
  });
});
