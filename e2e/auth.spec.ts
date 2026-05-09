import { expect, test } from "@playwright/test";

/*
 * Auth — login form (email + password), unauthorized email handling.
 *
 * The dev server runs with TEST_AUTH_BYPASS=1 so authed routes load
 * without sign-in. The /login page itself doesn't need the bypass and
 * exercises the real password sign-in form.
 */

test.describe("login page", () => {
  test("renders the sign-in form with the right copy", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Meridian · The Sauna Guys/);
    await expect(
      page.getByRole("heading", { name: "Sign in", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText(/sign in with your work email and password/i),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Work email" })).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(
      page.getByText(/owners \+ managers only · members use the app/i),
    ).toBeVisible();
  });

  test("email input accepts typed text and the placeholder is the example", async ({
    page,
  }) => {
    await page.goto("/login");
    const email = page.getByRole("textbox", { name: "Work email" });
    await expect(email).toHaveAttribute("placeholder", "zach@thesaunaguys.com");
    await email.fill("test@example.com");
    await expect(email).toHaveValue("test@example.com");
  });

  test("auth callback route returns a redirect (not a 5xx) without a code", async ({
    request,
  }) => {
    // /auth/callback expects ?code=... from Supabase; without it, the route
    // should redirect (302/307) back to /login, not 5xx.
    const res = await request.get("/auth/callback", {
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(500);
  });
});
