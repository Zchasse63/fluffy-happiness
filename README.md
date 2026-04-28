# Meridian

Operator dashboard for **The Sauna Guys** (Tampa, FL). Built per the
`HANDOFF.md` design contract from Claude Design and the rebuild plan in
`/rebuild-handoff-document.md`.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** for utilities; design tokens live in
  `app/globals.css` as CSS custom properties (the "Atelier" palette).
- **Supabase** — PostgreSQL + Auth + Realtime. Server clients via
  `@supabase/ssr`.
- **Glofox API** is the source of truth for members/classes/bookings/
  transactions (sync engine arrives in Phase R1).

## Getting started

```bash
cp .env.local.example .env.local   # already has Supabase URL + publishable key
npm install
npm run dev
```

Open <http://localhost:3000>.

The Supabase project is `ptgeijftzfykjbiujvty`. To apply migrations:

```bash
npx supabase link --project-ref ptgeijftzfykjbiujvty
npx supabase db push
```

## Project layout

```
app/
  layout.tsx            Root layout: fonts + AppShell wrapper
  globals.css           Atelier design tokens + shell + utility classes
  page.tsx              Command Center (the most important screen)
  schedule/             Calendar + Optimization (stubs)
  members/              Directory + Segments (stubs)
  revenue/              Overview, Memberships, Transactions, Retail,
                        Gift cards, Dunning (stubs)
  marketing/            Overview, Campaigns, Automations, Leads, Content
  analytics/            Insights feed (stub)
  operations/           Staff, Payroll, Facilities, Waivers (stubs)
  settings/, portal/, corporate/

components/
  app-shell.tsx         Sidebar + Topbar + ⌘K palette wiring
  sidebar.tsx           Persistent nav with section auto-expand
  topbar.tsx            Breadcrumbs + ⌘K pill + actions + avatar
  command-palette.tsx   Global ⌘K — fuzzy search over routes/members
  primitives.tsx        Shared visual primitives (KPI, IDA, Donut, …)
  icon.tsx              Hand-rolled SVG icon set from the prototype
  avatar.tsx            Procedural face avatar (no external requests)

lib/
  nav.ts                NAV + PAGE_TITLES — single source of route truth
  utils.ts              cn(), formatCurrency, formatPercent
  supabase/
    client.ts           Browser client (publishable key only)
    server.ts           Server client wired to request cookies
    proxy.ts            Used by Next.js 16 proxy.ts to refresh session

supabase/
  migrations/0001…0005  R0 foundation: schema + RLS + indexes + RPCs
                        + seed (single Tampa studio).
proxy.ts                Next.js 16 proxy (replaces middleware.ts)
next.config.ts          Security headers + CSP
```

## Phase status

- ✅ **R0 foundation** — schema, RLS, indexes, RPC, seed
- ✅ **Visual contract** — tokens, shell, ⌘K, Command Center
- ⏳ **R1 API layer** — port Glofox client + sync engine
- ⏳ **R2 Data backfill** — historical import from Glofox
- ⏳ **R3 Feature fixes** — security headers ✓, Stripe + AI insights pending

See `../rebuild-phased-implementation-plan.md` for the full sequence.

## Design contract

The visual system is **locked** per `HANDOFF.md` §3. Tokens, typography,
shadow style, and the IDA card pattern are product decisions. Don't drift
without design review.

- Palette: warm-paper neutrals, terracotta `#C2410C`, deep teal `#0F766E`
- Typography: Instrument Serif for display, JetBrains Mono for eyebrows,
  Inter for UI
- Radii: 8 / 12 / 18 / 24
- Shadows: soft warm only

## Conventions

- Server components by default. Client only when state/effects are needed
  (`AppShell`, `Sidebar`, `Topbar`, `CommandPalette`).
- Routing via `<Link>` and `useRouter` — no manual `localStorage` route.
- Every tenant table has `studio_id`. RLS is enforced at the DB layer.
- The service-role key never leaves the server. Treat it as a secret.
