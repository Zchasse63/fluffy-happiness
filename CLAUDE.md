# Meridian

Operator dashboard for **The Sauna Guys** (Tampa, FL). Single-tenant SaaS-style
internal tool — daily briefing, schedule, members, revenue, marketing.

## ⚠ This is NOT the Next.js you know

**Next.js 16 + React 19** — APIs, conventions, and file structure differ from
older training data. Read the relevant guide in `node_modules/next/dist/docs/`
before writing routing/auth/middleware code. Heed deprecation notices.

Specifically:
- **`proxy.ts` replaces `middleware.ts`** at the project root. Same matcher
  shape, different name.
- **`page.tsx` can be `async`** (server component) — that's how Command Center
  pulls live Supabase data. If a page does live DB reads, add
  `export const dynamic = "force-dynamic"` so Next doesn't try to prerender it.
- Tailwind CSS **v4** — design tokens are CSS custom properties in
  `app/globals.css`, not in `tailwind.config.js`.

## Stack

- **Next.js 16.2.4** App Router, **React 19.2.4**, **TypeScript 5**
- **Tailwind v4** for utilities; "Atelier" tokens in `app/globals.css`
- **Supabase** (PostgreSQL 17 + RLS + Auth + pgvector). `@supabase/ssr`.
  Magic-link auth only — no passwords.
- **Glofox API** is source of truth for members / classes / bookings /
  transactions. Native tables own marketing, AI, analytics.
- **Anthropic Claude** — `claude-sonnet-4-6` (briefing / default),
  `claude-opus-4-7` (Ask Meridian / reasoning). Prompt-cached system blocks.
- **Stripe** + **Resend** scaffolds wired but stubbed pending creds.

## Architecture

```
Browser ─► proxy.ts (refresh Supabase session)
        ─► app/(routes) — async server components, fixture fallback
        ─► app/api/* — Zod-validated, requireRole-gated
        ─► lib/supabase/{client,server,proxy} — three contexts
        ─► lib/glofox/* — REST client, transformers, sync engine
        ─► lib/ai/claude.ts — Anthropic SDK wrapper
        ─► Supabase (Postgres + RLS by studio_id)
        ─► Glofox (read source of truth) + Stripe + Resend (deferred)
```

Single-tenant `studio_id = '11111111-1111-1111-1111-111111111111'` everywhere.
RLS isolates by `studio_id`; API routes do `requireRole('owner','manager')`
defense-in-depth.

## Key Files & Entry Points

| Path | Purpose |
|---|---|
| `app/page.tsx` | Command Center — IDA insights + KPIs + focus queue |
| `app/layout.tsx` + `app/globals.css` | Atelier palette + AppShell wrapper |
| `proxy.ts` | Auth refresh on every navigation (Next 16 replacement for middleware) |
| `next.config.ts` | CSP, HSTS, X-Frame, Referrer-Policy |
| `lib/nav.ts` | NAV groups + PAGE_TITLES — single source of truth for sidebar |
| `lib/auth.ts` | `requireProfile`, `requireRole`, `AuthError`, `authErrorResponse` |
| `lib/data/command-center.ts` | Server-side loaders: revenue snapshot, today's schedule, focus queue |
| `lib/data/members.ts` | Members directory query w/ fixture fallback |
| `lib/glofox/client.ts` | REST client — verified against OpenAPI 2.2; 3-header auth; POST `/Analytics/report` for txns; 200+`success:false` quirk |
| `lib/glofox/transformers.ts` | Glofox shape → Meridian shape (txn unwrapping, etc.) |
| `lib/ai/claude.ts` | `generateBriefing`, `askMeridian` — prompt-cached |
| `components/primitives.tsx` | KpiStrip, InsightCard (IDA), Donut, LineChart, ChangeBadge, SectionHead, PageHero, ModuleStub |
| `supabase/migrations/0001…0008` | 28 tables, RLS, RPCs (`book_class_atomic`), indexes, hardened functions |
| `scripts/glofox-backfill.mjs` | Phase R2 historical pull → `/tmp/meridian-backfill/*.json` |
| `scripts/smoke.mjs` | Boots `next start`, hits 27 routes, expects no 5xx |
| `DEFERRED.md` | Things waiting on creds or human intervention |
| `AGENTS.md` | Next 16 warning (loaded into context via `@AGENTS.md`) |

## Patterns & Conventions

- **Server components by default.** Client only when state/effects required
  (`AppShell`, `Sidebar`, `Topbar`, `CommandPalette`, `LoginForm`).
- **Routing** via `<Link>` + `useRouter` — never manual `localStorage` route.
- **Three Supabase contexts**:
  - `lib/supabase/client` — browser, anon key
  - `lib/supabase/server` — RSC + route handlers, anon key + cookie
  - `lib/supabase/proxy` — proxy.ts only, refreshes session
  - **Service-role key never leaves the server.** Sync writes only.
- **Validate at boundaries** — Zod on every API body. Trust internal code past
  that. Don't add error handling for impossible cases.
- **GloFox treats every signup as a "lead"** — current paying members,
  ex-members, trial buyers, and one-and-done drop-in customers all show
  up in `/leads`. There's no GloFox field that flips a "lead" into a
  "member". Meridian unifies them into a single `people` view (migration
  0019) keyed on email and derives the actual category from behavior.
  Never filter the leads sync by status — most legitimate people have
  null status from GloFox; the sync engine defaults null to "new".
- **Membership ≠ credits.** Having a credit balance does NOT make
  someone an "active" customer. Active recurring requires
  `membership_status = 'active'` AND a recurring tier name (Monthly /
  Annual / Unlimited, excluding trial). Hundreds of customers hold
  unused legacy class-pack credits with no recent activity — those are
  in the `stale-credits` segment, not `active-recurring`.
- **GloFox membership_status values** — `prospect` / `active` / `paused`.
  No `cancelled`. To detect churn we synthesize: `paused` OR
  recurring-tier with no purchase in 60d. Real cancellation history
  needs a billing-event ingestion that GloFox doesn't expose.
- **GloFox credits are NOT synced today.** `transformMember` doesn't
  pull the per-user credit balance from GloFox's `/credits` endpoint.
  The `stale-credits` segment + Command Center liability KPI return 0
  until a credit-sync stage is added to `lib/glofox/sync-engine.ts`.
- **Every tenant table has `studio_id`.** RLS enforces; API routes also
  `requireRole`. Both — defense in depth.
- **Async-by-default for >1s work** — Inngest write-back queue for Glofox +
  Stripe side-effects (deferred until creds set).
- **Atomic booking** via `book_class_atomic` RPC (not app-side transaction).
- **No status='confirmed'** — eliminated in R3. Bookings are `pending` /
  `cancelled` / `checked_in` / `no_show`.
- **No `console.log` in committed code.** Server-side errors → `console.error`
  in `authErrorResponse` only.
- **Comments**: explain *why* only. The code shows *what*.

## Design contract (Atelier — locked per HANDOFF.md §3)

- Palette: warm-paper neutrals, terracotta `#C2410C`, deep teal `#0F766E`
- Typography: Instrument Serif (display), JetBrains Mono (eyebrows / metrics),
  Inter (UI body)
- Radii: 8 / 12 / 18 / 24
- Shadows: soft warm only — no hard drops, no neumorphism
- **IDA pattern** (Insight → Detail → Action) on every AI suggestion
- **Engagement badges**: 7 states — Power / Active / Engaged / Cooling /
  At risk / New / Lapsed

Don't drift from these without design review.

## Current State (Phase status)

| Phase | Status | Notes |
|---|---|---|
| **R0** Foundation | ✅ done | 32 tables (added 0012 corporate_accounts + 0013 facilities/waivers/products/giftcards), RLS, RPCs, indexes, single-tenant seed |
| **R1** API layer | ✅ done | Glofox client, transformers, sync engine extracted to `lib/glofox/sync-engine.ts`, auth, core routes, AI lib |
| **R2** Data backfill | ✅ done | Glofox sync wires every entity type — staff + trainers, members, programs, class_instances, bookings, transactions, leads — with FK resolution. Hourly Inngest cron runs incrementally. |
| **R3** Feature fixes | ✅ done | All 4 critical + 9/10 high audit findings closed. SearchBar URL-driven, AI briefing live, cache layer wired (5-min KPI / 22h briefing), 12 stub pages now backed by live data, 6 new schema tables for facilities/waivers/retail/giftcards/corporate. |
| **R3.5** Tests + infra | ✅ done | Vitest (20 unit tests on transformers + utils), Playwright E2E (24 specs, TEST_AUTH_BYPASS gated against prod), GitHub Actions CI, netlify.toml with per-route timeouts, bundle analyzer. |
| **R4** Cutover | ⏳ awaits creds | Stripe/Resend/Inngest/Sentry are scaffolded; just needs real keys. See `DEFERRED.md`. |

### Outstanding (low-priority, deferred)

- **Sentry / OTEL instrumentation** — needs a tracing-backend choice; tracked in `DEFERRED.md`.
- **Open product questions** in `DEFERRED.md` (multi-location, HIPAA stance, refund authority, etc.).
- **Wave G credentials** — Inngest signing/event keys, Resend API + webhook secret, Stripe.

(_Previously listed here:_ "segment N+1 → RPCs" and "plan-count N+1" — both
were already addressed in earlier waves. `lib/data/segments.ts` uses one
parallel batch of head-count queries plus in-memory aggregation; `lib/data/revenue.ts`
fetches active members once and bucket-counts in-memory. Verified 2026-04-29.)

## Development Notes

```bash
cp .env.local.example .env.local   # has Supabase URL + publishable key
npm install
npm run dev                        # http://localhost:3000

# QA gates — run after each meaningful change
npm run build                      # turbopack + tsc --noEmit
node scripts/smoke.mjs             # 27/27 routes, no 5xx
```

### Environment

Live creds set in `.env.local` (NOT committed):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`GLOFOX_API_KEY`, `GLOFOX_API_TOKEN`, `GLOFOX_BRANCH_ID`, `GLOFOX_NAMESPACE`,
`ANTHROPIC_API_KEY`.

Still needed (see `DEFERRED.md`):
`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*`, `RESEND_*`, `INNGEST_*`,
`CRON_SECRET`, `EMAIL_UNSUBSCRIBE_SECRET`.

### Supabase

Project ref: `ptgeijftzfykjbiujvty` (TSG Main). All migrations applied in prod.
Use the Supabase MCP (`mcp__eb733721-…`) for schema inspection / queries.

```bash
npx supabase link --project-ref ptgeijftzfykjbiujvty
npx supabase db push
npx supabase gen types typescript --project-id ptgeijftzfykjbiujvty \
  > lib/supabase/database.types.ts
```

### Glofox quirks (verified, not theoretical)

- **3 auth headers required**: `x-api-key`, `x-glofox-api-token`,
  `x-glofox-branch-id`. Missing any one → silent `200 + success:false`.
- **Rate limits**: live 10 req/sec; sandbox 3 req/sec; burst 1000/300s.
  `lib/glofox/client.ts` paces at 120ms between pages.
- **Transactions**: POST `/Analytics/report` with
  `model:"TransactionsList"` — unwraps via `TransactionsList.details[]`,
  not `data[]`. `start`/`end` are STRING unix-second timestamps.
- **Programs**: POST `/v3.0/locations/{branch}/search-programs` (not GET).
- **Pagination**: `page=1`-based, `limit=100`. Some endpoints return
  `has_more`, others require length-based detection.
- **Branch == location** for single-location studios (TSG is one location).

### Gotchas

- **NEVER put this project under `~/Desktop` or `~/Documents`.** Both are
  iCloud-synced by default. macOS's "Optimize Mac Storage" evicts inactive
  files (including `.git/objects/*`) to iCloud and marks them `dataless`.
  When `git pack-objects` walks history during a push, every dataless
  object blocks waiting on `bird`/`cloudd` to fault in the bytes — and
  the daemon wedges easily under churn from `.next` and `node_modules`.
  We migrated from `~/Desktop/TSG Fresh/meridian` to `~/Code/meridian-fresh`
  on 2026-04-29 after a multi-hour deadlock; the original 27-commit
  history was lost (squashed to `dcc5928`) when the dataless objects
  could not be recovered. **The repo lives at `~/Code/meridian-fresh`
  and must stay outside iCloud-synced paths.**
- **The `block-dangerous-git.py` hook** referenced in `~/.claude/hooks/` is
  missing. Hooks fail non-blocking but spam stderr. Safe to ignore but
  noisy.
- **Background tasks** — keep ≤ 2 concurrent. The previous session piled up
  8+ `Wait for…` jobs and the supervisor killed everything (exit 144,
  0-byte outputs). Prefer foreground for one-shots.
- **AGENTS.md** is loaded via `@AGENTS.md` in this CLAUDE.md scope and
  reiterates the Next 16 warning above — don't remove.
- **`ERR_INVALID_PACKAGE_CONFIG` from `node_modules/next/dist/compiled/*/package.json`**
  on `next dev` request handling means the install is corrupted (silent
  failure mode: Next "Ready", but every request hangs forever). Fix:
  `rm -rf node_modules package-lock.json && npm install`. After that, the
  package.json files in those bundled deps validate again.
- **Empty `ANTHROPIC_API_KEY` in parent shell** shadows `.env.local`. The
  Claude desktop env exports `ANTHROPIC_API_KEY=""` (empty) which Next
  inherits. `npm run dev / start` now strip those vars via `env -u …` in
  package.json scripts. If you spawn `next` directly, do the same.
- **Dev server bind**: Next 16 binds to `*` (IPv6 + IPv4-mapped). Curl
  `localhost` or `[::1]` works; `127.0.0.1` may refuse. Use `localhost`.

## Pipeline (ALWAYS RUN — no shortcuts on this project)

This is the contract for every change touching `app/`, `lib/`, `supabase/`, or
schema. Skipping a stage means we audit and fix bugs after the fact instead
of catching them at the boundary. **A working project at the end is worth
the slower middle.**

1. **Architect** — invoke `feature-dev:code-architect` agent, or use the
   `feature-dev:feature-dev` skill for guided multi-step work. Outputs a
   blueprint (files to touch, component design, data flow). Non-negotiable
   for: >3 files, schema changes, new API routes, new pages, new agents.
2. **Implement** — write the actual code following the blueprint. No
   speculative refactors, no surrounding cleanup.
3. **Review** — invoke `feature-dev:code-reviewer` agent on the diff. Fix
   any high-priority findings before moving on. For security-sensitive
   changes (auth, RLS, mutation routes, webhooks), additionally run
   `codebase-cartographer:security`.
4. **Verify** — `npm run build` + `node scripts/smoke.mjs` + (when relevant)
   exercise the affected page in the browser. Type-check passes is not the
   same as "it works."

For trivial changes (single-file, <10 lines, obvious fix — e.g. adding a
`force-dynamic` flag), abbreviate to **Implement + Verify**.

### Simplify pass — required for Claude Design output

Anything inherited from Claude Design was built **inline** — Claude Design
could only generate single-file blobs, not modular extractions. Long
inline page components, repeated style props, and copy-paste markup are
the norm in `app/`. Whenever you touch one of those pages for a real
change (not just a typo), follow up with the **`simplify` skill** on the
modified files:

- Hoist repeated JSX into components under `components/`.
- Move large fixture / config blocks out of page files into `lib/data/` or
  `lib/fixtures.ts`.
- Collapse duplicated style props into Tailwind / CSS classes.
- Preserve all behavior — `simplify` is refactor-only.

Run order: **architect → implement → review → simplify → verify**.
Skip simplify only when the change is purely additive in an already-modular
file (`lib/data/*.ts`, `lib/glofox/*.ts`, etc.).

Specialized agents/skills already wired:

| Need | Agent / Skill |
|---|---|
| Architecture design | `feature-dev:code-architect` |
| Guided multi-step feature dev | `feature-dev:feature-dev` skill |
| Code review on a diff | `feature-dev:code-reviewer` |
| Codebase exploration (3+ queries) | `Explore` or `feature-dev:code-explorer` |
| Multi-step planning | `Plan` |
| Complex debugging / RCA | `deep-reasoning` skill |
| Technical feasibility check | `scrutinize:scrutinize-technical` |
| Full plan scrutiny | `scrutinize:scrutinize` |
| Codebase audit | `codebase-cartographer:audit` |
| Security review | `codebase-cartographer:security` |
| Frontend / UI work | `frontend-design:frontend-design` skill |

When agents are available, use them — don't do manually what a specialized
agent does better.

### Final-pass audit (after every major refactor)

After completing a multi-phase refactor or wave of feature work, **always
run a full-project audit pass**:

- `codebase-cartographer:audit` — comprehensive multi-agent audit (or
  `audit-quick` for a faster structural pass)
- Or the `feature-dev:code-reviewer` agent across the whole diff if the
  scope is narrower

Expect to do **multiple passes** — the first audit surfaces issues, the
second confirms the fixes. Don't declare a project "done" after a single
review. Findings get triaged: critical/high get fixed before commit;
low-priority gets logged in `DEFERRED.md`.
