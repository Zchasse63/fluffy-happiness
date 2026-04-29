import { expect, test } from "@playwright/test";

/*
 * Revenue — overview period tabs, transactions filter pills, refund flow.
 *
 * The refund POST is intercepted to exercise the modal/confirm path
 * without actually mutating Stripe (Stripe is fully deferred — the route
 * handler currently surfaces a stub response).
 */

test.describe("revenue overview", () => {
  test("renders heading + KPI strip + period tabs", async ({ page }) => {
    await page.goto("/revenue/overview");
    await expect(
      page.getByRole("heading", { name: "Revenue", level: 1 }),
    ).toBeVisible();
    for (const kpi of ["MRR (estimate)", "ARPM", "Revenue", "Failed payments"]) {
      await expect(page.getByText(new RegExp(kpi)).first()).toBeVisible();
    }
    for (const win of ["7d", "30d", "90d", "365d"]) {
      await expect(page.getByRole("link", { name: win, exact: true })).toBeVisible();
    }
  });

  test("clicking a period tab updates the URL ?window= query", async ({
    page,
  }) => {
    await page.goto("/revenue/overview");
    await page.getByRole("link", { name: "7d", exact: true }).click();
    await page.waitForURL(/window=7/);
    expect(page.url()).toContain("window=7");
    await page.getByRole("link", { name: "365d", exact: true }).click();
    await page.waitForURL(/window=365/);
    expect(page.url()).toContain("window=365");
  });

  test("trend + revenue-by-type cards render", async ({ page }) => {
    await page.goto("/revenue/overview");
    await expect(
      page.getByRole("heading", { name: "Revenue trend", level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /revenue by type/i, level: 2 }),
    ).toBeVisible();
  });
});

test.describe("revenue transactions", () => {
  test("renders heading + filter pills + table columns", async ({ page }) => {
    await page.goto("/revenue/transactions");
    await expect(
      page.getByRole("heading", { name: "Transactions", level: 1 }),
    ).toBeVisible();
    for (const pill of ["All", "Completed", "Refunded", "Failed"]) {
      await expect(page.getByText(pill, { exact: true }).first()).toBeVisible();
    }
    for (const col of [
      "Time",
      "Member",
      "Description",
      "Kind",
      "Status",
      "Amount",
    ]) {
      await expect(
        page.getByRole("columnheader", { name: col, exact: true }),
      ).toBeVisible();
    }
  });

  test("search box accepts text", async ({ page }) => {
    await page.goto("/revenue/transactions");
    const search = page.getByRole("searchbox", {
      name: /search by member, amount/i,
    });
    await search.fill("alex");
    await expect(search).toHaveValue("alex");
  });

  test("clicking Refund triggers a POST to the refund endpoint", async ({
    page,
  }) => {
    let refundCalled = false;
    await page.route("**/api/transactions/*/refund", async (route) => {
      refundCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, stub: "pending stripe" }),
      });
    });

    await page.goto("/revenue/transactions");
    // The first row's Refund button — there are several on the page.
    const refundBtn = page.getByRole("button", { name: "Refund", exact: true }).first();
    await expect(refundBtn).toBeVisible();
    await refundBtn.click();

    // Either a confirm dialog opens or the POST is fired immediately.
    // Wait for either signal — give a generous window since the stub may
    // delay.
    await page.waitForTimeout(500);
    // If a confirm modal appeared, click its primary button.
    const confirm = page.getByRole("button", { name: /confirm refund|refund/i }).nth(1);
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click();
    }
    // Allow a brief moment for the POST
    await page.waitForTimeout(500);
    expect(refundCalled).toBe(true);
  });
});
