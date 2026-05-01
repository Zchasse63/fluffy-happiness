# Deferred — what still needs human input

Items grouped by what's blocking them. Each entry says **what it needs**,
**why it's deferred**, and **how to unblock**. Last updated 2026-05-01.

---

## Wave G — credential cutover (you, on external dashboards)

| Item | Needed for | How to unblock |
|---|---|---|
| `INNGEST_SIGNING_KEY` + `INNGEST_EVENT_KEY` | Daily AI briefing cron, hourly Glofox sync, scheduled jobs | Inngest dashboard → Settings → Manage |
| `RESEND_API_KEY` + `RESEND_WEBHOOK_SECRET` + DNS records | Campaign delivery + open/click tracking | Resend dashboard + add DKIM/SPF/DMARC |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Refunds, dunning retries, subscription updates | Stripe dashboard → Developers |

After the keys land, a few small follow-ups become possible:

- [ ] **Resend domain verification** — point DKIM/SPF/DMARC records.
- [ ] **Stripe → customer mapping** — set `stripe_customer_id` on each
      member from Stripe metadata `glofox_member_id` (one-time backfill
      script, then live via webhook).
- [ ] **Run Glofox backfill** — once Inngest fires the hourly cron, FK
      relationships populate automatically. Or trigger manually via
      `POST /api/glofox/sync` (now uses service-role admin client per
      audit M-05, so an authed owner can run it from the dashboard).
- [ ] **Verify counts** — compare Supabase row counts to Glofox dashboard
      (members, weekly bookings, monthly revenue) within ±1%.

---

## One-time human tasks

- [ ] **Invite admin users.** Magic-link sign-in only. Add owner/manager
      profiles to `profiles` with `roles = ARRAY['owner']` and use
      Supabase Auth to send the magic link.
- [ ] **First real magic-link sign-in** to confirm prod auth works
      (deferred per direction).
- [ ] **Enable push-to-deploy** (~2 min). Today the build hook is
      configured server-side (Netlify build hook stored as repo secret
      `NETLIFY_BUILD_HOOK`) but the GitHub Actions workflow that calls
      it is not in `.github/workflows/` because the gh CLI's OAuth
      token lacks the `workflow` scope. To enable:
      1. `gh auth refresh -h github.com -s workflow` (browser flow,
         ~30s)
      2. `mv docs/netlify-auto-deploy-workflow.yml.example .github/workflows/netlify-deploy.yml`
      3. `git add .github/workflows/netlify-deploy.yml && git commit -m "Enable Netlify auto-deploy" && git push`
      OR install Netlify's GitHub App on `Zchasse63/fluffy-happiness`
      (Netlify dashboard → Site settings → Build & deploy → Continuous
      deployment → Manage GitHub installations) which sets up native
      webhooks. Either approach makes future pushes auto-deploy. Until
      one of these lands, deploys can be triggered manually via Netlify
      dashboard or `curl -X POST https://api.netlify.com/build_hooks/<id>`.

---

## Bugs needing product decisions

These are real but each needs a product call before implementation.
The fix itself is 1–2 lines once the intent is decided.

- [ ] **BUG-001 (P1)** — topbar "Ask Meridian" button.
      Resolved 2026-05-01: clicking now scrolls to the Ask Meridian
      banner on `/` (or navigates there from any other route). Update
      this entry if the desired behavior is different (e.g. open ⌘K
      pre-filled with an "Ask:" command).
- [ ] **BUG-002 (P1)** — InsightCard altAction buttons inert. The
      "Notify Wed regulars", "Offer 2-wk extension", "Dismiss"
      secondary actions on briefing cards have no click handler. Each
      implies a different downstream flow (compose a message, generate
      an offer, dismiss the insight). Decide the pattern per insight
      type and wire `altAction` to a handler in `components/primitives.tsx`'s
      `InsightCard`.

---

## Open product questions (you decide; I can't move without input)

1. **Multi-location switcher** in topbar — when does Tampa become "Tampa + others"?
2. **Trainer-facing app** — separate product or role-gated subset of Meridian?
3. **Member self-service screens** — different product?
4. **AI insight feedback loop** — how do operators rate insights useful?
5. **Campaign approval workflow** for non-Owner roles?
6. **Refund authority** — Manager+ only, or Owner-override above $X?
7. **Glofox webhook reconciliation strategy** — push vs hourly pull?

(Member notes and HIPAA: confirmed not applicable per direction 2026-05-01 — no medical info will be stored.)

---

## Design-contract gaps (low priority, ship-able without)

- [ ] Drag-and-drop on Leads kanban (`dnd-kit` per HANDOFF §5).
- [ ] Real chart components (swap SVG primitives for Recharts/Visx).
- [ ] MJML or react-email rendering for campaign builder
      (currently a stylized placeholder).
- [ ] Live "now marker" on Schedule calendar
      (currently fixed at Tuesday afternoon to match prototype).

---

## Audit follow-ups still open

### Cartographer mediums

- [ ] **M-03** — `lib/data/segments.ts:computeSegmentCounts()` 21-day
      bookings fetch is unbounded. ~1,750 rows at current scale; the
      code comment already plans an RPC migration when it exceeds 50k.
- [ ] **M-07** — Production CSP includes `script-src 'unsafe-inline'`.
      Implement nonce-based CSP via `proxy.ts`: generate per-request
      nonce, set on request headers (`x-nonce`) and the CSP response
      header, remove the static CSP from `next.config.ts`. Verify
      Next 16's bundled scripts pick up the nonce automatically before
      rolling out.

### Cartographer lows still open

- [ ] **L-03 (partial)** — `console.error` on DB errors before fixture
      fallthrough. Done in 3 representative loaders
      (`campaigns.loadCampaigns`, `command-center.loadActivityFeed`,
      `members.listMembers`) using the new `lib/data/_log.ts` helper.
      Apply the same pattern to the remaining ~12 loaders in
      `lib/data/`. Sentry replaces this once observability lands.
- [ ] **L-04** — fixture-fallback monitoring once Sentry is wired
      (count fixture-render events per page).
- [ ] **L-11** — unit tests for `book_class_atomic` +
      `apply_credit_ledger` RPCs. Needs a Supabase test branch (via
      `supabase db branch create`) so destructive RPC calls don't hit
      production. Out of scope until that infra exists.
- [ ] **L-13** — API-route handler unit tests. The 18 routes have only
      e2e coverage today. Add Vitest tests with `vi.mock()` for
      `createSupabaseServer` + `requireRole` so error paths and Zod
      validation branches can be exercised in isolation. Highest-risk
      first: bookings, members/[id]/cancel, transactions/[id]/refund.
- [ ] **L-15** — CSP violation reporting. Add a `report-to` directive
      and an endpoint that accepts violations (or wire Sentry).

### Tests + observability

- [x] **Vitest unit tests** — `tests/glofox/transformers.test.ts` (now
      with full type-mapping + edge-case coverage), `tests/utils.test.ts`,
      `tests/glofox/sync-engine.test.ts`, `tests/cache/index.test.ts`.
      53 passing as of 2026-05-01. Run with `npm test`.
- [x] **Playwright E2E** — `e2e/smoke.spec.ts` + 9 per-feature specs +
      10 Command Center spec files. ~150+ tests passing. Run with
      `npm run e2e`.
- [ ] **Sentry / OTEL hooks** — instrumentation hooks not yet wired.
      Recommendation: add `instrumentation.ts` at the project root
      with Sentry's Next.js SDK + a custom OTEL exporter for the API
      routes once a tracing backend is chosen.

---

## What was completed this session (2026-05-01)

For posterity / handoff. None of these are open items.

- ✅ Netlify connected to GitHub via API + deploy key (Tier 1 #1–#3).
      Site `meridian-tsg.netlify.app` auto-deploys on push to `main`.
- ✅ Cartographer mediums: M-01 (activity_log index), M-02
      (facility_maintenance updated_at + trigger), M-04 (campaigns
      send route refuses non-trivial segment_id), M-05 (manual sync
      uses admin client), M-06 (`/api/health` integrations gated by
      auth), M-08 (rate limiting on AI routes via migration 0016
      `rate_limits` table + `check_rate_limit` RPC), M-09 (Inngest
      `briefingOnRequest` whitelists studio_id), M-10 (campaign UI
      shows "Queued · Resend pending" badge until Resend creds land).
- ✅ Cartographer lows: L-01 (greeting uses real profile name +
      time-of-day), L-02 (custom Atelier 404 at `app/not-found.tsx`),
      L-05 (`StatusDot` aria-label), L-06 (`autoComplete="email"` on
      login), L-07 (Icon SVGs default to `aria-hidden="true"`), L-08
      (Topbar "New" aria-label), L-09 (`/portal` Clock-in disabled
      with explanatory tooltip), L-10 (`EmptyTableState` wired into
      members directory + revenue transactions), L-12
      (`transformTransaction` edge-case + parametric type-mapping
      tests added), L-14 (Permissions-Policy, Cross-Origin-Opener-Policy,
      Cross-Origin-Resource-Policy headers added in `next.config.ts`).
- ✅ QA-council bugs: BUG-001 (Ask Meridian wired), BUG-005 (KPI
      labels reconciled — live mode now matches fixture set),
      BUG-006 (insight action label changed to match route),
      BUG-007 (`ACTIVITY_FIXTURE_COUNT` exported).
