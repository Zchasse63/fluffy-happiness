# Test Plan — Command Center (`/`)

**Architect:** qa-architect  
**Date:** 2026-04-30  
**Slug:** command-center  
**Source:** specs/features/command-center-analysis.md  

---

## 1. Scope

Test the Command Center page (`/`) end-to-end under `TEST_AUTH_BYPASS=1` (fixture state). All tests run in Chromium via Playwright. The page server-renders with `force-dynamic`; Supabase returns empty under bypass so all sections use fixture data.

**In scope:** Sidebar AppShell, Topbar, PageHero, AI Briefing (IDA cards), KPI Strip, Focus Queue, Today's Schedule, Activity Feed, Weekly Review, Ask Meridian (form + API).

**Out of scope:** Real DB reads, Stripe/Resend/Inngest, chart visual fidelity, MJML campaigns.

---

## 2. File Structure

```
tests/pages/
  command-center.page.ts      ← Page Object Model
e2e/command-center/
  cc-shell.spec.ts             ← AppShell: sidebar + topbar
  cc-hero.spec.ts              ← PageHero
  cc-briefing.spec.ts          ← AI Briefing IDA cards
  cc-kpi.spec.ts               ← KPI strip
  cc-focus.spec.ts             ← Focus queue
  cc-schedule.spec.ts          ← Today's schedule
  cc-activity.spec.ts          ← Activity feed
  cc-weekly.spec.ts            ← Weekly review
  cc-ask.spec.ts               ← Ask Meridian form + API
  cc-a11y.spec.ts              ← Keyboard accessibility + aria bugs
```

---

## 3. Page Object Model (`tests/pages/command-center.page.ts`)

The POM wraps the Command Center locators to insulate tests from selector changes.

**Exports:**
- `CommandCenterPage` class with `goto()` and locator properties for all major sections.
- Constructor takes Playwright `Page`.

**Locator groups:**
- `sidebar` — `page.getByRole("complementary").first()`
- `topbar` — `page.locator(".topbar")`
- `hero` — `page.locator(".page-hero")`
- `briefingSection` — wrapping div around the 3 InsightCard grid
- `kpiStrip` — `page.locator(".card").filter({ hasText: "Revenue · today" })`
- `focusQueue` — `page.locator(".card").filter({ hasText: "Focus queue" })`
- `todaySchedule` — `page.locator(".card").filter({ hasText: /Today ·/ })`
- `activityFeed` — `page.locator(".card").filter({ hasText: "Activity" })`
- `weeklyReview` — `page.locator(".card").filter({ hasText: /Weekly review/ })`
- `askMeridian` — `page.locator(".card").filter({ hasText: /Ask a question/ })`

---

## 4. Test Cases

### P0 — Critical (must pass before ship)

| ID | File | Test | Assertion |
|----|------|------|-----------|
| CC-001 | cc-shell | Sidebar renders four nav groups | `["Daily","People","Growth","Run"]` each visible in `aside` |
| CC-002 | cc-shell | Sidebar has five direct nav links | Command Center, Corporate, Analytics, Settings, Employee Portal |
| CC-003 | cc-shell | Topbar renders four controls | search pill, Ask Meridian btn, New btn, Notifications btn |
| CC-004 | cc-shell | Quarterly goal pill visible | `/quarterly goal/i` + `/\$\d+k of \$\d+k/i` |
| CC-005 | cc-briefing | Three IDA briefing cards rendered | 3 `.card` elements within the briefing grid |
| CC-006 | cc-briefing | P1 card has correct rank badge, headline, action | "P1 · Class below threshold" badge; headline contains "Whitney's 7 PM Guided"; "Promote on Instagram" action link |
| CC-007 | cc-briefing | P2 card has correct rank badge, headline, action | "P2 · Credits expiring"; headline contains "4 members"; "Send expiry campaign" |
| CC-008 | cc-briefing | P3 card has correct rank badge, headline, action | "P3 · Revenue anomaly"; headline contains "$178"; "Open analytics" |
| CC-009 | cc-kpi | KPI strip shows all 5 metrics | Revenue · today, Bookings, Walk-ins, No-shows, Attendance rate (fixture labels) |
| CC-010 | cc-kpi | KPI strip shows fixture values | "$234", "27", "2", "1", "94%" |
| CC-011 | cc-focus | Focus queue renders heading + 7-items count | "Focus queue" heading + "7 items" badge |
| CC-012 | cc-focus | P1 focus items visible | "Failed payment · Ben Kniesly" and "Failed payment · Trent Lott" |
| CC-013 | cc-ask | Ask Meridian banner visible with correct heading text | paragraph contains "Ask a question about your studio" |
| CC-014 | cc-ask | Submit button disabled when input empty | `ask-button` has `disabled` attr on load |
| CC-015 | cc-ask | Empty body POST returns 400 | API request test — `POST /api/ai/ask` with `{}` returns 4xx |

### P1 — High (should pass before ship)

| ID | File | Test | Assertion |
|----|------|------|-----------|
| CC-016 | cc-hero | PageHero title visible | `h1` contains "Good morning, Zach." |
| CC-017 | cc-hero | PageHero meta line matches date pattern | text matches `/{weekday}, {Month} \d+ · Operational briefing/` |
| CC-018 | cc-hero | "Daily brief" and "New class" buttons visible | both buttons present in `.page-hero` |
| CC-019 | cc-briefing | IDA card data table rows visible | P1 card shows "Booked", "Waitlist", "Last week" data rows |
| CC-020 | cc-briefing | IDA card body text visible | P1 card body contains "Evening Guided usually fills by Monday" |
| CC-021 | cc-briefing | IDA card altAction buttons present | P1 and P2 cards each have a "Notify Wed regulars" / "Offer 2-wk extension" secondary button |
| CC-022 | cc-briefing | AI briefing section head shows timestamp | section head text matches `/AI briefing · generated/i` |
| CC-023 | cc-schedule | Today's schedule renders card heading | heading contains "Today ·" |
| CC-024 | cc-schedule | Schedule shows 7 slots | 7 `<a>` links inside the schedule card |
| CC-025 | cc-schedule | "Live" state badge visible | "Live" badge with green color for 11:00 AM slot |
| CC-026 | cc-schedule | "Next up" state badge visible | "Next up" badge for 1:00 PM slot |
| CC-027 | cc-schedule | "!" alert badge visible for Whitney 7PM slot | badge-down element in 7:00 PM row |
| CC-028 | cc-activity | Activity feed renders "Activity" heading | "Activity" in `SectionHead` of activity card |
| CC-029 | cc-activity | Activity feed shows at least 4 entries | 4+ `.timeline-item` elements |
| CC-030 | cc-activity | First fixture entry visible | "Alex Park" + "Booked 6 PM Guided Sauna" |
| CC-031 | cc-weekly | Weekly review heading visible | text matches `/Weekly review/` |
| CC-032 | cc-weekly | Revenue row shows current and prior | "Revenue" label + "$412" + "was $368" |
| CC-033 | cc-weekly | Delta badges present | `+12.0%` and `-40.0%` (new members) visible |
| CC-034 | cc-focus | P2 focus item "Whitney's 7 PM" visible | title text contains "Whitney's 7 PM Guided" |
| CC-035 | cc-focus | P3 focus item "Lead follow-ups" visible | title text contains "Lead follow-ups · 3 stale" |
| CC-036 | cc-ask | Suggestion chips render | 3 suggestion buttons visible with expected text |
| CC-037 | cc-ask | Input accepts text + enables Ask button | type in input, Ask button becomes enabled |
| CC-038 | cc-ask | 503 (Anthropic not configured) renders error in-page | POST `/api/ai/ask` with valid question under no-api-key config returns 503; UI shows error div, not overlay |

### P2 — Nice to have

| ID | File | Test | Assertion |
|----|------|------|-----------|
| CC-039 | cc-shell | Sidebar brand shows "The Sauna Guys" | text visible in `.brand-row` |
| CC-040 | cc-shell | Topbar breadcrumb shows "Daily/" and "Command Center" | two crumb spans visible |
| CC-041 | cc-shell | Theme toggle buttons visible in sidebar footer | "Light theme" and "Dark theme" buttons |
| CC-042 | cc-shell | Sidebar expand/collapse on click | click "Schedule" button → sub-items visible |
| CC-043 | cc-kpi | Sparklines render as SVG `<path>` elements | each KPI cell contains an `svg path` |
| CC-044 | cc-schedule | Hour tick row shows correct ticks | "8A", "12P", "8P" tick labels visible |
| CC-045 | cc-activity | Negative-tone activity entries render | "Ben Kniesly" payment failure entry visible |
| CC-046 | cc-focus | All CTA buttons are links with correct hrefs | "Retry" links to `/revenue/dunning` |
| CC-047 | cc-ask | Suggestion chip "Who hasn't booked..." fires a request | click chip → pending state set (button text becomes "Thinking…") |
| CC-048 | cc-briefing | InsightCard altAction no-op bug documented | clicking "Notify Wed regulars" produces no navigation (bug marker) |
| CC-049 | cc-shell | Topbar "Ask Meridian" button no-op bug documented | clicking topbar Ask Meridian button produces no navigation/action (bug marker) |
| CC-050 | cc-a11y | Interactive elements reachable via Tab | Tab 10 times from body, verify sidebar links + topbar buttons each receive focus |
| CC-051 | cc-a11y | Sidebar nav expand button lacks aria-expanded | `button` for "Schedule" nav item has no `aria-expanded` attribute |
| CC-052 | cc-a11y | Sidebar ⌘K button lacks aria-label | ⌘K button in sidebar footer has no accessible name |
| CC-053 | cc-weekly | Delta badges have correct tones | Revenue row badge is "badge-up"; New members row badge is "badge-down" |

---

## 5. Test Infrastructure

### POM Design
- One `CommandCenterPage` class in `tests/pages/command-center.page.ts`.
- `goto()` method navigates to `/` and waits for the sidebar to be visible.
- All locators defined as getters on the class.
- No test logic inside the POM.

### Fixtures / Test Data
- All tests run against fixture state (Supabase returns empty under bypass).
- Fixture values are imported directly from `lib/fixtures.ts` where needed for numeric assertions.
- No DB writes. No Glofox writes.

### API Tests
- Use Playwright `request` fixture (no browser needed for API contract tests).
- CC-015 (POST /api/ai/ask empty body → 4xx) uses `request.post`.

### Timing Strategy
- `goto("/")` uses Playwright's default `domcontentloaded` wait.
- All visibility assertions use default 5s timeout (Playwright's default).
- No `page.waitForTimeout()` — use `expect(...).toBeVisible()` or `waitForURL`.
- For Ask Meridian form, use `page.waitForResponse` to await the API call (CC-038, CC-047).

### Anti-patterns to avoid
- No `page.waitForTimeout()`.
- No `page.$eval` for simple visibility.
- No hard-coded `nth()` indexes for items that may reorder.
- No assertions on CSS pixel values.
- No `page.locator("div >> text=foo")` legacy chains.

---

## 6. Known Bugs to Document

The following issues found during analysis should be documented in the bugs file, not fixed by tests:

| Bug ID | Description | Severity |
|--------|-------------|----------|
| BUG-001 | Topbar "Ask Meridian" button has no click handler — inert | Medium |
| BUG-002 | InsightCard `altAction` button has no click handler — inert | Low |
| BUG-003 | Sidebar nav items with children lack `aria-expanded` — WCAG 4.1.2 | Medium |
| BUG-004 | Sidebar ⌘K button has no `aria-label` — missing accessible name | Low |
| BUG-005 | `WeeklyReviewCard` section head "Mon–Tue" hardcoded, not dynamic | Low |
| BUG-006 | Focus queue `totalLabelCount` always shows fixture count (7), not live count | Low |
| BUG-007 | KPI strip fixture/live schema mismatch: fixture shows Walk-ins/No-shows/Attendance, live shows Classes·7d/Revenue·7d/New-members·7d | Low (intentional in fixture mode, but the fixture KPI labels are now wrong for live state) |

---

## 7. Test Counts by Priority

| Priority | Count |
|----------|-------|
| P0 (Critical) | 15 |
| P1 (High) | 23 |
| P2 (Nice-to-have) | 15 |
| **Total** | **53** |

---

## 8. Exit Criteria

- All P0 tests pass.
- All P1 tests pass (or are documented as real bugs, not test issues).
- P2 tests pass or are documented with a clear reason (e.g., expected behavior, known deferred item).
- Real bugs documented in `specs/bugs/command-center-bugs.md`.
- No test uses `waitForTimeout`.
