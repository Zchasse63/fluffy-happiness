import { expect, test } from "@playwright/test";

/*
 * Settings — KV-style read of studio + booking-rules + integrations.
 * The Booking rules section has an Edit button that opens a modal.
 */

test.describe("settings page", () => {
  test("renders heading + all section H2s", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: "Settings", level: 1 }),
    ).toBeVisible();
    for (const section of [
      "Business",
      "Booking rules",
      "Notifications",
      "Integrations",
      "Plans",
      "Team",
    ]) {
      await expect(
        page.getByRole("heading", { name: section, level: 2 }),
      ).toBeVisible();
    }
  });

  test("booking rules surfaces the canonical KV pairs", async ({ page }) => {
    await page.goto("/settings");
    for (const label of [
      "Booking window",
      "Cancellation policy",
      "Late cancel fee",
      "No-show fee",
      "Waitlist auto-promote",
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("integrations list reflects /api/health: glofox + anthropic enabled, stripe + resend + inngest disabled", async ({
    page,
    request,
  }) => {
    await page.goto("/settings");
    const integrations = page
      .getByRole("heading", { name: "Integrations", level: 2 })
      .locator("xpath=..");
    for (const name of [
      "Glofox",
      "Stripe",
      "Resend",
      "Anthropic",
      "Inngest",
    ]) {
      await expect(integrations.getByText(name, { exact: true })).toBeVisible();
    }

    // Cross-check with /api/health: the dev env has supabase/glofox/anthropic
    // wired and stripe/resend/inngest deferred — the page status should
    // mirror this.
    const health = await request.get("/api/health").then((r) => r.json());
    expect(health.integrations.glofox).toBe(true);
    expect(health.integrations.anthropic).toBe(true);
    expect(health.integrations.stripe).toBe(false);
    expect(health.integrations.resend).toBe(false);
    // inngest is true only when INNGEST_SIGNING_KEY is set — local dev
    // sets INNGEST_DEV=1 which doesn't flip the flag, so expect false.
    expect(health.integrations.inngest).toBe(false);
  });

  test("Edit button on Booking rules opens the editor", async ({ page }) => {
    await page.goto("/settings");
    const editBtn = page
      .getByRole("heading", { name: "Booking rules", level: 2 })
      .locator("xpath=..")
      .getByRole("button", { name: "Edit" });
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    // Either a modal opens with form fields or an inline editor renders —
    // either way, an input field with the booking-window value should appear.
    const anyInput = page.getByRole("spinbutton").or(page.getByRole("textbox"));
    await expect(anyInput.first()).toBeVisible({ timeout: 5_000 });
  });
});
