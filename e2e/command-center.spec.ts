import { expect, test } from "@playwright/test";

/*
 * Command Center — KPI strip, IDA insight cards, focus queue, sidebar nav.
 *
 * Page is server-rendered with `force-dynamic`; reads use the anon Supabase
 * client which under TEST_AUTH_BYPASS returns empty (RLS-gated by studio_id),
 * so the page falls through to fixtures. We test the *shape* of the page,
 * not specific data values.
 */

test.describe("AppShell sidebar", () => {
  test("renders all four nav groups in order", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.getByRole("complementary").first();

    // Nav group labels
    for (const label of ["Daily", "People", "Growth", "Run"]) {
      await expect(sidebar.getByText(label, { exact: true })).toBeVisible();
    }

    // Top-level entries that are direct links (not collapsible groups).
    await expect(
      sidebar.getByRole("link", { name: "Command Center" }),
    ).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Corporate" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Analytics" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Settings" })).toBeVisible();
    await expect(
      sidebar.getByRole("link", { name: "Employee Portal" }),
    ).toBeVisible();
  });

  test("topbar exposes search palette + Ask Meridian + New + Notifications", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /search or run a command/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /ask meridian/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "New" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Notifications" }),
    ).toBeVisible();
  });

  test("quarterly goal pill is visible at the bottom of the sidebar", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText(/quarterly goal/i)).toBeVisible();
    await expect(page.getByText(/\$\d+k of \$\d+k earned/i)).toBeVisible();
  });
});

test.describe("Command Center content", () => {
  test("breadcrumb shows Daily / Command Center", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/^Daily\/$/)).toBeVisible();
    // The breadcrumb crumb appears as 'Command Center' inside the topbar.
    const main = page.locator("main");
    // Sidebar also contains "Command Center" — scope the crumb to topbar.
    await expect(
      page.locator("header,div").filter({ hasText: /^Command Center$/ }).first(),
    ).toBeVisible();
    // And the main is present
    await expect(main).toBeVisible();
  });

  test("Ask Meridian copy is rendered on the Command Center", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText(
        /ask a question about your studio\. meridian will read your data and answer in plain english\./i,
      ),
    ).toBeVisible();
  });
});
