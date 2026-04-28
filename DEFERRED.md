# Deferred — needs your attention before final cutover

Items that aren't blocking the autonomous build but require human intervention
to fully exercise. Each entry says **what it needs**, **why it's deferred**,
and **how to unblock**.

## External credentials

| Item | Needed for | How to unblock |
|---|---|---|
| `GLOFOX_API_KEY` + `GLOFOX_API_TOKEN` | Live sync of members/classes/bookings/transactions | Paste real values into `.env.local` from Glofox Integrations page; the client will retry on next request. |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Refunds, subscription updates, dunning retries | Stripe Dashboard → Developers → API keys + Webhooks. Webhook endpoint is `/api/webhooks/stripe`. |
| `RESEND_API_KEY` + `RESEND_WEBHOOK_SECRET` | Campaign sends + delivery tracking | Resend Dashboard. Webhook is `/api/webhooks/resend`. |
| `ANTHROPIC_API_KEY` | Daily AI briefing + Ask Meridian + churn prediction | Anthropic Console. Used by `lib/ai/claude.ts`. |
| `INNGEST_SIGNING_KEY` + `INNGEST_EVENT_KEY` | Hourly sync, write-back queue, scheduled jobs | Inngest Dashboard. Local dev: `npx inngest-cli@latest dev`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only sync writes that need to bypass RLS | Supabase Dashboard → Settings → API. **Never expose to the browser.** |
| `CRON_SECRET` + `EMAIL_UNSUBSCRIBE_SECRET` | Securing cron endpoints + HMAC unsubscribe tokens | Generate fresh: `openssl rand -base64 32`. |

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

- [ ] **Playwright E2E** — port the existing 70-spec suite from the
      original repo. Specs live in `e2e/` (placeholder).
- [ ] **Vitest unit tests** — primarily for `lib/glofox/transformers.ts`.
- [ ] **Sentry / OTEL hooks** — wire once we move to Netlify.

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
