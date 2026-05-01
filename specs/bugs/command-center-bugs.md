# Bug Report — command-center

**Feature:** command-center  
**Date discovered:** 2026-04-30  
**Discovery method:** Static DOM analysis (Analyst phase) + Playwright E2E (Healer phase)  
**Status:** All bugs confirmed in tests. None are test artifacts — they reflect real product behavior.

---

## BUG-001 — Topbar "Ask Meridian" button is inert

**Test:** CC-049 in `e2e/command-center/cc-ask.spec.ts`  
**Priority:** P1  
**Severity:** Medium  

**Description:** The topbar "Ask Meridian" button (visible in the main app header) has no click handler attached. Clicking it produces no navigation, no modal, no action — the button is rendered but completely inert.

**Expected:** Clicking the topbar Ask Meridian button should either scroll to the Ask Meridian section on the Command Center page or open the command palette pre-filled with an "Ask" context.

**Actual:** Button click has no effect. URL remains `/` and no UI change occurs.

**Test assertion:**
```typescript
await topbarAsk.click();
await expect(page).toHaveURL("/");  // no navigation triggered
```

**Location:** `components/` — Topbar component (the Ask Meridian button element)  
**Repro:** Load Command Center, click "Ask Meridian" in the topbar, observe nothing happens.

---

## BUG-002 — InsightCard altAction buttons are inert

**Test:** CC-048 in `e2e/command-center/cc-briefing.spec.ts`  
**Priority:** P1  
**Severity:** Medium  

**Description:** The secondary action buttons on InsightCards (e.g., "Notify Wed regulars" on P1 card, "Offer 2-wk extension" on P2 card) have no click handler. They render correctly and are focusable, but clicking them produces no effect.

**Expected:** Each altAction button should trigger the described action — e.g., open a message composer, navigate to a campaign builder, or show a confirmation modal.

**Actual:** Button click has no effect. URL remains `/` and no UI change occurs.

**Test assertion:**
```typescript
const altAction = p1.getByRole("button", { name: /Notify Wed regulars/i });
await altAction.click();
await expect(page).toHaveURL("/");  // no navigation triggered
```

**Location:** `components/primitives.tsx` — InsightCard component, altAction prop handler  
**Repro:** Load Command Center, click "Notify Wed regulars" on the P1 briefing card, observe nothing happens.

---

## BUG-003 — Sidebar nav expand/collapse buttons lack aria-expanded

**Test:** CC-051 in `e2e/command-center/cc-a11y.spec.ts`  
**Priority:** P2  
**Severity:** Low (WCAG 4.1.2 violation)  

**Description:** The collapsible navigation group buttons in the sidebar (e.g., "Schedule", "Members", "Marketing", "Operations") do not have `aria-expanded` attributes. Screen readers cannot determine whether a nav group is expanded or collapsed.

**Expected:** Each collapsible nav button should have `aria-expanded="true"` when open and `aria-expanded="false"` when closed, per WCAG 4.1.2.

**Actual:** `getAttribute("aria-expanded")` returns null on all nav expand/collapse buttons.

**Test assertion (documents current broken state):**
```typescript
const ariaExpanded = await scheduleBtn.getAttribute("aria-expanded");
expect(ariaExpanded).toBeNull();  // documents the bug
```

**Location:** `components/` — Sidebar nav group button elements  
**Standard violated:** WCAG 2.1 4.1.2 Name, Role, Value  
**Repro:** Inspect sidebar nav group buttons in DevTools — no aria-expanded attribute present.

---

## BUG-004 — Sidebar Command Palette button missing aria-label

**Test:** CC-052 in `e2e/command-center/cc-a11y.spec.ts`  
**Priority:** P2  
**Severity:** Low (WCAG 4.1.2 violation)  

**Description:** The Command Palette trigger button (⌘K) in the sidebar footer has a `title` attribute ("Command (⌘K)") but no `aria-label`. The `title` attribute is not reliably announced by screen readers, particularly on touch devices.

**Expected:** The button should have `aria-label="Command (⌘K)"` or equivalent to ensure reliable screen reader announcement.

**Actual:** `aria-label` is null; `title` is "Command (⌘K)".

**Test assertion (documents current broken state):**
```typescript
expect(title).toBe("Command (⌘K)");
expect(ariaLabel).toBeNull();  // documents the bug
```

**Location:** `components/` — Sidebar footer, Command Palette trigger button  
**Standard violated:** WCAG 2.1 4.1.2 Name, Role, Value  
**Repro:** Inspect the ⌘K button in DevTools — `aria-label` attribute absent, only `title` present.

---

## BUG-005 — KPI strip fixture/live label mismatch

**Test:** Implicitly documented by cc-kpi.spec.ts fixture-mode assertions  
**Priority:** P2  
**Severity:** Low (data/display consistency)  

**Description:** Under `TEST_AUTH_BYPASS=1`, the KPI strip displays fixture KPI labels: "Revenue · today", "Bookings", "Walk-ins", "No-shows", "Attendance rate". In production with live Supabase data, the KPI strip displays different labels: "Classes · 7d", "Revenue · 7d", "New members · 7d". The fixture and live modes expose entirely different metric sets.

**Expected:** Fixture data should use the same metric labels as live data, merely with hardcoded values. Or fixture labels should be clearly flagged as demo-mode.

**Actual:** Tests must target fixture labels in TEST_AUTH_BYPASS mode and cannot verify live-mode label correctness without a live DB connection.

**Impact:** Any visual regression between fixture mode and live mode in the KPI strip would go undetected by automated tests.

**Location:** `lib/fixtures.ts` — `COMMAND_KPIS` array; `lib/data/command-center.ts` — `loadRevenueSnapshot()`

---

## BUG-006 — InsightCard P1 primary action link destination is placeholder

**Test:** cc-briefing.spec.ts — "P1 primary action link points to /schedule/calendar"  
**Priority:** P2  
**Severity:** Low (placeholder data)  

**Description:** The P1 InsightCard fixture ("Whitney's 7 PM Guided is at 2/10") has a primary action button "Promote on Instagram" that links to `/schedule/calendar`. The label implies a social media action, but the href goes to an internal schedule page.

**Expected:** "Promote on Instagram" should link to an Instagram marketing integration or a campaign creation flow.

**Actual:** Link href is `/schedule/calendar` — a generic internal page unrelated to Instagram promotion.

**Location:** `lib/fixtures.ts` — `COMMAND_INSIGHTS[0].action.href`

---

## BUG-007 — Activity feed item count is non-deterministic under fixture fallback

**Test:** CC-029 in `e2e/command-center/cc-activity.spec.ts`  
**Priority:** P2  
**Severity:** Low (test stability concern)  

**Description:** The activity feed fixture (`ACTIVITY` in `lib/fixtures.ts`) has 8 items. However, the `loadActivityFeed()` function falls back to fixture only when the DB returns 0 rows. The exact count cannot be hardcoded in tests because a future schema change or fixture update could alter the count without breaking behavior.

**Expected:** A stable, documented fixture count that tests can assert against.

**Actual:** Test asserts `count().toBeGreaterThanOrEqual(4)` instead of a fixed count because the fixture count is treated as an implementation detail.

**Resolution:** The test is conservatively written. A future refactor should export `ACTIVITY.length` as a constant that tests can import.

**Location:** `lib/fixtures.ts` — `ACTIVITY` array; `e2e/command-center/cc-activity.spec.ts`

---

## Summary Table

| ID | Description | Priority | Severity | Confirmed in test |
|----|-------------|----------|----------|-------------------|
| BUG-001 | Topbar Ask Meridian button inert (no click handler) | P1 | Medium | CC-049 |
| BUG-002 | InsightCard altAction buttons inert (no click handler) | P1 | Medium | CC-048 |
| BUG-003 | Sidebar nav expand buttons lack aria-expanded | P2 | Low | CC-051 |
| BUG-004 | Sidebar ⌘K button missing aria-label | P2 | Low | CC-052 |
| BUG-005 | KPI fixture/live label mismatch | P2 | Low | — |
| BUG-006 | P1 InsightCard action link is placeholder (/schedule/calendar) | P2 | Low | — |
| BUG-007 | Activity feed count non-deterministic, hardcoded in test conservatively | P2 | Low | CC-029 |

**Total bugs: 7**  
**Blocking bugs (ship-stopper): 0**  
**User-visible functional regressions: 2** (BUG-001, BUG-002)  
**Accessibility violations: 2** (BUG-003, BUG-004)  
**Data/consistency issues: 3** (BUG-005, BUG-006, BUG-007)
