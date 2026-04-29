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
