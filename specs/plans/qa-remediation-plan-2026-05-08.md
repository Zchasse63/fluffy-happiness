# QA Remediation Plan — 2026-05-08

**Phase:** 2 of 4 (Triage / planning)
**Inputs:** `specs/audits/qa-discovery-2026-05-08.md`
**Sequencing:** Batch A → Batch B → Batch C → Batch D → Batch E (each must verify before next starts)

---

## Cross-cutting principles for every batch

- **Pipeline:** `architect → implement → review → simplify → verify` per CLAUDE.md.
- **Single-tenant**: STUDIO_ID = `'11111111-1111-1111-1111-111111111111'`. RLS enforces; routes also `requireRole`.
- **Server-only writes use service-role admin client** (`lib/supabase/admin.ts`). Server reads use `createSupabaseServer()`.
- **Validate at boundaries** with Zod on API bodies. Trust internal code past that.
- **No `console.log` in committed code.** Use `logQueryError` for query errors.
- **Atelier design contract is locked.** Don't change palette / typography / radii / shadows.
- **Comments explain *why* only.** The code shows *what*.
- **Background processes ≤ 2 concurrent.** Prefer foreground for one-shots.
- **Migration slot:** next available is `0022`. Increment per migration written.
- **fixtureFallback discipline:** any new fallback path must use `fixtureFallback(FIXTURE, [])` from `lib/data/_log.ts` so live-mode returns `[]`.

---

## Batch A — Sync engine field-name + status-enum fixes

**Why first:** every page that reads bookings or class_instances depends on this. Currently the sync silently drops 100% of bookings. Without this fix, "live data" everywhere is just frozen pre-2026-04-28 data.

**Files to modify:**

### `lib/glofox/types.ts`

Update `GlofoxBooking` type to match wire format:

- `event_id` (was `class_id`)
- `created` string format `"YYYY-MM-DD HH:mm:ss"` (was `created_at`)
- `canceled_at` American spelling (was `cancelled_at`)
- `status` plain string, normalized in mapper
- new optional fields: `is_from_waiting_list`, `attended`, `paid`, `payment_method`

Update `GlofoxClass` type:

- `time_start: number` unix seconds (was `starts_at: string` ISO)
- `duration: number` minutes (no field existed before — used to compute `ends_at`)
- `size: number` (was `capacity`)
- `booked: number` (was `booked_count`)
- new optional `waiting?: number` for realtime waitlist count
- `trainers: string[]` (Glofox returns array; first is primary)

### `lib/glofox/transformers.ts`

Rewrite `transformBooking`:

- Read `b.event_id` for class FK source.
- Map `b.canceled_at` (American) into `cancelled_at` (project schema retains British spelling for now — could flip in a follow-up migration but out of scope here).
- Map `b.created` via new `parseGlofoxDate()` helper.
- Status via case-insensitive `mapBookingStatus()`.

Rewrite `transformClassInstance`:

- Compute `starts_at = new Date(c.time_start * 1000).toISOString()`.
- Compute `ends_at = new Date((c.time_start + (c.duration ?? 60) * 60) * 1000).toISOString()`.
- Map `c.size → capacity`, `c.booked → booked_count`.
- Carry `c.waiting ?? 0` as `waiting_count` (new column — see migration below).
- Status via `normalizeClassStatus()` accepting Glofox enums (`BOOKING_WINDOW_PASSED`, `BOOKING_OPEN`, `IN_PROGRESS`, etc.).

Rewrite status mappers — case-insensitive, complete enum:

- `mapBookingStatus`: `CHECKED_IN/ATTENDED → checked_in`, `CANCELED/CANCELLED → cancelled`, `NO_SHOW → no_show`, `WAITLIST/ON_WAITLIST/WAITING → waitlisted`, `BOOKED/default → booked`.
- `normalizeClassStatus`: `CANCELED/CANCELLED → cancelled`, `COMPLETED → completed`, `LIVE/IN_PROGRESS → live`, `SCHEDULED/BOOKING_OPEN/BOOKING_WINDOW_PASSED/BOOKING_WINDOW_NOT_OPEN/default → scheduled`.

New helper `parseGlofoxDate(raw)`:

- Try native `Date` parse first (in case it's already ISO).
- Fall back to regex `/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/` and append `Z` for UTC.
- Return null on unparseable input rather than throwing.

### `lib/glofox/sync-engine.ts`

- Class instances pre-upsert filter at line 245 stays — but now actually populates rows.
- Booking FK resolution at line 286 stays — `event_id` will now resolve.
- Add `waiting_count` to the class_instances upsert column list.

### Migration — `supabase/migrations/0022_class_waiting_count.sql`

Add `waiting_count INTEGER NOT NULL DEFAULT 0` to `class_instances`. Comment explains it's the realtime waitlist count from Glofox `events.waiting`.

### Tests — `tests/glofox/transformers.test.ts`

Add test cases covering each enum value + the date string parsing. Use real captured Glofox response shapes (capture during this batch using `scripts/debug-glofox-bookings.mjs` which already exists).

### Verify Batch A

1. `npm run build` passes.
2. Re-run the sync via the existing `/api/glofox/sync` route with the cron bearer header.
3. SQL check via Supabase MCP:
   - `SELECT MAX(updated_at) FROM bookings` should be within 5 minutes of NOW().
   - `SELECT COUNT(*) FROM bookings b JOIN class_instances c ON b.class_instance_id=c.id WHERE c.starts_at > NOW()` should be > 0.
   - `SELECT COUNT(*) FROM bookings WHERE status='waitlisted'` populates if Glofox has any current waitlist activity.
4. `npm run test -- transformers` passes.

---

## Batch B — P0 page fixes

**Files to modify:**

### `app/analytics/page.tsx` + new loaders

- Replace `COHORT_RETENTION` with `loadCohortRetention(weeks=12)` — needs `lib/data/analytics.ts` (new file).
- Replace `INSIGHTS` static array with `loadAnalyticsInsights()` derived from real KPIs (or remove the IDA cards entirely if no real source).
- Replace member health donut + breakdown with `loadEngagementHealthBreakdown()` — call `inferEngagement()` for each active member, count by badge.

New file `lib/data/analytics.ts` containing:

- `loadCohortRetention(weeks=12)` — group members by signup week, count active each subsequent week.
- `loadEngagementHealthBreakdown()` — run `inferEngagement` on each active member, return distribution by 7 badges.

### `app/revenue/memberships/page.tsx`

- Remove the pricing simulator panel (lines 196-222) and replace with empty state explaining Glofox doesn't expose pricing changes via API.
- Remove the trainer promo codes table (lines 281-285) and replace with empty state with same rationale.
- Both reference `DEFERRED.md` for restoration.

### `app/members/[id]/page.tsx`

- Inline `loadMember` (lines ~30-65) needs to:
  - Call `inferEngagement(row, recentCheckins, priorCheckins)` from `lib/data/members.ts`. Extract `inferEngagement` to be exported.
  - Pull `lastVisit` from latest `bookings.checked_in` for member.
  - Pull `joined` from `members.created_at`.
  - Pull `ltv` from `transactions.amount_cents` SUM where member_id matches.
- Remove `MEMBERS.find()` fallback unconditional — gate behind `inBypassMode()` or render the existing `notFound()`.

### Verify Batch B

- Open analytics: every chart and IDA card has a real source or shows an empty state.
- Open `/members/<real-uuid>`: engagement is one of 7 badges based on actual activity. Cancelled members show "Lapsed", trialing show "New", etc.
- Open revenue/memberships: simulator and promo codes gone, replaced with honest empty states.

---

## Batch C — P1 page fixes

### `app/page.tsx`

- Hero subtitle (lines 158-163, 191): build dynamically from `loadFocusQueue()` count + `loadRevenueSnapshot()` PoP delta. If empty, render generic copy ("Welcome back. {n} on staff today.").
- "next at 6 AM tomorrow" — derive from cron config or remove if cron isn't running.

### `app/revenue/dunning/page.tsx`

- `lib/data/revenue.ts:172-173` — replace synthetic `nextRetry` / `attempts` with real values from a `failed_payments` table OR render "—". The DB doesn't have a retry-tracking table today, so default is "—" with a comment that Stripe will populate this once the webhook lands.

### `app/schedule/optimization/page.tsx`

- `lib/data/schedule.ts:298-302` — heatmap should bucket all hours, not just 17-20.
- Suggested 4-bucket split: Morning (5-9) / Midday (10-14) / Evening (15-19) / Late (20-23).
- Update `SLOT_LABELS` in `app/schedule/optimization/page.tsx` to match: `["AM", "Mid", "Eve", "Late"]`.

### `app/revenue/transactions/page.tsx`

- Filter tabs lines 77-83: each becomes a `<Link href="?status=…">` with active-state styling derived from `searchParams.status`.
- Update `loadTransactions` to accept `{ status }` param and apply `.eq("status", status)` filter.

### `app/portal/page.tsx`

- Lines 168-170: remove hardcoded pay stubs. Add empty state: "No pay stubs available."

### `app/marketing/content/page.tsx`

- Lines 18-55: keep `FIXTURE_POSTS` but gate behind `inBypassMode()`.
- Lines 76-78: also gate.
- Lines 177-181 (suggested topics sidebar): replace with empty state OR derive from program names.

### `app/settings/page.tsx` + `lib/data/settings.ts`

- `lib/data/settings.ts:115-117`: notification status should mirror integrations pattern — read `INNGEST_SIGNING_KEY` and `RESEND_API_KEY` env presence and surface as honest copy.

### `app/marketing/overview/page.tsx`

- Lines 67-70: replace fake `+18 / +4.2 pts / +1.8 pts / +3` with calls to `loadPoPDelta()` from Batch D.

### Verify Batch C

- `node scripts/smoke.mjs` — all 27 routes 200.
- Open each modified page; confirm copy is honest (numbers real or empty-stated).

---

## Batch D — PoP delta helper + cosmetic cleanup

### New `lib/data/_pop.ts`

Single helper `loadPoPDelta({ table, aggregate, filter, periodDays })` returning `{ current, previous, delta, deltaPct, label }`. Aggregate options: `count` and `sum_cents`. Dispatches to Supabase with two range queries (current period and prior period of equal length).

### Wire across pages

Replace every hardcoded `delta: "+0"` / `delta: "+0%"` with a `await loadPoPDelta(...)` call. Affected pages:

- `app/page.tsx` (Command Center KPIs)
- `app/members/directory/page.tsx`
- `app/marketing/overview/page.tsx`
- `app/operations/payroll/page.tsx`
- `app/revenue/giftcards/page.tsx`
- `app/revenue/overview/page.tsx`
- `app/schedule/calendar/page.tsx`
- `app/analytics/page.tsx`

### New `lib/ui-metadata.ts`

Move out of `lib/fixtures.ts`:

- `KIND_META`, `ENGAGEMENT_TONE`, `TRANSACTION_KIND_META`, `MEMBER_PROFILE_TABS`, `SCHED_DAYS`, `SLOT_LABELS`, `SEGMENTS` (the metadata, not the data — counts come from RPC).
- Re-export from `lib/fixtures.ts` for one cycle of backwards-compat, then update imports across 14 pages.

### `<DisabledFeature>` wrapper

New `components/disabled-feature.tsx` with `reason` prop, applied to action buttons depending on integrations the studio doesn't have wired (Stripe refund, Resend campaign send, Inngest briefing trigger).

### Verify Batch D

- Grep `app/` for `delta: "\\+0"` returns nothing.
- Grep for `from "@/lib/fixtures"` shows only types and bypass-mode fallbacks.
- Stripe/Resend/Inngest action buttons render with disabled-state styling when keys are absent.

---

## Batch E — Refresh cadence

### Option 1: Netlify Scheduled Functions (preferred, no external deps)

Add `[[scheduled.functions]]` entry to `netlify.toml`:

- path = `/api/glofox/sync`
- schedule = `0 * * * *` (hourly)

The route already accepts `Authorization: Bearer ${CRON_SECRET}`. Netlify Scheduled Functions invoke serverless functions on a cron with the request signed by Netlify. Document in `netlify.toml` and `CLAUDE.md`.

`max_duration: 300s` is already configured for `api/glofox/sync` — within budget for the ~60s sync.

### Option 2: Inngest (existing scaffolding)

If user prefers Inngest, acquire production `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` and add to `.env.local` + Netlify env. The hourly cron in `lib/inngest/sync.ts:36-46` activates automatically.

### `app/api/glofox/status/route.ts` enhancements

Already exists. Surface in dashboard header:

- Last successful sync timestamp.
- Per-table freshness (max(updated_at) per Glofox-backed table).
- Render as a badge: green if all < 1h, yellow if 1-6h, red if > 6h.

### Verify Batch E

- Wait one hour after deploy. Re-query `MAX(updated_at)` on each Glofox-backed table — should advance.
- `app/api/glofox/status` returns timestamps reflecting reality.

---

## Open questions for the user (decisions blocking work)

These are flagged for human input but I will proceed with the stated default unless told otherwise:

1. **Pricing simulator on revenue/memberships** — remove entirely or stub with "coming soon"?
   *Default: remove the panel entirely; document as deferred.*
2. **Promo codes UI on revenue/memberships** — empty state or hide entirely?
   *Default: empty state with explanation that Glofox doesn't expose code creation via API.*
3. **Refresh cadence — Netlify scheduled functions or Inngest?**
   *Default: Netlify scheduled functions (no creds needed; immediate).*
4. **Empty native tables** (campaigns, automations, content, products, gift_cards, etc.) — seed manually for v1, or render empty states until owner CRUD is built?
   *Default: empty states. Seeding is a separate scope.*

---

## Summary of work

- **6 source files modified** for Batch A (sync engine fix)
- **~15 page/loader files modified** for Batches B+C
- **3 new files** for Batch D (`lib/data/_pop.ts`, `lib/ui-metadata.ts`, `components/disabled-feature.tsx`)
- **2 new migrations** (`0022_class_waiting_count.sql`, possibly more depending on schema needs)
- **1 config change** (`netlify.toml` for scheduled functions)
- **Estimate:** 8-12 commits, each batch as one commit minimum.

Phase 4 verification: full re-audit + before/after metrics in `specs/reports/qa-completion-2026-05-08.md`.
