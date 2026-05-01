import { expect, test } from "@playwright/test";

/*
 * Operations — payroll, staff, facilities, waivers, employee portal.
 *
 * Payroll computes from trainers.base_pay_per_class_cents × classes.
 * With anon-key reads under TEST_AUTH_BYPASS, RLS-gated rows return
 * empty and fixtures fall through.
 */

test.describe("operations sub-pages", () => {
  test("payroll page renders + shows the canonical column labels", async ({
    page,
  }) => {
    await page.goto("/operations/payroll");
    await expect(
      page.getByRole("heading", { level: 1 }).first(),
    ).toBeVisible();
    // Payroll surfaces money concepts — at least one of these should be present
    await expect(
      page.getByText(/(payroll|trainer|class|earnings|base pay)/i).first(),
    ).toBeVisible();
  });

  test("staff page renders without 5xx", async ({ page }) => {
    const res = await page.goto("/operations/staff");
    expect(res?.status()).toBeLessThan(500);
    await expect(
      page.getByRole("heading", { level: 1 }).first(),
    ).toBeVisible();
  });

  test("facilities page renders + lists at least one row", async ({ page }) => {
    await page.goto("/operations/facilities");
    await expect(
      page.getByRole("heading", { level: 1 }).first(),
    ).toBeVisible();
    // Each resource card exposes its name as <h2> for screen-reader
    // navigation between rows.
    await expect(
      page.getByRole("heading", { level: 2 }).first(),
    ).toBeVisible();
  });

  test("waivers page renders + shows the waiver concept", async ({ page }) => {
    await page.goto("/operations/waivers");
    await expect(
      page.getByRole("heading", { level: 1 }).first(),
    ).toBeVisible();
    await expect(page.getByText(/(waiver|signature|consent)/i).first()).toBeVisible();
  });
});

test.describe("employee portal", () => {
  test("portal page renders for the bypass profile", async ({ page }) => {
    const res = await page.goto("/portal");
    expect(res?.status()).toBeLessThan(500);
    await expect(
      page.getByRole("heading", { level: 1 }).first(),
    ).toBeVisible();
    // Portal mentions the trainer's day or schedule
    await expect(
      page.getByText(/(today|schedule|class|trainer)/i).first(),
    ).toBeVisible();
  });
});
