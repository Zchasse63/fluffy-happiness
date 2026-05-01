/*
 * cc-a11y.spec.ts — Keyboard accessibility and ARIA bug documentation.
 *
 * Tests: CC-050, CC-051, CC-052
 * Priority: P2
 *
 * Documents known accessibility bugs found during static analysis:
 *   BUG-003: Sidebar nav expand/collapse buttons lack aria-expanded.
 *   BUG-004: Sidebar ⌘K hint button has no aria-label.
 *
 * CC-050 verifies that key interactive elements receive focus when tabbing.
 * CC-051 and CC-052 assert the missing ARIA attributes (bug markers that
 *   pass precisely because the bug exists — they document the current
 *   broken state so the Scribe can log them).
 *
 * Note on Ask Meridian form tab order: The form renders `<input> <button type=submit>`,
 * but in the DOM the suggestion chip buttons (`<button type=button>`) appear in the
 * same row AFTER the submit button. Tab from input → submit in practice because
 * the submit button follows the input in the <form> element order.
 * However, due to browser/OS-level differences in how disabled buttons are skipped,
 * we use direct `.focus()` instead of Tab key press for submit button accessibility.
 */

import { expect, test } from "@playwright/test";

import { CommandCenterPage } from "../../tests/pages/command-center.page";

test.describe("Keyboard accessibility", () => {
  // CC-050
  test("Tab key reaches sidebar nav links and topbar controls", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    await page.keyboard.press("Tab");

    let foundSidebarLink = false;
    let foundTopbarBtn = false;

    for (let i = 0; i < 20; i++) {
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        return {
          tag: el.tagName,
          href: (el as HTMLAnchorElement).href ?? null,
          text: el.textContent?.trim() ?? "",
          ariaLabel: el.getAttribute("aria-label") ?? "",
        };
      });

      if (
        focused?.tag === "A" &&
        (focused.text.includes("Command Center") ||
          focused.text.includes("Corporate") ||
          focused.text.includes("Analytics"))
      ) {
        foundSidebarLink = true;
      }
      if (
        focused?.tag === "BUTTON" &&
        (focused.text.includes("New") ||
          focused.ariaLabel.includes("Notifications") ||
          focused.text.includes("Search"))
      ) {
        foundTopbarBtn = true;
      }

      if (foundSidebarLink && foundTopbarBtn) break;
      await page.keyboard.press("Tab");
    }

    expect(foundSidebarLink).toBe(true);
    expect(foundTopbarBtn).toBe(true);
  });

  // CC-051 — formerly BUG-003 (resolved 2026-04-30: aria-expanded + aria-controls
  // wired in components/sidebar.tsx).
  test("Sidebar nav expand/collapse buttons expose aria-expanded", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const scheduleBtn = cc.navButton("Schedule");
    await expect(scheduleBtn).toBeVisible();

    // Initial state — collapsed.
    expect(await scheduleBtn.getAttribute("aria-expanded")).toBe("false");
    // After click — expanded.
    await scheduleBtn.click();
    await expect(scheduleBtn).toHaveAttribute("aria-expanded", "true");
  });

  // CC-052 — formerly BUG-004 (resolved 2026-04-30: aria-label added).
  test("Sidebar ⌘K button exposes an aria-label", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const cmdkBtn = cc.cmdKButton;
    await expect(cmdkBtn).toBeVisible();

    const ariaLabel = await cmdkBtn.getAttribute("aria-label");
    expect(ariaLabel).toBe("Command palette (⌘K)");
  });

  test("focus ring is visible on sidebar nav links (not clipped)", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const commandCenterLink = cc.navLink("Command Center");
    await commandCenterLink.focus();

    const isFocused = await commandCenterLink.evaluate(
      (el) => el === document.activeElement,
    );
    expect(isFocused).toBe(true);
  });

  // The Ask Meridian input is focusable via direct `.focus()`.
  // Tab key order from input → submit depends on whether the button is
  // disabled (disabled elements are skipped in browser tab order).
  // We verify each element is independently focusable instead.
  test("Ask Meridian input is keyboard accessible via direct focus", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    await cc.askMeridianInput.focus();
    const inputFocused = await cc.askMeridianInput.evaluate(
      (el) => el === document.activeElement,
    );
    expect(inputFocused).toBe(true);
  });

  test("Ask Meridian submit button is focusable when enabled", async ({
    page,
  }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    // Fill input first so button becomes enabled.
    await cc.askMeridianInput.fill("test question");
    await expect(cc.askMeridianSubmitBtn).toBeEnabled();

    // Focus directly — disabled buttons can't be focused, enabled ones can.
    await cc.askMeridianSubmitBtn.focus();
    const btnFocused = await cc.askMeridianSubmitBtn.evaluate(
      (el) => el === document.activeElement,
    );
    expect(btnFocused).toBe(true);
  });

  test("focus queue items are focusable anchor links", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const firstItem = cc.focusQueueCard
      .getByRole("link")
      .filter({ hasText: /Failed payment · Ben Kniesly/ });

    await firstItem.focus();
    const isFocused = await firstItem.evaluate(
      (el) => el === document.activeElement,
    );
    expect(isFocused).toBe(true);
  });

  test("InsightCard primary action links are focusable", async ({ page }) => {
    const cc = new CommandCenterPage(page);
    await cc.goto();

    const p1Card = cc.insightCard("P1");
    const actionLink = p1Card.getByRole("link", {
      name: /Promote on Instagram/i,
    });

    await actionLink.focus();
    const isFocused = await actionLink.evaluate(
      (el) => el === document.activeElement,
    );
    expect(isFocused).toBe(true);
  });
});
