# Deferred — needs your attention before final cutover

Items that aren't blocking the autonomous build but require human intervention
to fully exercise. Each entry says **what it needs**, **why it's deferred**,
and **how to unblock**.

## External credentials

Already configured (verified via `/api/health`): `GLOFOX_API_KEY`,
`GLOFOX_API_TOKEN`, `GLOFOX_BRANCH_ID`, `GLOFOX_NAMESPACE`,
`ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`CRON_SECRET`, `EMAIL_UNSUBSCRIBE_SECRET`, `INNGEST_DEV` (local-only).

Still needed before production cutover:

| Item | Needed for | How to unblock | Priority |
|---|---|---|---|
| `INNGEST_SIGNING_KEY` + `INNGEST_EVENT_KEY` | Hourly sync, daily AI briefing cron, scheduled jobs (registered functions: `daily-briefing`, `briefing-on-request`, `hourly-glofox-sync`, `sync-on-request`) | Inngest Dashboard → Settings → Manage. Local dev: `npx inngest-cli@latest dev` — for local testing only the `INNGEST_DEV=1` env var is needed (already in `.env.local`). | **After Playwright phase** — same wave as Resend. Until set, scheduled work doesn't fire in deployed envs (the registration handler is healthy on its own). |
| `RESEND_API_KEY` + `RESEND_WEBHOOK_SECRET` | Campaign sends + delivery tracking | Resend Dashboard. Webhook is `/api/webhooks/resend`. | **After Playwright phase** — campaign send currently surfaces "Pending Resend integration"; recipients still persist to `campaign_recipients`. |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Refunds, subscription updates, dunning retries | Stripe Dashboard → Developers → API keys + Webhooks. Webhook endpoint is `/api/webhooks/stripe`. | **Deferred to post-testing phase.** |

## Local-dev caveat

`INNGEST_DEV=1` in `.env.local` disables signing-key verification on
`/api/inngest`, and the proxy whitelists `/api/inngest` so it isn't
cookie-gated. In dev that means anything that can curl `localhost:3000`
can invoke a registered Inngest function (briefing generation, Glofox
sync) without auth. Real prod creds are in `.env.local` for live data,
so a rogue script on localhost could burn API quota. Production has no
`INNGEST_DEV=1` and signing-key validation is active — this is a
local-dev-only consideration. Do not enable `INNGEST_DEV=1` in any
deployed environment.

## One-time setup tasks

- [ ] **Invite admin users** — magic-link sign-in only. Add owner/manager
      profiles to `profiles` with `roles = ARRAY['owner']` and use Supabase
      Auth to send the magic link.
- [ ] **Run Glofox backfill** — once creds are set, hit `/api/glofox/backfill`.
      Expect ~5 min for full historical import.
- [ ] **One-time sync-engine pass to populate new FK fields** (trainers /
      class_instances / etc., added in migrations 0011–0013). As of audit
      M-05 (2026-04-30), the manual `POST /api/glofox/sync` route now uses
      the service-role admin client — so an authed owner/manager can
      trigger this directly via the dashboard once the app is deployed.
      Until then, the Inngest hourly cron will populate FK rels naturally
      after Wave G activates.
- [ ] **Verify counts** — compare Supabase row counts to Glofox dashboard
      (members, weekly bookings, monthly revenue) within ±1%.
- [ ] **Stripe → Customer mapping** — set `stripe_customer_id` on each
      member from Stripe metadata `glofox_member_id`.
- [ ] **Resend domain verification** — point DKIM/SPF/DMARC records.
- [ ] **Generate Supabase types** — `npx supabase gen types typescript
      --project-id ptgeijftzfykjbiujvty > lib/supabase/database.types.ts`.

## Things the design contract requires that aren't shipped yet

- [ ] Drag-and-drop on Leads kanban (will use `dnd-kit` per HANDOFF §5).
- [ ] Real chart components (swap SVG primitives for Recharts/Visx) —
      design's "low priority" cleanup, fine to ship as-is.
- [ ] MJML or react-email rendering for campaign builder (currently a
      stylized placeholder).
- [ ] Live "now marker" on Schedule calendar (currently fixed at
      Tuesday afternoon to match prototype).

## Tests + observability

- [x] **Vitest unit tests** — `tests/glofox/transformers.test.ts` +
      `tests/utils.test.ts` (20 specs). Run with `npm test`.
- [x] **Playwright E2E smoke** — `e2e/smoke.spec.ts` covers all routes
      via `TEST_AUTH_BYPASS=1`. Run with `npm run e2e`.
- [ ] **Sentry / OTEL hooks** — instrumentation hooks not yet wired.
      Recommendation: add `instrumentation.ts` at the project root
      with Sentry's Next.js SDK + a custom OTEL exporter for the API
      routes once a tracing backend is chosen.

## Audit follow-ups (cartographer 2026-04-30)

Production-readiness scored 78/100, zero critical/high. Items M-01, M-02,
M-05 fixed in migration 0015 + the manual sync route. Remaining mediums:

- [ ] **M-03** — `lib/data/segments.ts:computeSegmentCounts()` 21-day
      bookings fetch is unbounded. ~1,750 rows at current scale; the code
      comment already plans an RPC migration when it exceeds 50k.
- [ ] **M-04** — `campaigns.segment_id` is a `TEXT` column with no FK and
      the send route ignores it (sends to all active members). Wire up
      segment resolution OR add explicit UI copy clarifying current
      behavior.
- [ ] **M-06** — `/api/health` exposes 6 integration credential-presence
      flags to unauthenticated callers. Move flags behind `requireRole` or
      strip from the public response. Will need to update the settings
      page (which reads these) and `e2e/settings.spec.ts:62-69` in the
      same change.
- [ ] **M-07** — Production CSP includes `script-src 'unsafe-inline'`.
      Implement nonce-based CSP via Next 16 middleware. Verify Next 16
      pattern (Next 15 supports nonces in middleware; Next 16 may differ).
- [ ] **M-08** — No rate limiting on `/api/ai/ask` and
      `/api/ai/briefing?force=1`. Owner/manager can trigger unlimited
      Anthropic calls. Add a token-bucket using `kpi_cache` (or a new
      `rate_limits` table) — 10 ask/hour/user, 3 forced briefings/day/studio.
- [ ] **M-09** — `lib/inngest/briefing.ts:briefingOnRequest` accepts
      arbitrary `studioId` from the event payload and uses
      `createSupabaseAdmin()`. Add a `studioId` whitelist before the admin
      call (Wave G also sets `INNGEST_SIGNING_KEY` which prevents the
      function from being invoked anonymously).
- [ ] **M-10** — Campaign send queues recipients but doesn't deliver until
      Resend creds are set. Add an explicit "Queued — delivery pending
      email integration setup" badge on the campaign UI.

## Accessibility findings — RESOLVED 2026-04-30

- [x] Member profile page now uses `<h1>` for the member name; the e2e
      assertion at `e2e/members.spec.ts:99` is back to
      `getByRole("heading", { name: /alex park/i, level: 1 })`.
- [x] Facility cards now use `<h2>` for resource names; the e2e
      assertion at `e2e/operations.spec.ts:39` is back to
      `getByRole("heading", { level: 2 }).first()`.
- [x] **BUG-003** — sidebar nav expand/collapse buttons now expose
      `aria-expanded` and `aria-controls`.
- [x] **BUG-004** — sidebar ⌘K button now has `aria-label="Command palette (⌘K)"`.

## QA-council follow-ups (2026-04-30)

QA-council ran a deep 6-phase pass on the Command Center surface
(`specs/reports/command-center-report.md`). Wrote 80 new tests, 100%
passing. Surfaced 7 product-level findings; the two a11y ones are now
fixed (above). Remaining items below.

- [ ] **BUG-001** — topbar "Ask Meridian" button is inert. No click
      handler wired in `components/topbar.tsx:44-46`. Likely intended to
      either scroll to the Ask Meridian banner on the Command Center or
      open the command palette pre-filled with an "Ask" context. Needs
      product decision before implementation.
- [ ] **BUG-002** — InsightCard altAction buttons are inert. The "Notify
      Wed regulars" / "Offer 2-wk extension" secondary actions on briefing
      cards have no click handler. Each implies a different downstream
      flow (compose message, generate offer, etc.) — needs product
      decision per insight type.
- [ ] **BUG-005** — KPI strip uses different metric labels in fixture
      mode vs live mode. `lib/fixtures.ts:COMMAND_KPIS` exposes
      "Revenue · today / Bookings / Walk-ins / No-shows / Attendance rate";
      `loadRevenueSnapshot()` returns "Classes · 7d / Revenue · 7d /
      New members · 7d". Pick one canonical label set and reconcile.
- [ ] **BUG-006** — `lib/fixtures.ts:COMMAND_INSIGHTS[0].action` has
      label "Promote on Instagram" but href `/schedule/calendar`. Either
      change the label to match the route (e.g. "View class details") or
      change the href to a campaign-creation flow.
- [ ] **BUG-007** — not really a bug; `e2e/command-center/cc-activity.spec.ts`
      uses `count().toBeGreaterThanOrEqual(4)` to be resilient to fixture
      changes. Refactor: export `ACTIVITY.length` from `lib/fixtures.ts`
      so tests can pin to it without coupling to the fixture array shape.

## Open product questions (from HANDOFF §6)

These need a product decision before they affect implementation:

1. Multi-location switcher in topbar — when does Tampa become "Tampa + others"?
2. Trainer-facing app — separate or role-gated subset of Meridian?
3. Member self-service screens — different product?
4. AI insight feedback loop — how do operators rate insights useful?
5. Campaign approval workflow for non-Owner roles?
6. Refund authority — Manager+ only or Owner-override above $X?
7. Member notes containing medical info — HIPAA stance?
8. Glofox webhook reconciliation strategy?
