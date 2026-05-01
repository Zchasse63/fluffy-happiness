/*
 * Page Object Model — Command Center (`/`).
 *
 * Encapsulates locators for every major section of the Command Center page.
 * All tests import from here; selector changes require edits in one place only.
 *
 * Under TEST_AUTH_BYPASS=1, Supabase returns empty and the page renders from
 * fixture data in lib/fixtures.ts. POM locators are designed against that state.
 */

import type { Locator, Page } from "@playwright/test";

export class CommandCenterPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
    // Wait for the sidebar landmark — confirms AppShell hydration is complete.
    await this.sidebar.waitFor({ state: "visible" });
  }

  // ─── AppShell shell ────────────────────────────────────────────────

  /** The `<aside class="sidebar">` element. */
  get sidebar(): Locator {
    return this.page.getByRole("complementary").first();
  }

  /** The `.topbar` element. */
  get topbar(): Locator {
    return this.page.locator(".topbar");
  }

  /** The `<main class="main">` content area. */
  get main(): Locator {
    return this.page.locator("main.main");
  }

  // ─── Topbar controls ──────────────────────────────────────────────

  get searchPill(): Locator {
    return this.page.getByRole("button", { name: /search or run a command/i });
  }

  get topbarAskMeridianBtn(): Locator {
    // Scoped to topbar to avoid matching the banner section heading below.
    return this.topbar.getByRole("button", { name: /ask meridian/i });
  }

  get topbarNewBtn(): Locator {
    return this.topbar.getByRole("button", { name: "New" });
  }

  get topbarNotificationsBtn(): Locator {
    return this.page.getByRole("button", { name: "Notifications" });
  }

  // ─── Sidebar ──────────────────────────────────────────────────────

  /** Text of a nav group label, e.g. "Daily" */
  navGroupLabel(name: string): Locator {
    return this.sidebar.getByText(name, { exact: true });
  }

  /** A direct nav link in the sidebar (items without children). */
  navLink(name: string): Locator {
    return this.sidebar.getByRole("link", { name });
  }

  /** A nav button (collapsible parent item). */
  navButton(name: string): Locator {
    return this.sidebar.getByRole("button", { name });
  }

  get quarterlyGoalLabel(): Locator {
    return this.sidebar.getByText(/quarterly goal/i);
  }

  get quarterlyGoalAmount(): Locator {
    return this.sidebar.getByText(/\$\d+k of \$\d+k/i);
  }

  get cmdKButton(): Locator {
    // The ⌘K hint button at the bottom of the sidebar footer.
    // It has title="Command (⌘K)" but no aria-label (known bug BUG-004).
    return this.sidebar.locator("button[title='Command (⌘K)']");
  }

  get themeToggleLight(): Locator {
    return this.sidebar.getByRole("button", { name: "Light theme" });
  }

  get themeToggleDark(): Locator {
    return this.sidebar.getByRole("button", { name: "Dark theme" });
  }

  // ─── PageHero ──────────────────────────────────────────────────────

  get heroSection(): Locator {
    return this.page.locator(".page-hero");
  }

  get heroTitle(): Locator {
    return this.page.getByRole("heading", { level: 1 });
  }

  get heroDailyBriefBtn(): Locator {
    return this.heroSection.getByRole("button", { name: /daily brief/i });
  }

  get heroNewClassLink(): Locator {
    return this.heroSection.getByRole("link", { name: /new class/i });
  }

  // ─── AI Briefing ──────────────────────────────────────────────────

  /**
   * The grid container holding the 3 IDA briefing cards.
   *
   * DOM structure:
   *   <div>
   *     <div class="section-head"><h2>AI briefing…</h2></div>
   *     <div style="grid-template-columns: repeat(3, 1fr)">   ← grid
   *       <div class="card">…</div>  × 3
   *     </div>
   *   </div>
   *
   * CSS adjacent-sibling combinator selects the grid immediately after
   * the `.section-head` containing "AI briefing" text.
   */
  get briefingGrid(): Locator {
    return this.page
      .locator(".section-head")
      .filter({ hasText: /AI briefing/i })
      .locator("+ div");
  }

  /** All three InsightCard elements within the briefing grid. */
  get insightCards(): Locator {
    return this.briefingGrid.locator(".card");
  }

  /**
   * A specific InsightCard by its rank badge text.
   * Badge renders as: `{rank} · {kicker}` — the card text starts with that.
   * Scoped to `main.main`.
   */
  insightCard(rank: "P1" | "P2" | "P3"): Locator {
    return this.main
      .locator(".card")
      .filter({ hasText: new RegExp(`^${rank} ·`) });
  }

  // ─── KPI Strip ────────────────────────────────────────────────────

  /**
   * The KPI strip card. Scoped to main.
   * Fixture mode labels: "Revenue · today", "Bookings", "Walk-ins",
   * "No-shows", "Attendance rate".
   */
  get kpiStrip(): Locator {
    return this.main
      .locator(".card")
      .filter({ hasText: "Revenue · today" })
      .first();
  }

  // ─── Focus Queue ──────────────────────────────────────────────────

  get focusQueueCard(): Locator {
    return this.main.locator(".card").filter({ hasText: "Focus queue" });
  }

  // ─── Today's Schedule ─────────────────────────────────────────────

  get todayScheduleCard(): Locator {
    return this.main.locator(".card").filter({ hasText: /Today ·/ });
  }

  /**
   * All <a> role links inside the today schedule card.
   * Includes 7 slot links + 1 "Open schedule" header link = 8 total.
   */
  get scheduleSlots(): Locator {
    return this.todayScheduleCard.getByRole("link");
  }

  /**
   * Only the slot row links (excludes the "Open schedule" header link).
   * Filtered to <a> elements containing a time pattern like "11:00 AM".
   */
  get scheduleSlotRows(): Locator {
    return this.todayScheduleCard.locator("a[href='/schedule/calendar']").filter({
      hasText: /\d+:\d+ [AP]M/,
    });
  }

  // ─── Activity Feed ────────────────────────────────────────────────

  /**
   * The activity feed card.
   *
   * Selector strategy: use the `.section-head` adjacent-sibling pattern
   * (same as briefingGrid) to find the card that owns the "Activity" section
   * head. The `filter({hasText: /^Activity$/})` approach fails because Playwright
   * tests the full textContent of the element, and the card contains many
   * timeline entries — not just "Activity".
   *
   * Instead, find the `.card` that is the parent of the `.section-head`
   * containing exactly "Activity" as its h2 text.
   */
  get activityFeedCard(): Locator {
    // The ActivityFeedCard renders: <div class="card"><SectionHead>Activity</SectionHead>...
    // getByRole("heading", {name: "Activity"}) anchors to the h2, then traverse up to .card.
    return this.main
      .locator(".card")
      .filter({ has: this.page.getByRole("heading", { name: "Activity", level: 2 }) });
  }

  get timelineItems(): Locator {
    return this.activityFeedCard.locator(".timeline-item");
  }

  // ─── Weekly Review ────────────────────────────────────────────────

  get weeklyReviewCard(): Locator {
    return this.main.locator(".card").filter({ hasText: /Weekly review/ });
  }

  // ─── Ask Meridian ─────────────────────────────────────────────────

  get askMeridianCard(): Locator {
    return this.main
      .locator(".card")
      .filter({ hasText: /Ask a question about your studio/ });
  }

  get askMeridianInput(): Locator {
    return this.askMeridianCard.getByPlaceholder(/how many members/i);
  }

  get askMeridianSubmitBtn(): Locator {
    return this.askMeridianCard.getByRole("button", { name: /^Ask/ });
  }

  get askMeridianErrorDiv(): Locator {
    return this.askMeridianCard.locator("div").filter({
      hasText: /http|error|not configured/i,
    }).last();
  }

  get askMeridianResultDiv(): Locator {
    return this.askMeridianCard.locator("div[style*='pre-wrap']");
  }

  /**
   * A suggestion chip button. The chips render their text content as the
   * button text (e.g. `"Who hasn't booked in 21 days?"`). Playwright's
   * `getByRole("button", {name})` matches against accessible name, which
   * is the button's text content — so we pass the raw text without the
   * surrounding quotes that appear in the DOM.
   */
  suggestionChip(text: string): Locator {
    return this.askMeridianCard.getByRole("button", { name: text });
  }
}
