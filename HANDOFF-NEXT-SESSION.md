# Meridian — fresh session kickoff prompt

> **Wave F closed (2026-04-29 follow-up session).** Playwright is now
> 71/71 green. The "implausibly low pass count" was two environment
> issues (worktree missing `.env.local`, Chromium binary not installed)
> plus 5 real bugs: a Postgres RLS-helper recursion (fixed via migration
> `0014_rls_helpers_security_definer` — `SECURITY DEFINER` on
> `current_studio_id` / `current_user_roles` / `is_admin`), `authErrorResponse`
> missing a `ZodError → 400` branch, the briefing test using GET against a
> POST-only route, plus 5 spec-level selector / dialog-handler / page-shape
> mismatches. Vitest 37/37, build clean, smoke 27/27. **Wave G (credential
> cutover) is the next gate — pause for human approval before starting it.**

Copy the block below into a new Claude Code session in the
`~/Code/meridian-fresh` directory.

> **Important — directory migration (2026-04-29):** The project lived at
> `/Users/zach/Desktop/TSG Fresh/meridian` until the iCloud "Optimize Mac
> Storage" feature evicted ~21% of `.git/objects/*` to iCloud and the local
> file-provider daemon (`bird`) wedged. `git push` deadlocked indefinitely
> on `pack-objects`. Recovery: fresh clone of origin/main into
> `~/Code/meridian-fresh` (non-iCloud), squash-commit of the working tree
> as `dcc5928`, push. The Desktop directory has been deleted. **Do not
> ever put this project under `~/Desktop` or `~/Documents` — those are
> iCloud-synced and Will Bite Again.**

I'm continuing the Meridian project (operator dashboard for The Sauna Guys, Tampa)
at `~/Code/meridian-fresh`. Run `git log --oneline -10` to see the latest history;
origin/main was caught up at the start of this followup session, and the Wave F
closeout commit ships migration 0014 plus the spec/auth fixes described above.

**Wave F status (closed 2026-04-29 followup):**
- ✅ 10 e2e spec files in `e2e/`: auth / command-center / members / revenue /
  schedule / marketing / operations / settings / api-health / smoke. **71/71
  passing** after the followup session's fixes.
- ✅ 4 vitest files (`tests/{glofox/transformers,glofox/sync-engine,cache/index,utils}.test.ts`).
  **37/37 passing.** No `.coveragePathIgnorePatterns` shenanigans — all four files run.
- ✅ Migration 0014 (`SECURITY DEFINER` on the three RLS helper functions)
  applied to live Supabase project `ptgeijftzfykjbiujvty`. This unblocks
  every API route that hit the `class_instances` / `transactions` /
  `profiles` recursion path under TEST_AUTH_BYPASS.
- ✅ `lib/auth.ts:authErrorResponse` now maps `z.ZodError → 400` instead of
  letting the throw bubble to a 500.
- ⚠ **Worktree gotcha discovered:** `git worktree add` does NOT inherit
  untracked files like `.env.local` or the Playwright Chromium cache.
  Symptom: every Supabase page 500s, then ~66 specs cascade-fail at
  `chrome-headless-shell` launch. Fix:
  `ln -s ~/Code/meridian-fresh/.env.local <worktree>/.env.local && npm run e2e:install`.
  This is the **real** explanation for the prior session's "5 passed"
  mystery — not a flaky run, two missing local artifacts.

Hard rule still in effect: **NO WRITES TO GLOFOX, EVER.** Details below.

## Read these first, in order

1. `CLAUDE.md` — project conventions, design contract, gotchas. The
   phase status table is now R0 + R1 + R2 + R3 + R3.5 (tests/infra) all ✅;
   only R4 (cutover) waits on creds.
2. `DEFERRED.md` — credential state. Anthropic + Glofox + Supabase
   service role + CRON_SECRET + EMAIL_UNSUBSCRIBE_SECRET are configured.
   Inngest + Resend are scheduled for **after the Playwright phase**. Stripe
   is fully deferred until post-testing.
3. `RELEASE-NOTES.md` — full writeup of what shipped in items 8–32,
   with the 3 schema migrations (0011–0013) summarized.
4. `.audit/AUDIT-SUMMARY.md` — original baseline audit; 4/4 critical
   and 9/10 high findings closed by the prior session's commits.
5. `git log --oneline -30` — see the recent commit history. (Origin/main was
   caught up at the start of the 2026-04-29 followup session; the Wave F
   closeout commit ships migration 0014 + spec/auth fixes.)

## Hard rules (carried forward + new)

- **NO WRITES TO GLOFOX. NON-NEGOTIABLE.** Glofox is the studio's live
  source-of-truth booking system. Tests, scripts, and any code path that
  would POST/PUT/DELETE to Glofox must be removed or guarded. Read-only
  Glofox calls are fine. When we do enable writes in the future, it will be
  against a separate Glofox test branch with a test user — not now.
- **Test against real APIs where it makes sense and is technically feasible.**
  That means real Anthropic calls (sandbox-equivalent — Sonnet/Opus calls
  are stateless), real Supabase reads against the live project
  `ptgeijftzfykjbiujvty`, and real Glofox **reads only**. Mock only what is
  unsafe, paid-per-call beyond budget, or destructive.
- **No shortcuts.** Every change goes through the pipeline: architect (when
  >3 files / schema) → implement → `feature-dev:code-reviewer` → `simplify`
  skill → tsc + Vitest + Playwright DOM verify → commit.
- **Use `code-simplifier:code-simplifier`** on existing pages with
  inline-blob legacy from Claude Design before adding new logic.
- **Every page change gets a Playwright DOM snapshot** verifying it renders.
  Playwright is configured with `TEST_AUTH_BYPASS=1` for the dev server so
  every authed route loads without a real magic-link sign-in. The bypass
  has a hard runtime guard against `NODE_ENV=production`.
- **Run a final full-project audit** via `codebase-cartographer:audit` after
  the testing wave; expect multiple passes (audit → fix → re-audit).
- **Use `/Library/Developer/CommandLineTools/usr/bin/git` directly** —
  `/usr/bin/git` is a shim that resolves to the user's Xcode-bundled git in
  `~/Downloads/Xcode.app`, which fights the IDE's `git status` monitor.
  The CLT path bypasses that contention.
- **Commit via plumbing** when the IDE is holding `index.lock`:
  `write-tree` + `commit-tree` + `update-ref` retry loop. Pattern is in
  shipped commits — see commit `1b4486a` body or grep
  `update-ref refs/heads/main` in this session's bash history.

## Dev server (already configured to work)

```bash
cd ~/Code/meridian-fresh
npm run dev   # auto-strips parent-shell ANTHROPIC_API_KEY="" via env -u
```

Check with `curl http://localhost:3000/api/health` — should return
`anthropic: true, supabase: true, glofox: true`. Inngest will read `false`
until production keys land (item below). If port 3000 is busy, an old dev
server may still be running (`lsof -iTCP:3000 -sTCP:LISTEN`).

If you ever see the symptom "next dev says ✓ Ready but every request hangs
forever," that's the corrupted-`node_modules` failure mode. Fix:
`rm -rf node_modules package-lock.json && npm install`.

## Where the project stands right now

| Layer | State |
|---|---|
| **Schema** | 32 tables across 13 migrations. All RLS by `studio_id`. Latest two migrations (0012 corporate_accounts, 0013 facilities + waivers + retail + giftcards) applied and types regenerated. |
| **Glofox sync** | `lib/glofox/sync-engine.ts` persists every entity type — staff + trainers, members, programs, class_instances, bookings, transactions, leads. FK resolution via lookup maps. Hourly Inngest cron is registered but won't fire until Inngest signing keys land. |
| **Live data** | Per the original audit, 1,234 profiles, 530 active members, 1,077 classes, 2,574 bookings already imported by `scripts/glofox-backfill.mjs` in a prior session. The new sync wiring (trainers + class_instances FK) needs to be re-run once to populate the new fk relationships. |
| **AI** | Daily 6 AM ET briefing cron + Ask Meridian + schedule-optimization recommendations. All cached via `ai_cache` (22 h TTL). |
| **Pages** | All 27 routes live: every previously-stub page now reads live data from Supabase with fixture fallback when empty. |
| **Tests** | 20 Vitest unit tests on transformers + utils. Playwright config + 24 smoke specs. Both pass. |
| **CI** | `.github/workflows/ci.yml` runs build + typecheck + tests on every PR; Playwright on `main`. |
| **Netlify** | Site `meridian-tsg.netlify.app` created (id `1e0b792c-4967-4088-a6cb-83b9523cc2e4`). 11 production env vars seeded via API (Supabase + Glofox + Anthropic + secrets). Awaits initial deploy after the push lands. |

## Remaining work, in order

### Wave E — push + production deploy

1. **Push to `origin/main`.** ~~26 commits sit local-only.~~ Status as of the
   2026-04-29 followup: origin/main is caught up; Wave F closeout adds one
   commit to push. Remote: `https://github.com/Zchasse63/fluffy-happiness.git`.
   After push, Netlify should be connected to the repo for continuous deploys.
2. **Connect the Netlify site to the GitHub repo.** Use the Netlify API
   (`POST /api/v1/sites/{site_id}` with `repo` config) or the dashboard:
   site_id `1e0b792c-4967-4088-a6cb-83b9523cc2e4` (account slug `zchasse63`).
   Netlify token is in the user's possession; ask if you need it again.
3. **Verify production build on Netlify.** Watch the deploy log; confirm the
   `@netlify/plugin-nextjs` plugin handles the App Router. The `netlify.toml`
   already has per-route function timeouts.
4. **Smoke the prod URL** — `curl https://meridian-tsg.netlify.app/api/health`
   should mirror local. Login flow may need a magic-link test via real
   Supabase Auth.

### Wave F — full test suite (the main body of work this session)

The user's directive verbatim:
> *"I want to make sure that we're using the proper plugin for building that.
> Are we able to use the Playwright MCP and DOM to build out the testing?
> Meaning, using the DOM to basically show the correct paths and everything
> to then create testing for? Does that make sense?"*

**Yes.** The approach is:

1. **Use the Playwright MCP** (`mcp__plugin_playwright_playwright__*` tools)
   to navigate every page in the running dev server with `TEST_AUTH_BYPASS=1`.
2. **Capture `browser_snapshot`** (the accessibility-tree DOM) at each page.
   That snapshot becomes the source of truth for selectors and structure.
3. **Translate selectors into Playwright `expect(page.getByRole(…))` /
   `getByText(…)` assertions** in `e2e/*.spec.ts`. The DOM snapshot tells
   you the exact accessible names, so tests don't break on visual nits.
4. **Coverage targets** (one spec file per area):
   - `e2e/auth.spec.ts` — login form renders, magic-link callback path
     (mock the Supabase callback), unauthorized email bounces.
   - `e2e/command-center.spec.ts` — KPI strip values, briefing card,
     activity feed, weekly review, focus queue.
   - `e2e/members.spec.ts` — directory loads, search updates URL, profile
     drill-down opens, engagement badges render the right tone.
   - `e2e/revenue.spec.ts` — overview period tabs (7d/30d/90d/365d) all
     render, transactions list, refund button confirm flow (mock the
     `/api/transactions/[id]/refund` POST).
   - `e2e/schedule.spec.ts` — calendar week renders, optimization page
     shows the heatmap + AI recommendations.
   - `e2e/marketing.spec.ts` — campaigns list, new-campaign modal opens,
     send button surfaces the "pending Resend" message.
   - `e2e/operations.spec.ts` — payroll computes, facilities + waivers
     render, portal shows the logged-in trainer's schedule.
   - `e2e/settings.spec.ts` — settings page reads live values; booking-rules
     edit modal saves and reflects changes.
   - `e2e/api-health.spec.ts` — every API route returns the right shape;
     Zod validation rejects bad bodies.

5. **Real-API discipline:**
   - **Anthropic:** real calls. The schedule-recommendations + briefing
     paths are cached via `ai_cache` (22h), so a single call seeds the
     cache and subsequent test runs hit the cache. Cap test budget by
     using the cache and avoiding `?force=1`.
   - **Supabase:** real reads against project `ptgeijftzfykjbiujvty`. The
     test bypass uses anon key, so RLS-gated queries return empty and the
     fixture fallback kicks in — that's expected and fine for E2E. For
     specs that need real data, use the service-role admin client in a
     test setup (`tests/setup/seed.ts`) that seeds known fixtures.
   - **Glofox: READS ONLY.** Wrap any test that hits Glofox in a fail-fast
     guard:
     ```ts
     if (process.env.ALLOW_GLOFOX_WRITES === '1') {
       throw new Error('Refusing to write to Glofox in tests');
     }
     ```
     The `GlofoxClient` itself does not currently expose write methods —
     it has `members()`, `staff()`, `programs()`, `classes()`, `bookings()`,
     `transactions()`, `leads()`, `credits()` — all GETs/POST-search.
     **Before writing tests, audit every method for HTTP method and assert
     none are POST/PUT/DELETE.**
   - **Stripe + Resend + Inngest production endpoints:** mock entirely.
     The route handlers should accept either real or mocked payloads; tests
     should construct fake webhook bodies and verify the activity_log row
     gets written.

6. **Write the Vitest layer too:**
   - `tests/data/*.test.ts` — pure functions in `lib/data/*.ts` (the ones
     that don't touch Supabase) get unit tests.
   - `tests/cache/index.test.ts` — `withKpiCache` round-trip, TTL expiry.
   - `tests/glofox/sync-engine.test.ts` — mock the Supabase client,
     verify the upsert payloads for each stage match the transformer
     output and the FK resolution behaves correctly.

7. **CI integration:** the workflow at `.github/workflows/ci.yml` already
   runs Vitest on every PR and Playwright on `main`. Once the test suite
   grows, ensure the Playwright job uploads the HTML report for failing
   runs (already configured).

### Wave G — credential cutover (after Wave F)

8. **Inngest production keys.**
   - Visit https://app.inngest.com → sign in → "Sync new app" → enter the
     production URL `https://meridian-tsg.netlify.app/api/inngest`.
   - Copy `INNGEST_EVENT_KEY` from the Event Keys tab and
     `INNGEST_SIGNING_KEY` from the Signing Keys tab.
   - Add both to `.env.local` (replacing or alongside `INNGEST_DEV=1`,
     which is local-only) and to Netlify via the API.
   - Verify the registration handshake succeeds (Inngest dashboard shows
     `daily-briefing`, `briefing-on-request`, `hourly-glofox-sync`,
     `sync-on-request` as registered functions).
   - Trigger the hourly cron once manually to confirm Glofox sync runs in
     the deployed environment (still **read-only** to Glofox).

9. **Resend production keys + domain verification.**
   - Resend Dashboard → API Keys → create a fresh key →
     `RESEND_API_KEY`.
   - Webhooks → add `https://meridian-tsg.netlify.app/api/webhooks/resend`
     → copy signing secret → `RESEND_WEBHOOK_SECRET`.
   - DNS: point DKIM/SPF/DMARC records as Resend instructs for the sender
     domain. The campaign send route (`/api/campaigns/[id]/send`) currently
     queues recipients to `campaign_recipients` and surfaces "pending
     Resend" — once keys land, swap the stub for a real Resend SDK call.

10. **Re-audit + fix-up.** Run
    `codebase-cartographer:audit-compare` against the baseline at
    `.audit/AUDIT-SUMMARY.md`. Expect 1–2 passes.

### Wave H — deferred forever (or until a product decision)

11. **Stripe.** Per direction: deferred to post-testing entirely. When it
    lands: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
    `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. The webhook handler is already
    written; the dunning + refund routes are stubs ready for the SDK.
12. **Sentry / OTEL.** Tracked in DEFERRED.md. Wire `instrumentation.ts`
    once a tracing backend is chosen.
13. **Open product questions** in DEFERRED.md (multi-location, HIPAA,
    refund authority, etc.). These need product decisions, not code.

## Credentials state right now

Already in `.env.local` (gitignored) and Netlify (production scope):

| Var | Where |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | both |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | both |
| `SUPABASE_SERVICE_ROLE_KEY` | both (secret) |
| `GLOFOX_API_KEY` | both (secret) |
| `GLOFOX_API_TOKEN` | both (secret) |
| `GLOFOX_BRANCH_ID` | both |
| `GLOFOX_NAMESPACE` | both |
| `ANTHROPIC_API_KEY` | both (secret) |
| `CRON_SECRET` | both (secret) — generated `openssl rand -base64 32` |
| `EMAIL_UNSUBSCRIBE_SECRET` | both (secret) — generated `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Netlify (= `https://meridian-tsg.netlify.app`) |
| `INNGEST_DEV=1` | local-only (never deploy this — production guard in `lib/auth.ts` would throw) |

Awaiting:

| Var | Priority | Source |
|---|---|---|
| `INNGEST_SIGNING_KEY` + `INNGEST_EVENT_KEY` | After Wave F | Inngest Dashboard |
| `RESEND_API_KEY` + `RESEND_WEBHOOK_SECRET` | After Wave F | Resend Dashboard |
| `STRIPE_*` | Post-testing | Stripe Dashboard |

## Glofox safety check (do this in your first 5 minutes)

Before writing a single test, verify the Glofox client has no write methods
that could fire by accident:

```bash
grep -nE "method[: ]+(POST|PUT|DELETE|PATCH)" lib/glofox/client.ts
```

The current methods that use POST are read-style endpoints (Glofox
quirks — `programs` and `transactions` are POST searches). Audit each one
to confirm it's a search/report query and not a mutation. Document the
audit in `tests/glofox/SAFETY.md` with the URL and HTTP method of every
client method, and have it referenced in CI so any future PR that adds a
write method has to update it. _As of the 2026-04-29 followup session,
SAFETY.md exists and its `grep` recipe was corrected to match the
positional `request("POST", path, ...)` shape rather than the old
`method: "POST"` config-object pattern; the audit covers all 10 methods._

## How to start

1. `cd ~/Code/meridian-fresh`
2. Read `CLAUDE.md`, `DEFERRED.md`, `RELEASE-NOTES.md` (in that order).
3. `git status` and `git log --oneline -10` — confirm you're on the right
   commit. (Post-followup, origin/main is current; check the doc's status
   header at the top for the latest landmark commit.)
4. Push to `origin/main`. The standard `git push origin main` works in
   the user's normal terminal environment.
5. `npm run dev` (or check if already running with `lsof -iTCP:3000`).
6. `curl http://localhost:3000/api/health` — verify
   `supabase: true, glofox: true, anthropic: true`.
7. **Audit the Glofox client for write methods (above). Commit the audit
   doc.**
8. Build a TodoWrite list seeded from Waves E + F + G above.
9. Start with Wave E item 1 (push) — once that's done and Netlify has
   auto-deployed once, move to Wave F (the test suite is the main body
   of this session).

Work autonomously through Waves E and F. Pause for approval before
Wave G (credential cutover) — that involves visiting external dashboards
and ideally the user clicks the buttons.
