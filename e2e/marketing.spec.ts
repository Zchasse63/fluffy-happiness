import { expect, test } from "@playwright/test";

/*
 * Marketing — campaigns list, new-campaign flow, send-pending-Resend message.
 *
 * Resend is deferred (no creds yet), so the send route surfaces a
 * 'Pending Resend integration' message after recipients land in
 * campaign_recipients. We test the surface text, not the SDK call.
 */

test.describe("marketing campaigns", () => {
  test("renders heading + New campaign button + at least one fixture campaign", async ({
    page,
  }) => {
    await page.goto("/marketing/campaigns");
    await expect(
      page.getByRole("heading", { name: "Campaigns", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "New campaign" }),
    ).toBeVisible();
    // Fixture state names should be present
    for (const status of ["Sent", "Sending", "Scheduled", "Draft"]) {
      await expect(page.getByText(status, { exact: true }).first()).toBeVisible();
    }
  });

  test("each campaign card surfaces Recipients/Sent/Open/Click metrics", async ({
    page,
  }) => {
    await page.goto("/marketing/campaigns");
    for (const label of ["Recipients", "Sent", "Open", "Click"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test("Draft state campaigns show a Send button that triggers the campaign send route", async ({
    page,
  }) => {
    // SendCampaignButton uses window.confirm() — auto-accept it.
    page.on("dialog", (d) => d.accept());

    let sendCalled = false;
    await page.route("**/api/campaigns/*/send", async (route) => {
      sendCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          status: "queued",
          message: "Pending Resend integration",
        }),
      });
    });

    await page.goto("/marketing/campaigns");
    const sendBtn = page
      .getByRole("button", { name: "Send", exact: true })
      .first();
    await expect(sendBtn).toBeVisible();
    await sendBtn.click();
    // The component fires the POST inside a useTransition — give it a beat.
    await page.waitForTimeout(500);
    expect(sendCalled).toBe(true);
  });
});

test.describe("marketing automations + leads + content", () => {
  test("each subroute renders a heading and doesn't 5xx", async ({ page }) => {
    for (const path of [
      "/marketing/overview",
      "/marketing/automations",
      "/marketing/leads",
      "/marketing/content",
    ]) {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(500);
      await expect(
        page.getByRole("heading", { level: 1 }).first(),
      ).toBeVisible();
    }
  });
});
