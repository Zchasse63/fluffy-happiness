# Meridian

Operator dashboard for **The Sauna Guys** (Tampa, FL). Built per the
`HANDOFF.md` design contract from Claude Design and the rebuild plan in
`/rebuild-handoff-document.md`.

## Stack

- **Next.js 16** (App Router, proxy.ts replaces middleware.ts) +
  **React 19** + **TypeScript**.
- **Tailwind CSS v4** for utilities; design tokens live in
  `app/globals.css` as CSS custom properties (the "Atelier" palette:
  warm-paper neutrals + terracotta + deep teal).
- **Supabase** (PostgreSQL 17 + RLS + Auth + pgvector). Server clients
  via `@supabase/ssr`. Magic-link auth only — no passwords.
- **Glofox API** is the source of truth for members / classes /
  bookings / transactions. Native tables own marketing, AI, analytics.
- **Anthropic Claude** for the daily briefing + Ask Meridian, with
  prompt-caching on the system + studio context (5-min TTL).
- **Stripe** for payments + dunning. **Resend** for transactional email.

## Phase status

| Phase | Status | Notes |
|---|---|---|
| **R0** Foundation | ✅ done | 28 tables, RLS isolated by `studio_id`, RPC for atomic booking + credit ledger, indexes, hardened functions, single-tenant seed |
| **R1** API layer | ✅ done | Glofox client (retry / pagination / unwrap), transformers, sync engine (NDJSON streaming), auth + role-gating proxy, core API routes, AI lib |
| **R2** Data backfill | ⏳ deferred | needs `GLOFOX_API_KEY` + `GLOFOX_API_TOKEN` (see `DEFERRED.md`) |
| **R3** Feature fixes | ✅ ~85% | Security headers, status='confirmed' eliminated, atomic booking, member PUT gated, mutation routes, member profile. Stripe/Resend/Inngest scaffolds wired but stubbed |
| **R4** Cutover | ⏳ deferred | run after R2 backfill verifies counts ±1% vs Glofox dashboard |

## Getting started

```bash
cp .env.local.example .env.local   # has Supabase URL + publishable key
npm install
npm run dev                        # http://localhost:3000
```

Run the smoke test against a built app:

```bash
npm run build
node scripts/smoke.mjs              # 27/27 routes
```

The Supabase project (TSG Main, `ptgeijftzfykjbiujvty`) already has
all migrations applied. To run them locally:

```bash
npx supabase link --project-ref ptgeijftzfykjbiujvty
npx supabase db push
```

## Project layout

```
app/
  layout.tsx, globals.css         Atelier tokens + AppShell wrapper
  page.tsx                         Command Center
  (auth)/login/page.tsx            Magic-link sign-in
  auth/callback/route.ts           Validated next= redirect
  auth/logout/route.ts             POST signOut
  schedule/{calendar,optimization} Week grid + demand heatmap
  members/{directory,segments,[id]} Listing + 8 segments + 6-tab profile
  revenue/                          Overview + Memberships + Transactions
                                    + Retail + Gift cards + Dunning
  marketing/                        Overview + Campaigns + Automations
                                    + Leads (kanban) + Content
  analytics, operations/{...},
  settings, portal, corporate      Full pages — not stubs
  api/
    health/                        Integration probe
    members/                       List + per-member cancel/credit
    classes/                       Range query
    bookings/                      Atomic via book_class_atomic RPC
    transactions/                  List + per-txn refund
    ai/briefing/                   Claude → IDA insights with fallback
    glofox/{sync,status}           NDJSON streaming sync
    webhooks/{stripe,resend}       Verified intake
components/
  app-shell, sidebar, topbar, command-palette
  primitives.tsx                   KpiStrip, InsightCard (IDA), Donut,
                                    LineChart, ChangeBadge, SectionHead,
                                    PageHero, ModuleStub
  icon, avatar
  auth/login-form
lib/
  nav.ts                           NAV + PAGE_TITLES (single source)
  utils.ts                         cn, formatCurrency, formatPercent
  fixtures.ts                      Typed seed data — falls back when DB empty
  auth.ts                          requireProfile / requireRole helpers
  data/members.ts                  Server-side query w/ fixture fallback
  supabase/{client,server,proxy}   Three contexts, never service-role browser
  glofox/{client,types,transformers,index}
  ai/claude.ts                     Anthropic SDK wrapper, prompt-cached
proxy.ts                          Auth refresh + role-gate redirect
next.config.ts                    CSP / HSTS / X-Frame / etc.
supabase/migrations/0001…0008     R0 + marketing/AI + advisor cleanup
scripts/smoke.mjs                 boots next start, hits 27 routes
DEFERRED.md                       Items needing your attention
```

## Design contract

Locked per `HANDOFF.md` §3 — don't drift without design review.

- Palette: warm-paper neutrals, terracotta `#C2410C`, deep teal `#0F766E`.
- Typography: Instrument Serif (display), JetBrains Mono (eyebrows /
  metrics), Inter (UI body).
- Radii: 8 / 12 / 18 / 24.
- Shadows: soft warm only — no hard drops, no neumorphism.
- IDA pattern (Insight → Detail → Action) on every AI suggestion.
- Engagement badges: 7 states (Power / Active / Engaged / Cooling /
  At risk / New / Lapsed).

## Conventions

- Server components by default. Client only when state/effects are
  needed (`AppShell`, `Sidebar`, `Topbar`, `CommandPalette`,
  `LoginForm`).
- Routing via `<Link>` + `useRouter` — no manual `localStorage` route.
- Every tenant table has `studio_id`. RLS enforces isolation; API
  routes do `requireRole('owner','manager')` defense-in-depth.
- The service-role key never leaves the server. Treat as a secret.
- Validate at boundaries (Zod on every API body); trust internal code
  past that.
- Async-by-default for >1s work — Inngest write-back queue for Glofox
  + Stripe side-effects (deferred until creds set).

## QA gates

Run after each meaningful change:

```bash
npm run build           # turbopack + tsc --noEmit
node scripts/smoke.mjs  # 27 routes — no 5xx
```

Plus the Supabase advisor checks:

- 0 security advisors (run after migrations)
- ≤200 performance advisors at INFO/WARN — most are
  `unindexed_foreign_keys` we'll patch as the data layer warms up
