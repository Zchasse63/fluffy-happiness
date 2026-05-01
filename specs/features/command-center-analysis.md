# Feature Design Document — Command Center (`/`)

**Analyst:** qa-analyst  
**Date:** 2026-04-30  
**Slug:** command-center  

---

## 1. Overview

Command Center is the primary landing page of the Meridian operator dashboard for The Sauna Guys. It is a server-rendered (`force-dynamic`) async server component that fetches six parallel data streams, falls back to fixture data when Supabase returns empty (as it will under `TEST_AUTH_BYPASS=1`), and composes a full-page operational briefing.

**Target URL:** `http://localhost:3001/`  
**Route file:** `app/page.tsx`  
**Test mode:** `TEST_AUTH_BYPASS=1` — Supabase RLS returns empty; all data comes from fixtures in `lib/fixtures.ts`.

---

## 2. Component Inventory

### 2.1 AppShell (`components/app-shell.tsx`)
- Client component. Manages ⌘K state, wraps `Sidebar`, `Topbar`, `main`, `CommandPalette`.
- Skips chrome for `/login` and `/auth` prefixes.
- Renders `<aside class="sidebar">` + `<div><topbar/><main class="main">...</main></div>`.

### 2.2 Sidebar (`components/sidebar.tsx`)
- Client component. Reads `NAV` from `lib/nav.ts`.
- Four nav groups: **Daily**, **People**, **Growth**, **Run**.
- Items without children render as `<Link>` (Command Center, Corporate, Analytics, Settings, Employee Portal).
- Items with children render as `<button>` with expand/collapse.
- Footer: quarterly goal pill ("$240k of $300k earned"), progress bar, light/dark theme toggle, ⌘K hint button.
- Brand row: "The Sauna Guys" + "Tampa · Meridian".

### 2.3 Topbar (`components/topbar.tsx`)
- Client component. Breadcrumbs derived from `PAGE_TITLES[pathname]`.
- Command Center crumb: `Daily / Command Center` (two crumb spans).
- Topbar buttons: "Search or run a command" (⌘K pill), "Ask Meridian" (ghost), "New" (primary), bell icon (Notifications).
- Also renders `Avatar` component.

### 2.4 PageHero (`components/primitives.tsx` → `PageHero`)
- Meta line: `"{weekday, Month day} · Operational briefing"` (dynamically generated from `new Date()`).
- Title: `"Good morning, Zach."` (hardcoded).
- Subtitle: hardcoded JSX with Whitney's 7pm Guided reference.
- Actions: "Daily brief" (ghost button), "New class" (primary link to `/schedule/calendar`).

### 2.5 AI Briefing Section
- `SectionHead` with right-side copy `"3 of 3 · next at 6 AM tomorrow"`.
- Label: `"AI briefing · generated {briefingTs}"`.
- Under `TEST_AUTH_BYPASS`: `loadLatestBriefing()` returns `null` → falls back to `COMMAND_INSIGHTS` (3 fixture cards).
- Renders `COMMAND_INSIGHTS.map(i => <InsightCard key={i.kicker} insight={i} />)`.

### 2.6 InsightCard IDA Pattern (`components/primitives.tsx` → `InsightCard`)
- Props: `rank` (P1/P2/P3/P4), `tone` (neg/warn/info/pos), `kicker`, `headline`, `data` (key-value pairs), `body`, `action`, optional `altAction`, optional `href`.
- Renders: badge (`{rank} · {kicker}`), headline (serif), data row (dashed border), body text, action button (link), optional altAction button.
- Optional `onDismiss` prop shows an `aria-label="Dismiss"` button — NOT present on the fixture render (no onDismiss prop passed).
- Fixture cards: P1/neg ("Class below threshold"), P2/warn ("Credits expiring"), P3/info ("Revenue anomaly").

### 2.7 KPI Strip (`components/primitives.tsx` → `KpiStrip`)
- Under `TEST_AUTH_BYPASS`: `snapshot.todayCents === 0` and `today.length === 0` → falls back to `COMMAND_KPIS` (5 fixture KPIs).
- **IMPORTANT:** The fixture `COMMAND_KPIS` labels differ from the live `liveKpis` labels:
  - Fixture slot 2: `"Bookings"` → live: `"Bookings · today"`
  - Fixture slot 3: `"Walk-ins"` → live: `"Classes · 7d"`
  - Fixture slot 4: `"No-shows"` → live: `"Revenue · 7d"`
  - Fixture slot 5: `"Attendance rate"` → live: `"New members · 7d"`
  - **This is a real structural divergence.** The fixture KPIs represent walkIns/noShows/attendanceRate (R3 fix per RELEASE-NOTES); the live KPIs represent a completely different schema.
- Each KPI cell: color dot, label, large value, `ChangeBadge`, foot text, `LineChart` sparkline (60×26).
- `ChangeBadge`: converts `"±0"` to `"+0"` before rendering.

### 2.8 Focus Queue (`components/command-center/focus-queue.tsx`)
- Under `TEST_AUTH_BYPASS`: `loadFocusQueue()` returns `[]` → falls back to `FOCUS_QUEUE` (7 items).
- `SectionHead` right: `"{totalLabelCount} items"` (always `FOCUS_QUEUE.length` = 7, even with live data).
- Each item: priority badge (P1/P2/P3 with tone color), title, meta text, CTA button with arrow.
- Items are `<a href={r.href}>` links.
- P1 items: "Failed payment · Ben Kniesly", "Failed payment · Trent Lott", "Chargeback filed · Dana Ortiz".
- P2 items: "Whitney's 7 PM Guided — 2/10", "Credits expiring · 4 members".
- P3 items: "Lead follow-ups · 3 stale", "Waiver expired · Maya Chen".

### 2.9 Today's Schedule (`components/command-center/today-schedule.tsx`)
- Under `TEST_AUTH_BYPASS`: `loadTodaySchedule()` returns `[]` → falls back to `TODAY_SCHEDULE` (7 slots).
- `SectionHead`: `"Today · {weekday}"` where weekday = `date.split(",")[0]`.
- Hour tick row: `["8A","10A","12P","2P","3P","4P","5P","6P","7P","8P"]`.
- "Now" line: hardcoded position `left: "24%"`, title `"Now 10:42 AM"`.
- Each slot: time, duration, class kind + state badge (Live/Next up/!/none), trainer, fill bar, capacity text.
- State badges: `"live"` → green "Live" badge + dot; `"next"` → "Next up" badge; `"!"` → red "!" badge-down.
- All slots link to `/schedule/calendar`.
- Fixture: 11AM Open Sauna (live), 1PM Cold Plunge (next), 3PM Open Sauna, 5PM Open, 6PM Guided, 7PM Guided Whitney (! alert, 20% fill), 8:15PM Cold Plunge.

### 2.10 Activity Feed (`components/command-center/activity-feed.tsx`)
- Under `TEST_AUTH_BYPASS`: `loadActivityFeed()` returns `ACTIVITY` (8 fixture entries).
- Key: `${e.t}-${e.who}` — potential collision if same person has two events at same timestamp.
- Entries: timestamp (mono), actor name (bold), action description, tone-coded tag.
- `SectionHead` right: `"Last 24h"`.

### 2.11 Weekly Review (`components/command-center/weekly-review.tsx`)
- Under `TEST_AUTH_BYPASS`: all DB queries return 0 → `loadWeeklyReview()` falls back to `WEEK_REVIEW` (6 rows).
- `SectionHead`: `"Weekly review · Mon–Tue"` (hardcoded days, not dynamically computed).
- Right: `"vs last week"` pill-select (no actual select functionality — static display).
- Rows: Revenue, Classes booked, New members, Credits used, Avg fill, Trainer hours.
- Each row: label, current value, "was {prior}", `ChangeBadge`.

### 2.12 Ask Meridian (`components/ask-meridian.tsx`)
- Client component. Bottom-of-page dark card.
- Heading: `"Ask a question about your studio. Meridian will read your data and answer in plain English."`
- Form: search input + "Ask" submit button.
- Three suggestion chips: "Who hasn't booked in 21 days?", "Top 5 days by revenue this month", "Average fill of Whitney's classes".
- POST `/api/ai/ask` with `{ question }`.
- API returns `{ answer, followups }` on success.
- On 503 (`AnthropicNotConfigured`): renders error div with fallback message.
- Error renders in-page (no overlay).
- "Ask" button disabled when `pending` or `!question.trim()`.

---

## 3. Data Flows Under TEST_AUTH_BYPASS

All six loaders are called in parallel on every page load. Under bypass (empty Supabase reads):

| Loader | Returns | Fallback |
|--------|---------|---------|
| `loadLatestBriefing()` | `null` | `COMMAND_INSIGHTS` (3 cards) |
| `loadRevenueSnapshot()` | All zeros | `COMMAND_KPIS` (5 fixture KPIs) |
| `loadTodaySchedule()` | `[]` | `TODAY_SCHEDULE` (7 slots) |
| `loadFocusQueue()` | `[]` | `FOCUS_QUEUE` (7 items) |
| `loadActivityFeed()` | `ACTIVITY` (always returns fixture when no rows) | N/A |
| `loadWeeklyReview()` | All zeros → `WEEK_REVIEW` | `WEEK_REVIEW` (6 rows) |

---

## 4. API Routes Relevant to Command Center

### POST /api/ai/ask
- Auth: `requireRole("owner","manager")` — under TEST_AUTH_BYPASS, passes.
- Body: `{ question: string (min 2, max 500) }` — Zod-validated.
- Success: `{ answer: string, followups: string[] }` with status 200.
- Empty body: 400 (Zod parse fails).
- `AnthropicNotConfigured`: status 503, body `{ error, answer: "AI is not configured…", followups: [] }`.
- Other Anthropic errors: propagate via `authErrorResponse`.

### POST /api/ai/briefing
- Triggers briefing generation; used for cache population. Not directly surfaced on Command Center UI.

---

## 5. Accessibility Observations

From static analysis:

1. **InsightCard action button**: Uses `<a class="btn btn-primary">` with `href`. Keyboard-reachable via Tab.
2. **InsightCard altAction button**: Uses `<button type="button">`. Keyboard-reachable.
3. **Focus queue items**: Use `<a href>` links. Keyboard-reachable.
4. **Today's schedule slots**: Use `<a href="/schedule/calendar">`. Keyboard-reachable.
5. **Ask Meridian suggestions**: Use `<button type="button">`. Keyboard-reachable.
6. **Topbar Notifications button**: Has `aria-label="Notifications"`. Good.
7. **Sidebar ⌘K button**: Has `title="Command (⌘K)"` but NO `aria-label`. Missing accessible name on an interactive element.
8. **Sidebar theme toggle buttons**: Have `aria-label="Light theme"` / `aria-label="Dark theme"`. Good.
9. **Sidebar nav items with children (buttons)**: No `aria-expanded` attribute. Screen readers cannot determine expand/collapse state.
10. **KPI Strip cells**: Rendered as `<div>` with no ARIA roles. Not focusable, not labeled.
11. **Topbar Avatar**: No accessible label.
12. **ChangeBadge**: No `aria-label` — screen reader sees raw text "12.0%" without context.
13. **Brand mark `div`**: Has `aria-hidden` — correct.
14. **"Now" line** in schedule: `title="Now 10:42 AM"` but `title` is not accessible to screen readers as a label.

---

## 6. Known Structural Issues (to test for)

### Issue A: KPI strip fixture/live label mismatch
The fixture `COMMAND_KPIS` has labels `"Walk-ins"`, `"No-shows"`, `"Attendance rate"` (slots 3-5). The live `liveKpis` replaces them with `"Classes · 7d"`, `"Revenue · 7d"`, `"New members · 7d"`. Tests must be written against fixture labels, not live labels.

### Issue B: `WeeklyReviewCard` shows `"Weekly review · Mon–Tue"` hardcoded
Days are not computed dynamically. On any day other than Mon/Tue this is incorrect. Not a test-blocker but is a real product bug.

### Issue C: Focus queue `totalLabelCount` hardcoded to `FOCUS_QUEUE.length`
The prop `totalLabelCount={FOCUS_QUEUE.length}` is hardcoded to 7 even when live focus queue has fewer items. The displayed "7 items" does not reflect actual item count when live.

### Issue D: `InsightCard` key uses `insight.kicker`
`key={i.kicker}` — if two insights share the same kicker string, React will warn. Fixture kickers are unique, but AI-generated briefings may not be.

### Issue E: Activity feed key collision risk
`key={${e.t}-${e.who}}` — collides if same person posts two events at the same minute. Benign for fixture data but a real edge case in live data.

### Issue F: Topbar "Ask Meridian" button is inert
The topbar renders `<button type="button" class="btn btn-ghost">Ask Meridian</button>` with no `onClick`. It has no handler — clicking it does nothing. This is a UI bug (the actual Ask Meridian banner is at the bottom of the page body).

### Issue G: Sidebar nav items with children lack `aria-expanded`
`<button>` elements that control expand/collapse of nav sub-items have no `aria-expanded` attribute. WCAG 4.1.2 violation.

### Issue H: `InsightCard` `altAction` button has no accessible label beyond its text
When rendered (not on Command Center fixture since no `altAction` present in fixture data — wait: fixture cards DO have altAction). `altAction` buttons render as plain `<button type="button">` with the text content. This is acceptable but no `href` navigation — clicking "Notify Wed regulars" does nothing (no handler wired).

### Issue I: `InsightCard altAction` has no click handler
In `components/primitives.tsx`, the `altAction` button is `<button type="button" className="btn btn-link hov">` with no `onClick`. Clicking it is a no-op. A user pressing this button in production gets no feedback or action.

---

## 7. Selector Strategy

| Element | Reliable Selector |
|---------|------------------|
| Sidebar | `page.getByRole("complementary").first()` |
| Nav group labels | `sidebar.getByText(label, {exact:true})` |
| Nav links (no children) | `sidebar.getByRole("link", {name: ...})` |
| Nav buttons (with children) | `sidebar.getByRole("button", {name: ...})` |
| Topbar search pill | `page.getByRole("button", {name: /search or run a command/i})` |
| Topbar Ask Meridian | `page.getByRole("button", {name: /ask meridian/i})` — Note: sidebar also has a ⌘K button but it has different text |
| Topbar New | `page.getByRole("button", {name: "New"})` |
| Topbar Notifications | `page.getByRole("button", {name: "Notifications"})` |
| Quarterly goal pill | `page.getByText(/quarterly goal/i)` |
| PageHero title | `page.getByRole("heading", {level: 1, name: /good morning/i})` |
| AI briefing section head | `page.getByText(/ai briefing/i)` |
| InsightCard badge | `.badge` containing `"P1 · Class below threshold"` etc. |
| KPI strip | `page.getByText("Revenue · today")`, `page.getByText("Walk-ins")` etc. |
| Focus queue heading | `page.getByText("Focus queue")` |
| Today schedule heading | `page.getByText(/Today ·/)` |
| Activity feed heading | `page.getByText("Activity")` |
| Weekly review heading | `page.getByText(/Weekly review/)` |
| Ask Meridian form | `page.getByPlaceholder(/how many members/i)` |
| Ask Meridian submit | `page.getByRole("button", {name: /^Ask/})` |
| Ask Meridian error | `page.getByText(/http 400/i)` or error div |

---

## 8. Open Questions

None. All required information is available from source analysis.

---

## 9. Test Coverage Gap Analysis

### Existing coverage (in `e2e/command-center.spec.ts`):
- Sidebar nav groups rendered (4 labels)
- Topbar elements visible (4 buttons)
- Quarterly goal pill text matches regex
- Breadcrumb "Daily/" and "Command Center" visible
- "Ask a question about your studio..." copy visible

### Missing coverage:
- PageHero heading text, meta line, action buttons
- AI briefing cards: all 3 IDA cards with correct P-rank, tone badge, headline, data table, body, action button
- KPI strip: all 5 KPIs visible with correct fixture values
- Focus queue: items rendered with correct priorities and CTA links
- Today's schedule: slots rendered with state badges (live, next, !)
- Activity feed: entries visible with tone-coded tags
- Weekly review: rows rendered with delta badges
- Ask Meridian: form submit flow (success + error paths)
- Ask Meridian: suggestion chip click fires request
- Ask Meridian: disabled state when input is empty
- Keyboard accessibility: Tab order reaches interactive elements
- Sidebar nav expand/collapse via keyboard
- Topbar Ask Meridian button no-op bug verification
- InsightCard altAction button no-op bug verification
- Sidebar ⌘K button missing aria-label
- Theme toggle persists to localStorage
