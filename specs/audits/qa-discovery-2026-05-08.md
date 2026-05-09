# QA Discovery Report — 2026-05-08

**Phase:** 1 of 4 (Discovery)
**Author:** Claude Code (autonomous QA pipeline)
**Pipeline ref:** `architect → implement → review → simplify → verify`
**Sources:**
- Live Supabase queries against project `ptgeijftzfykjbiujvty` (TSG Main)
- Direct Glofox API probes (raw response shape capture)
- Per-page audit (one-shot agent pass over `app/**/page.tsx` + `lib/data/*.ts`)
- Sync engine source review (`lib/glofox/{client,sync-engine,transformers,types}.ts`)

---

## Executive summary

Meridian's UI is **largely live-wired correctly** — 23 of 27 audited pages read from Supabase via `lib/data/*` loaders, with `lib/fixtures.ts` correctly gated behind `TEST_AUTH_BYPASS=1`. The pervasive "stale data / wrong data / not loading" symptoms reduce to **two root causes plus a layer of cosmetic placeholders**:

1. **Glofox sync engine has wrong field names and status enums for bookings and class_instances.** Every booking pulled from Glofox since the field names diverged has been silently dropped at FK resolution. Last successful booking write: 2026-04-28. Today: 2026-05-08. The DB shows 2574 bookings (frozen), 0 of which point at any class starting after now.
2. **Inngest hourly cron is not running** — `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are absent from `.env.local`. Even when sync runs successfully, no automated refresh fires.
3. **Multiple pages embed hardcoded literals** that look like analytics: pricing simulators, retention curves, promo codes attributed to specific trainers, dunning retry schedules. Operators read these as real numbers.

Plus: **9 native (non-Glofox) tables are entirely empty** because they have no source-of-truth integration. These pages render empty states correctly in live mode (`fixtureFallback` returns `[]` outside bypass), so they're not broken, just feature-incomplete.

The remediation plan is **fix-the-sync-first**, then page-by-page hardcoded extraction, then refresh cadence. Build a `loadPoPDelta()` helper to retire the sea of `"+0%"` placeholder badges.

---

## Section A — Sync engine bugs (root cause of staleness)

### A.1 Booking transformer: field-name mismatch

`lib/glofox/types.ts:65-73` declares `GlofoxBooking` with fields `class_id`, `created_at`, `cancelled_at`. Live Glofox `/2.2/branches/{branchId}/bookings` returns:

```json
{
  "_id": "...", "user_id": "...", "user_name": "...",
  "event_id": "...",            // ← we read class_id (always undefined)
  "type": "events", "model": "events",
  "status": "BOOKED",            // ← uppercase, our mapper expects lowercase
  "is_from_waiting_list": false,
  "canceled_at": null,           // ← American spelling, we read cancelled_at
  "created": "2023-12-25 19:02:35",  // ← we read created_at
  "modified": "...", "time_start": "...", "time_finish": "..."
}
```

`lib/glofox/transformers.ts:142` reads `b.class_id` → `undefined`. The sync engine line 286 then drops every row: `if (!class_instance_id || !member_id) return null;`.

**Evidence:**
- Sync `count` log claims `bookings: 6056` (Glofox returned).
- After sync, `MAX(updated_at)` on bookings table is unchanged (last write: 2026-04-28).
- DB count: 2574 bookings (frozen at 10 days old).
- Sample of 100 raw Glofox bookings: 100/100 status="BOOKED", 100/100 have `event_id`, 0/100 have `class_id`.

### A.2 Class transformer: field-name mismatch

`lib/glofox/types.ts:52-63` declares `GlofoxClass` with `starts_at`, `ends_at`, `capacity`, `booked_count`. Live `/2.0/events` returns:

```json
{
  "_id": "...", "name": "...",
  "time_start": 1778243400,   // ← unix seconds, we read starts_at
  "duration": 60,             // ← minutes, we have no ends_at field
  "size": 12,                 // ← we read capacity
  "booked": 0,                // ← we read booked_count
  "waiting": 0,               // ← waitlist count, never captured
  "status": "BOOKING_WINDOW_PASSED",  // ← not in our enum
  "program_id": "...", "trainers": ["..."]
}
```

The same silent-drop pattern: `transformers.ts:90-114` reads `c.starts_at` (undefined), the sync filter at `sync-engine.ts:245` drops the row because `starts_at` is null.

The 1077 class_instances in the DB are residual — written at some earlier point (presumably by `scripts/glofox-to-sql.mjs` which DOES use `time_start` correctly per its line 257). Since then no class_instance has been freshly written. Most "future" classes in DB (62 rows) extend to 2026-05-27 because they were captured during the earlier backfill window; nothing past that exists.

### A.3 Booking status enum: case + missing values

`lib/glofox/transformers.ts:147-161` `mapBookingStatus()` checks lowercase strings. Glofox returns:

| Glofox value | Our enum maps to | Correct? |
|---|---|---|
| `"BOOKED"` | `"booked"` (via default) | ✓ accidentally |
| `"CANCELED"` | `"booked"` (via default — case mismatch) | ✗ silently wrong |
| `"CHECKED_IN"` | `"booked"` (via default — case mismatch) | ✗ silently wrong |
| `"NO_SHOW"` | `"booked"` (via default — case mismatch) | ✗ silently wrong |
| `"WAITLIST"` (or `"ON_WAITLIST"`) | `"booked"` (via default — case mismatch) | ✗ silently wrong |

**Effect:** even if FK resolution were fixed, every non-BOOKED status would be mis-mapped. 0 waitlisted in DB confirms this.

### A.4 Inngest cron not active

`lib/inngest/client.ts:19-23` constructs the Inngest client with `eventKey: process.env.INNGEST_EVENT_KEY` / `signingKey: process.env.INNGEST_SIGNING_KEY`. Both are absent from `.env.local`. CLAUDE.md DEFERRED.md still lists these as needed. Confirmed: no Inngest cron deliveries have ever fired in production.

`netlify.toml` has no scheduled-function declarations (only timeout overrides). There is **no second scheduled-job mechanism** as a fallback.

---

## Section B — Per-page audit (27 routes)

Counts: **23 LIVE · 4 PARTIAL · 0 FIXTURE · 0 BROKEN**

### B.1 P0 — Critical (entire page or core feature is fake)

| Page | Issue | File:lines |
|---|---|---|
| `app/analytics/page.tsx` | `COHORT_RETENTION` (12 retention %) + 3 hardcoded `INSIGHTS` IDA cards (incl. "Whitney's referrals close at 91%") + Member health donut/table values are all baked in | lines 30-83, 197-237 |
| `app/revenue/memberships/page.tsx` | Pricing simulator panel: hardcoded "Monthly Unlimited / $225 → $245 / 42 active members affected / +$840 MRR / churn risk 2-4". Trainer promo codes table: `WHITNEY15 / TRENT10 / BEN10 / LAUNCH25` with literal trainer names + revenue figures | lines 196-222, 281-285 |
| `app/members/[id]/page.tsx` | Inline `loadMember()` hardcodes `engagement: "Active"` for every member; ignores the existing `inferEngagement()` helper. `MEMBERS.find()` fallback (line 64) returns fixture members in **live** mode (no `inBypassMode()` gate) | lines 54, 64 |

### B.2 P1 — Misleading or broken (operator reads wrong info)

| Page | Issue | File:lines |
|---|---|---|
| `app/page.tsx` (Command Center) | Hero subtitle hardcodes "3 things need attention today. Revenue is pacing +12% vs last Tuesday, but Whitney's 7pm Guided is at 2/10". Renders on every load regardless of actual state. | lines 158-163, 191 |
| `app/revenue/dunning/page.tsx` | `nextRetry` and `attempts` columns are synthetic — `lib/data/revenue.ts:172-173` produces "Tomorrow 8 AM / Apr 30 8 AM / Manual review" by row index. No Stripe schedule consulted. | data layer |
| `app/schedule/optimization/page.tsx` | Demand heatmap loader only counts hours 17-20 (`lib/data/schedule.ts:298-302`). Morning, midday, late-evening classes invisible. | data layer |
| `app/revenue/transactions/page.tsx` | "All / Completed / Refunded / Failed" filter tabs render but have no `href` or handler — non-functional UI. | lines 77-83 |
| `app/portal/page.tsx` | "Recent pay stubs" hardcodes 2 stub objects with $1,625 / $1,458 / "Paid Apr 14" / "Pending approval" — looks current to staff. | lines 168-170 |
| `app/marketing/content/page.tsx` | Page-local `FIXTURE_POSTS` array (Whitney / cold-plunge fictional posts) bypasses the `inBypassMode()` gate; renders in live mode when `content_posts` is empty. | lines 18-55, 76-78 |
| `app/settings/page.tsx` | Notifications panel hardcodes "6:00 AM ET to owners + managers / Real-time · Email" regardless of cron-key presence. Lies about cron status. | `lib/data/settings.ts:115-117` |
| `app/marketing/overview/page.tsx` | KPI deltas hardcode `+18 / +4.2 pts / +1.8 pts / +3` — fake period-over-period figures. | lines 67-70 |

### B.3 P2 — Cosmetic / cleanup

| Page | Issue |
|---|---|
| `app/marketing/automations/page.tsx` | Step-strip preview ignores actual `r.steps[]`, renders fixed 4-block decoration |
| `app/members/directory/page.tsx` + multiple others | `+0 / +0%` placeholder deltas everywhere (no PoP helper exists) |
| `app/operations/payroll/page.tsx` | `commissionCents: 0` hardcoded (schema doesn't support); UI shows "—" gracefully |
| `app/revenue/products/page.tsx` | `sold30` heuristic match on description (documented limitation) |
| `app/corporate/page.tsx` | `loadCorporateUpcomingEvents` is a stub returning `[]` (documented) |

### B.4 OK — clean

`app/(auth)/login/page.tsx`, `app/marketing/campaigns/page.tsx`, `app/marketing/leads/page.tsx`, `app/members/segments/page.tsx`, `app/members/segments/[id]/page.tsx`, `app/operations/facilities/page.tsx`, `app/operations/staff/page.tsx`, `app/operations/waivers/page.tsx`, `app/revenue/products/page.tsx`, `app/revenue/giftcards/page.tsx`, `app/revenue/overview/page.tsx`, `app/schedule/calendar/page.tsx`

---

## Section C — Empty native tables (no source of truth)

These tables are reachable via the data layer but have **0 rows**, so pages render empty states (correct behavior — `fixtureFallback` returns `[]` outside bypass mode):

| Table | Rows | Page affected | Source needed |
|---|---|---|---|
| `campaigns` | 0 | marketing/campaigns | Native CRUD UI (create) + Resend send |
| `campaign_recipients` | 0 | marketing/campaigns | Side effect of send |
| `automation_flows` | 0 | marketing/automations | Native CRUD or seed script |
| `automation_enrollments` | 0 | marketing/automations | Inngest worker (deferred) |
| `corporate_accounts` | 0 | corporate | Native CRUD UI |
| `facility_resources` | 0 | operations/facilities | Manual seed (4 known assets) |
| `facility_maintenance` | 0 | operations/facilities | Manual or staff-driven |
| `retail_products` | 0 | revenue/products | Native CRUD UI |
| `gift_cards` | 0 | revenue/giftcards | Stripe webhook (deferred) |
| `waiver_templates` | 0 | operations/waivers | Manual seed (1 master waiver) |
| `member_waivers` | 0 | operations/waivers | Glofox or DocuSign (deferred) |
| `credit_packs` | 0 | dashboard liability KPI | Glofox `/credits` endpoint sync (gap noted in CLAUDE.md) |
| `credit_ledger` | 0 | members/[id] activity | Side effect of credit_packs sync |
| `content_posts` | 0 | marketing/content | Native CRUD UI |
| `ai_insights` | 0 | command center | AI worker (Inngest, deferred) |
| `ai_briefings` | 1 | command center | AI worker (Inngest, deferred) — only 1 stale row |

---

## Section D — Cross-cutting issues

1. **No PoP delta helper.** Affects 7 pages with `+0` / `+0%` placeholder strings. Need one `loadPoPDelta(metric, periodDays)` helper and wire it into all KPI strips.
2. **Two-tier fixture-fallback inconsistency.** `lib/data/_log.ts` correctly gates `fixtureFallback()` behind `TEST_AUTH_BYPASS`. But `app/marketing/content/page.tsx` and `app/members/[id]/page.tsx` use page-local fallbacks that bypass the gate — fixture leak in live mode.
3. **"Whitney" hardcoded across 4 pages.** Real trainer name appears in fictional metrics on Command Center, Analytics, Marketing/Content, Revenue/Memberships. High plausibility = high confusion.
4. **Static UI metadata mixed into `lib/fixtures.ts`.** `KIND_META`, `ENGAGEMENT_TONE`, `TRANSACTION_KIND_META`, `MEMBER_PROFILE_TABS`, `SEGMENTS` (the metadata, not data), `SCHED_DAYS`, `SLOT_LABELS` belong in a `lib/ui-metadata.ts` so `lib/fixtures.ts` is strictly demo data. Right now any audit hits a forest of "fixture imports" most of which are actually static config.
5. **Stripe / Resend / Inngest action buttons render unconditionally.** No `<DisabledFeature reason="…">` wrapper exists. Buttons fire 5xx or no-op when clicked because creds aren't set.
6. **Hero KPI metadata duplicated across pages.** Each page builds its own `kpiItems: KpiCardItem[]` with hardcoded `label / delta / foot` strings around live `value`. A `loadXxxKpis(): KpiCardItem[]` pattern in `lib/data/*` would consolidate.
7. **No Sentry / observability.** `_log.ts logQueryError` is the only error path in the data layer. Once a query silently returns `[]` in live mode, the operator just sees an empty page; we don't know.

---

## Section E — Prioritized fix list (drives Phase 2 / 3)

### Batch A — Sync engine (must land first; blocks every downstream verify)

1. Update `lib/glofox/types.ts` `GlofoxBooking` and `GlofoxClass` to match real wire shape.
2. Update `lib/glofox/transformers.ts` to read correct field names + uppercase status enum (case-insensitive `mapBookingStatus`).
3. Compute `ends_at` from `time_start + duration * 60` in seconds.
4. Class status enum: extend to include `"BOOKING_WINDOW_PASSED"` etc. or normalize to existing values.
5. Capture `waiting` count from events response (separate from `booked_count`) — surfaces empty-but-real waitlist counts on the calendar.
6. Add unit tests covering each transformer with real captured Glofox shapes (not contrived fixtures).
7. Re-run sync; verify `MAX(updated_at)` advances and waitlisted bookings (if any exist) populate.

### Batch B — P0 page fixes

8. `app/analytics/page.tsx` — replace `COHORT_RETENTION`, `INSIGHTS`, member-health donut/table with live data from members + bookings. Build `loadCohortRetention(periodWeeks=12)` and `loadEngagementHealthBreakdown()`.
9. `app/revenue/memberships/page.tsx` — replace pricing simulator with a real form bound to `membership_plans`, OR remove the panel entirely and document as "deferred until pricing tool is scoped". Replace promo codes table with empty-state (no `promo_codes` table exists — wire as future feature).
10. `app/members/[id]/page.tsx` — inline `loadMember` should call `inferEngagement()` and populate `lastVisit` / `joined` / `ltv` from real data. Remove the `MEMBERS.find()` fallback or gate it with `inBypassMode()`.

### Batch C — P1 page fixes

11. `app/page.tsx` — derive hero subtitle from `loadFocusQueue` + `loadRevenueSnapshot`. No literal "Whitney" / "+12%" / "2/10" strings.
12. `app/revenue/dunning/page.tsx` — `nextRetry` should pull from `failed_payments.retry_at` (or document that the column doesn't exist and the data isn't available; render "—").
13. `app/schedule/optimization/page.tsx` — heatmap should bucket all hours, not just 17-20. Probably 4 buckets covering morning / midday / evening / late-evening.
14. `app/revenue/transactions/page.tsx` — wire status filter tabs to `?status=` query param + `loadTransactions({ status })`.
15. `app/portal/page.tsx` — remove hardcoded pay stubs. Empty state until payroll ledger is wired.
16. `app/marketing/content/page.tsx` — gate `FIXTURE_POSTS` behind `inBypassMode()`. Render empty state in live mode.
17. `app/settings/page.tsx` — Notifications panel should reflect `INNGEST_SIGNING_KEY` / `RESEND_API_KEY` presence dynamically, mirroring the integrations list pattern already in the loader.
18. `app/marketing/overview/page.tsx` — replace fake `+18 / +4.2 pts / +1.8 pts / +3` with real PoP deltas (depends on Batch D).

### Batch D — Cross-cutting + cosmetic

19. Build `lib/data/_pop.ts` with `loadPoPDelta(table, metric, periodDays, scope?)`. Replace every `+0` / `+0%` placeholder.
20. Move static UI metadata out of `lib/fixtures.ts` into `lib/ui-metadata.ts`. Update imports in 14 pages.
21. Add `<DisabledFeature reason="Stripe key not set">` wrapper for action buttons that depend on integrations the studio doesn't have wired.

### Batch E — Refresh cadence

22. Configure Netlify Scheduled Functions for `/api/glofox/sync` on a 60-minute cron (no Inngest required). Document in `netlify.toml`. **OR** acquire Inngest production keys and wire the existing `lib/inngest/sync.ts` cron.
23. Add a "last synced at" badge to the dashboard header so staleness is visible.
24. Update `app/api/glofox/status/route.ts` (already exists) to surface in-DB freshness, expose to dashboard.

---

## Section F — Verification gates for each batch

| Batch | Verify with |
|---|---|
| A | `npm run build` + `node scripts/smoke.mjs` + manual sync run shows `MAX(updated_at) = NOW()` on bookings + waitlisted count > 0 if Glofox has any |
| B | Open analytics, members/[id], revenue/memberships in real session — all numbers either real or empty |
| C | Open command center, dunning, optimization, transactions, portal, content, settings, marketing/overview — no hardcoded literals visible |
| D | Grep `app/` for `delta: "+0"` / `delta: "+0%"` returns 0 hits; grep for `from "@/lib/fixtures"` shows only types and bypass-mode fallbacks |
| E | Trigger sync on cron schedule, verify `MAX(updated_at)` < 1h on every Glofox-backed table |

---

## Appendix — Live database snapshot (2026-05-08, post-manual-sync)

| Table | Rows | Last `updated_at` | Notes |
|---|---|---|---|
| profiles | 1247 | 2026-05-09 13:00 | seed migration just ran |
| members | 1221 | 2026-05-02 12:09 | sync wrote 1238 but only 1221 stuck (some upserts no-op) |
| programs | 21 | 2026-05-02 12:09 | |
| trainers | 7 | 2026-05-02 00:46 | |
| class_instances | 1077 | **2026-04-28 12:12** | sync ran at 13:11 today, no rows updated → field-name bug |
| bookings | **2574** | **2026-04-28 12:14** | sync ran today, no rows updated → field-name bug |
| transactions | 646 | 2026-04-28 12:14 | likely working but not verified post-fix |
| leads | 1234 | 2026-05-02 12:10 | working |
| membership_plans | 10 | 2026-04-28 11:58 | hand-curated, low priority |

Native (non-Glofox) tables: see Section C — most are 0 rows.

---

## Next: Phase 2 (triage)

The remediation plan with explicit task ordering, file blueprints, and dependencies is in `specs/plans/qa-remediation-plan-2026-05-08.md` (see Phase 2 deliverable).
