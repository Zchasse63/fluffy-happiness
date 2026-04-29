# Glofox client safety audit

**Hard rule:** Meridian does **NOT** write to Glofox under any circumstance.
Glofox is the studio's live source-of-truth booking system. Tests, scripts,
and any code path that would POST/PUT/DELETE a *mutation* against Glofox
must be removed or guarded.

This document is the running audit of every method on `GlofoxClient`
(`lib/glofox/client.ts`) — its HTTP verb, its endpoint, and the reason it is
classified as **read-only** even when it uses POST.

If you add a new client method, **update this document in the same PR**. CI
references this file; any PR that adds a method and does not update SAFETY.md
should be rejected.

## Audit (current as of 2026-04-29)

| Method | HTTP | Endpoint | Classification | Why read-only |
|---|---|---|---|---|
| `members(params?)` | GET | `/2.0/members` | Read | List GET. |
| `member(id)` | GET | `/2.0/members/{id}` | Read | Single-resource GET. |
| `staff(params?)` | GET | `/2.0/staff` | Read | List GET. |
| `membershipPlans()` | GET | `/2.0/memberships` | Read | List GET. |
| `programs()` | **POST** | `/v3.0/locations/{branch}/search-programs` | **Read** | Glofox quirk: program search is exposed only as a POST-with-filter endpoint. The body is a filter spec (`{ active: true }`), not a payload to persist. No write side-effect. |
| `classes(params?)` | GET | `/2.0/events` | Read | List GET. |
| `bookings(params?)` | GET | `/2.2/branches/{branch}/bookings` | Read | List GET. |
| `transactions({ startUnix, endUnix })` | **POST** | `/Analytics/report` | **Read** | Analytics report endpoint. Body specifies `model: "TransactionsList"`, branch, namespace, time range, and payment-method filter. No write side-effect. |
| `leads(params?)` | **POST** | `/2.1/branches/{branch}/leads/filter` | **Read** | Lead-search endpoint, body is a filter spec (`{ lead_status?: string[] }`). No write side-effect. |
| `credits(userId)` | GET | `/2.0/credits` | Read | Per-member credit-pack GET. |

## Verb verification

`GlofoxClient.request` takes the HTTP method as a **positional first argument**
(`request("POST", path, ...)`) — not a `method: "POST"` config key. The grep
must match the call-site shape `("POST"`, not `method: "POST"`.

```bash
grep -nE '\(["'"'"'](POST|PUT|DELETE|PATCH)["'"'"']' lib/glofox/client.ts
```

Returns exactly three lines — programs / transactions / leads — each
individually verified above as a search/report/filter endpoint. **No PUT,
DELETE, or PATCH appears anywhere in the file.** If this grep returns more
than three lines, a new method has been added: update the audit table above
in the same PR.

## Other code paths that touch Glofox

- `app/api/glofox/sync/route.ts` — orchestrator; calls `GlofoxClient.fromEnv()`
  and reads via the audited methods. Writes go to Supabase, not Glofox.
- `app/api/health/route.ts` — `GlofoxClient.isConfigured()` only.
- `lib/data/settings.ts` — `GlofoxClient.isConfigured()` only.
- `lib/glofox/sync-engine.ts` — fetches via the audited methods, upserts into
  Supabase. Confirmed: `grep -nE "\"(POST|PUT|DELETE|PATCH)\"" lib/glofox/sync-engine.ts`
  → no matches.
- `lib/inngest/sync.ts` — wraps the sync engine for the cron handler. Same
  shape as `/api/glofox/sync`.
- `scripts/glofox-*.mjs` — discovery / probe scripts used during R1 schema
  reverse-engineering. **Not invoked from app code or tests.** They use only
  GET endpoints; verified by inspection during the original audit (kept for
  reference but excluded from the test budget).

## Test guard

Every Playwright spec or Vitest test that constructs a real `GlofoxClient` (or
hits a route that does) must include this guard at module scope:

```ts
if (process.env.ALLOW_GLOFOX_WRITES === "1") {
  throw new Error("Refusing to run tests with ALLOW_GLOFOX_WRITES=1 — Glofox is read-only.");
}
```

There is no code path in the application that reads `ALLOW_GLOFOX_WRITES`. The
guard exists purely as a tripwire so that if a future engineer ever sets that
env var with intent to enable writes, the test suite refuses to run until
SAFETY.md is updated and the rule revisited.

## When this rule changes

If product decides to enable Glofox writes (e.g. a separate Glofox test branch
with a test user), do all of the following before adding a write method:

1. Open a PR titled `Enable Glofox writes (test branch)`.
2. Update this document with the new method's classification and the test
   environment it targets.
3. Add a runtime guard that refuses to call the write method when
   `process.env.GLOFOX_BRANCH_ID` matches the production branch.
4. Get an explicit approval from the studio owner before merging.
