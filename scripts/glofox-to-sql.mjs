/*
 * Convert /tmp/meridian-backfill/*.json into SQL upsert files.
 *
 * Each output is a single `jsonb_array_elements(…)`-driven UPSERT so
 * one statement handles thousands of rows without manual VALUES lists.
 *
 * Output: /tmp/meridian-backfill/upsert/{phase}.sql
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const IN = "/tmp/meridian-backfill";
const OUT = `${IN}/upsert`;
mkdirSync(OUT, { recursive: true });

const STUDIO = "11111111-1111-1111-1111-111111111111";
const LOCATION = "22222222-2222-2222-2222-222222222222";

// Chunk JSON arrays into batches so each emitted statement stays under
// the MCP execute_sql payload limit. ~250 rows × ~1KB ≈ 250KB per stmt.
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function asJsonbLiteral(arr) {
  // Postgres-friendly JSON literal: dollar-quoted to avoid escaping.
  return `$gfsync$${JSON.stringify(arr)}$gfsync$::jsonb`;
}

function fileToBatches(name, batchSize = 250) {
  const raw = JSON.parse(readFileSync(`${IN}/${name}.json`, "utf8"));
  console.log(`  ${name}.json — ${raw.length} rows`);
  return chunk(raw, batchSize);
}

function writePhase(filename, sqlChunks) {
  writeFileSync(`${OUT}/${filename}`, sqlChunks.join("\n\n"));
  console.log(`  → wrote ${OUT}/${filename} (${sqlChunks.length} stmts)`);
}

console.log("=== Building SQL upserts ===\n");

// 1. profiles + members from /2.0/members
console.log("members → profiles + members");
// Slim each member to just the fields we use, then chunk. Reduces
// payload size ~10× (full Glofox record includes images, addresses,
// emergency contacts, etc).
const slimMembers = JSON.parse(readFileSync(`${IN}/members.json`, "utf8")).map(
  (m) => ({
    _id: m._id,
    first_name: m.first_name ?? "",
    last_name: m.last_name ?? "",
    email: m.email ?? null,
    phone: m.phone ?? null,
    membership: m.membership
      ? {
          status: m.membership.status ?? null,
          membership_name: m.membership.membership_name ?? null,
        }
      : null,
  }),
);
writeFileSync(`${IN}/members.slim.json`, JSON.stringify(slimMembers));
const memBatches = chunk(slimMembers, 250);
console.log(`  members slim — ${slimMembers.length} rows in ${memBatches.length} batches`);
const memSql = memBatches.map((b) => `
WITH src AS (
  SELECT jsonb_array_elements(${asJsonbLiteral(b)}) AS m
), upserted_profiles AS (
  INSERT INTO profiles (studio_id, glofox_id, email, full_name, phone, metadata, glofox_synced_at)
  SELECT
    '${STUDIO}'::uuid,
    m->>'_id',
    NULLIF(m->>'email',''),
    NULLIF(TRIM(BOTH ' ' FROM COALESCE(m->>'first_name','') || ' ' || COALESCE(m->>'last_name','')),''),
    NULLIF(m->>'phone',''),
    COALESCE(m->'membership','{}'::jsonb),
    NOW()
  FROM src
  WHERE m->>'_id' IS NOT NULL
    AND TRIM(BOTH ' ' FROM COALESCE(m->>'first_name','') || ' ' || COALESCE(m->>'last_name','')) <> ''
  ON CONFLICT (studio_id, glofox_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    metadata = EXCLUDED.metadata,
    glofox_synced_at = NOW()
  RETURNING id, glofox_id
)
INSERT INTO members (
  studio_id, glofox_id, profile_id, membership_status, membership_tier,
  glofox_synced_at, glofox_write_status
)
SELECT
  '${STUDIO}'::uuid,
  src.m->>'_id',
  upserted_profiles.id,
  CASE LOWER(COALESCE(src.m->'membership'->>'status',''))
    WHEN 'active' THEN 'active'
    WHEN 'inactive' THEN 'cancelled'
    WHEN 'canceled' THEN 'cancelled'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'expired' THEN 'expired'
    WHEN 'paused' THEN 'paused'
    WHEN 'trialing' THEN 'trialing'
    ELSE 'prospect'
  END,
  NULLIF(src.m->'membership'->>'membership_name',''),
  NOW(),
  'synced'
FROM src
JOIN upserted_profiles ON upserted_profiles.glofox_id = src.m->>'_id'
ON CONFLICT (studio_id, glofox_id) DO UPDATE SET
  membership_status = EXCLUDED.membership_status,
  membership_tier = EXCLUDED.membership_tier,
  glofox_synced_at = NOW();
`);
writePhase("01_members.sql", memSql);

// 2. staff → profiles (with trainer role)
console.log("staff → profiles + trainers");
const staffBatches = fileToBatches("staff", 100);
const staffSql = staffBatches.map((b) => `
INSERT INTO profiles (studio_id, glofox_id, email, full_name, roles, glofox_synced_at)
SELECT
  '${STUDIO}'::uuid,
  s->>'_id',
  NULLIF(s->>'email',''),
  NULLIF(TRIM(BOTH ' ' FROM COALESCE(s->>'first_name','') || ' ' || COALESCE(s->>'last_name','')), ''),
  CASE LOWER(COALESCE(s->>'type','staff'))
    WHEN 'trainer' THEN ARRAY['trainer']
    WHEN 'admin' THEN ARRAY['owner']
    WHEN 'reception' THEN ARRAY['front_desk']
    ELSE ARRAY['staff']
  END,
  NOW()
FROM jsonb_array_elements(${asJsonbLiteral(b)}) AS s
WHERE s->>'_id' IS NOT NULL
  AND TRIM(BOTH ' ' FROM COALESCE(s->>'first_name','') || ' ' || COALESCE(s->>'last_name','')) <> ''
ON CONFLICT (studio_id, glofox_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  roles = EXCLUDED.roles,
  glofox_synced_at = NOW();

INSERT INTO trainers (studio_id, glofox_id, profile_id, is_active)
SELECT
  '${STUDIO}'::uuid,
  s->>'_id',
  p.id,
  COALESCE((s->>'active')::boolean, TRUE)
FROM jsonb_array_elements(${asJsonbLiteral(b)}) AS s
JOIN profiles p ON p.glofox_id = s->>'_id' AND p.studio_id = '${STUDIO}'::uuid
WHERE LOWER(COALESCE(s->>'type','')) = 'trainer'
ON CONFLICT (studio_id, glofox_id) DO UPDATE SET
  is_active = EXCLUDED.is_active;
`);
writePhase("02_staff.sql", staffSql);

// 3. programs (only 3 rows — and Glofox uses `id` not `_id` here)
console.log("programs");
const progRaw = JSON.parse(readFileSync(`${IN}/programs.json`, "utf8")).map(
  (p) => ({
    id: p.id ?? p._id,
    name: p.name,
    description: p.description ?? null,
    active: p.active ?? true,
  }),
);
console.log(`  programs.json — ${progRaw.length} rows`);
const progSql = `
INSERT INTO programs (studio_id, glofox_id, name, description, is_active)
SELECT
  '${STUDIO}'::uuid,
  p->>'id',
  p->>'name',
  NULLIF(p->>'description',''),
  COALESCE((p->>'active')::boolean, TRUE)
FROM jsonb_array_elements(${asJsonbLiteral(progRaw)}) AS p
WHERE p->>'id' IS NOT NULL
ON CONFLICT (studio_id, glofox_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;
`;
writePhase("03_programs.sql", [progSql]);

// 4. membership plans
console.log("membership_plans");
const plansRaw = JSON.parse(readFileSync(`${IN}/membership_plans.json`, "utf8"));
console.log(`  membership_plans.json — ${plansRaw.length} rows`);
// Each Glofox membership has plans[]; flatten to one row per (membership, plan).
const planRows = plansRaw.flatMap((m) =>
  (m.plans ?? [{ code: m._id }]).map((p) => ({
    glofox_id: `${m._id}:${p.code ?? "default"}`,
    name: m.name,
    plan_code: p.code,
    price_cents: Math.round((p.price ?? 0) * 100),
    billing_interval: p.duration_time_unit ?? "month",
    active: m.active ?? true,
  })),
);
const plansSql = `
INSERT INTO membership_plans (
  studio_id, location_id, glofox_id, name, price_cents, billing_interval,
  is_active, sort_order
)
SELECT
  '${STUDIO}'::uuid,
  '${LOCATION}'::uuid,
  p->>'glofox_id',
  p->>'name',
  COALESCE((p->>'price_cents')::int, 0),
  COALESCE(p->>'billing_interval','month'),
  COALESCE((p->>'active')::boolean, TRUE),
  0
FROM jsonb_array_elements(${asJsonbLiteral(planRows)}) AS p
ON CONFLICT (studio_id, glofox_id) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  billing_interval = EXCLUDED.billing_interval,
  is_active = EXCLUDED.is_active;
`;
writePhase("04_plans.sql", [plansSql]);

// 5. events → class_instances
console.log("events → class_instances");
const slimEvents = JSON.parse(readFileSync(`${IN}/events.json`, "utf8")).map(
  (e) => ({
    _id: e._id,
    name: e.name ?? null,
    program_id: e.program_id ?? null,
    trainers: e.trainers ?? [],
    time_start: e.time_start ?? null,
    duration: e.duration ?? 60,
    size: e.size ?? 12,
    booked: e.booked ?? 0,
    status: e.status ?? null,
  }),
);
writeFileSync(`${IN}/events.slim.json`, JSON.stringify(slimEvents));
const eventBatches = chunk(slimEvents, 200);
const eventSql = eventBatches.map((b) => `
INSERT INTO class_instances (
  studio_id, location_id, program_id, trainer_id, glofox_id, title,
  starts_at, ends_at, capacity, booked_count, status, is_one_off
)
SELECT
  '${STUDIO}'::uuid,
  '${LOCATION}'::uuid,
  prog.id,
  trn.id,
  e->>'_id',
  COALESCE(e->>'name','Class'),
  TO_TIMESTAMP((e->>'time_start')::bigint) AT TIME ZONE 'UTC',
  TO_TIMESTAMP((e->>'time_start')::bigint + COALESCE((e->>'duration')::int,60) * 60) AT TIME ZONE 'UTC',
  COALESCE((e->>'size')::int, 12),
  COALESCE((e->>'booked')::int, 0),
  CASE UPPER(COALESCE(e->>'status',''))
    WHEN 'AVAILABLE' THEN 'scheduled'
    WHEN 'COMPLETED' THEN 'completed'
    WHEN 'CANCELED' THEN 'cancelled'
    WHEN 'CANCELLED' THEN 'cancelled'
    ELSE 'scheduled'
  END,
  FALSE
FROM jsonb_array_elements(${asJsonbLiteral(b)}) AS e
LEFT JOIN programs prog ON prog.glofox_id = e->>'program_id' AND prog.studio_id = '${STUDIO}'::uuid
LEFT JOIN trainers trn ON trn.glofox_id = (e->'trainers'->>0) AND trn.studio_id = '${STUDIO}'::uuid
WHERE e->>'_id' IS NOT NULL AND e->>'time_start' IS NOT NULL
ON CONFLICT (studio_id, glofox_id) DO UPDATE SET
  title = EXCLUDED.title,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  capacity = EXCLUDED.capacity,
  booked_count = EXCLUDED.booked_count,
  status = EXCLUDED.status,
  trainer_id = EXCLUDED.trainer_id,
  program_id = EXCLUDED.program_id;
`);
writePhase("05_events.sql", eventSql);

// 6. bookings — depend on members + class_instances
console.log("bookings");
const slimBookings = JSON.parse(readFileSync(`${IN}/bookings.json`, "utf8")).map(
  (b) => ({
    _id: b._id,
    user_id: b.user_id ?? null,
    event_id: b.event_id ?? null,
    status: b.status ?? null,
    attended: b.attended ?? false,
    time_start: b.time_start ?? null,
    canceled_at: b.canceled_at ?? null,
    created: b.created ?? null,
    modified: b.modified ?? null,
  }),
);
writeFileSync(`${IN}/bookings.slim.json`, JSON.stringify(slimBookings));
const bookingBatches = chunk(slimBookings, 250);
const bookingSql = bookingBatches.map((b) => `
INSERT INTO bookings (
  studio_id, class_instance_id, member_id, glofox_id,
  status, source, glofox_write_status, glofox_synced_at,
  checked_in_at, cancelled_at, created_at, updated_at
)
SELECT
  '${STUDIO}'::uuid,
  ci.id,
  m.id,
  bk->>'_id',
  CASE UPPER(COALESCE(bk->>'status',''))
    WHEN 'BOOKED' THEN 'booked'
    WHEN 'WAITING' THEN 'waitlisted'
    WHEN 'CANCELED' THEN 'cancelled'
    WHEN 'CANCELLED' THEN 'cancelled'
    WHEN 'RESERVED' THEN 'booked'
    WHEN 'FAILED' THEN 'cancelled'
    ELSE 'booked'
  END,
  'glofox',
  'synced',
  NOW(),
  CASE WHEN (bk->>'attended')::boolean THEN
    COALESCE(NULLIF(bk->>'time_start','')::timestamptz, NOW())
  ELSE NULL END,
  NULLIF(bk->>'canceled_at','')::timestamptz,
  COALESCE(NULLIF(bk->>'created','')::timestamptz, NOW()),
  COALESCE(NULLIF(bk->>'modified','')::timestamptz, NOW())
FROM jsonb_array_elements(${asJsonbLiteral(b)}) AS bk
LEFT JOIN class_instances ci ON ci.glofox_id = bk->>'event_id' AND ci.studio_id = '${STUDIO}'::uuid
LEFT JOIN members m ON m.glofox_id = bk->>'user_id' AND m.studio_id = '${STUDIO}'::uuid
WHERE bk->>'_id' IS NOT NULL AND ci.id IS NOT NULL
ON CONFLICT (studio_id, glofox_id) DO UPDATE SET
  status = EXCLUDED.status,
  checked_in_at = EXCLUDED.checked_in_at,
  cancelled_at = EXCLUDED.cancelled_at,
  glofox_synced_at = NOW();
`);
writePhase("06_bookings.sql", bookingSql);

// 7. transactions — unwrap the {StripeCharge: {...}} / {Cash: {...}} envelope
console.log("transactions");
const slimTxns = JSON.parse(readFileSync(`${IN}/transactions.json`, "utf8"))
  .map((row) => {
    const keys = Object.keys(row);
    const inner = keys.length ? row[keys[0]] : null;
    if (!inner || !inner._id) return null;
    const occurred =
      typeof inner.created === "string"
        ? Math.floor(new Date(inner.created).getTime() / 1000)
        : (inner.created ?? null);
    return {
      _id: inner._id,
      amount: inner.amount ?? 0,
      currency: inner.currency ?? "USD",
      transaction_status: inner.transaction_status ?? null,
      description: inner.description ?? null,
      created: occurred,
      metadata: {
        user_id: inner?.metadata?.user_id ?? null,
        event_id: inner?.metadata?.event_id ?? null,
        booking_id: inner?.metadata?.booking_id ?? null,
        sold_by_user_id: inner?.sold_by_user_id ?? null,
        payment_method: inner?.metadata?.payment_method ?? null,
        provider: keys[0],
      },
    };
  })
  .filter(Boolean);
// Glofox occasionally duplicates a transaction across providers — dedupe.
{
  const seen = new Set();
  for (let i = slimTxns.length - 1; i >= 0; i--) {
    if (seen.has(slimTxns[i]._id)) slimTxns.splice(i, 1);
    else seen.add(slimTxns[i]._id);
  }
}
writeFileSync(`${IN}/transactions.slim.json`, JSON.stringify(slimTxns));
const txnBatches = chunk(slimTxns, 250);
const txnSql = txnBatches.map((b) => `
INSERT INTO transactions (
  studio_id, glofox_id, type, status, amount_cents, currency,
  description, occurred_at, member_id, metadata
)
SELECT
  '${STUDIO}'::uuid,
  t->>'_id',
  CASE LOWER(COALESCE(t->>'description',''))
    WHEN '' THEN 'walk_in'
    ELSE
      CASE
        WHEN POSITION('membership' IN LOWER(COALESCE(t->>'description',''))) > 0 THEN 'membership'
        WHEN POSITION('credit' IN LOWER(COALESCE(t->>'description',''))) > 0 THEN 'class_pack'
        WHEN POSITION('product' IN LOWER(COALESCE(t->>'description',''))) > 0 THEN 'retail'
        WHEN POSITION('refund' IN LOWER(COALESCE(t->>'description',''))) > 0 THEN 'refund'
        ELSE 'walk_in'
      END
  END,
  CASE UPPER(COALESCE(t->>'transaction_status',''))
    WHEN 'PAID' THEN 'completed'
    WHEN 'REFUNDED' THEN 'refunded'
    WHEN 'PARTIAL_REFUNDED' THEN 'refunded'
    WHEN 'ERROR' THEN 'failed'
    WHEN 'PENDING' THEN 'pending'
    WHEN 'SUBSCRIPTION_CYCLE_PAYMENT_FAILED' THEN 'failed'
    ELSE 'completed'
  END,
  ROUND(COALESCE((t->>'amount')::numeric, 0) * 100)::int,
  COALESCE(t->>'currency','USD'),
  NULLIF(t->>'description',''),
  TO_TIMESTAMP(COALESCE((t->>'created')::bigint, EXTRACT(EPOCH FROM NOW())::bigint)),
  m.id,
  COALESCE(t->'metadata','{}'::jsonb)
FROM jsonb_array_elements(${asJsonbLiteral(b)}) AS t
LEFT JOIN members m ON m.glofox_id = (t->'metadata'->>'sold_by_user_id')
  AND m.studio_id = '${STUDIO}'::uuid
WHERE t->>'_id' IS NOT NULL
ON CONFLICT (studio_id, glofox_id) DO UPDATE SET
  status = EXCLUDED.status,
  amount_cents = EXCLUDED.amount_cents,
  description = EXCLUDED.description;
`);
writePhase("07_transactions.sql", txnSql);

// 8. sync state — record success
const syncSql = `
INSERT INTO glofox_sync_state (studio_id, entity_type, last_synced_at, last_full_sync_at, status, records_synced)
VALUES
  ${[
    ["members", 1221],
    ["staff", 13],
    ["plans", 6],
    ["programs", 3],
    ["events", 1077],
    ["bookings", 2665],
    ["transactions", 653],
    ["leads", 1221],
  ]
    .map(
      ([entity, count]) =>
        `('${STUDIO}'::uuid, '${entity}', NOW(), NOW(), 'success', ${count})`,
    )
    .join(",\n  ")}
ON CONFLICT (studio_id, entity_type) DO UPDATE SET
  last_synced_at = NOW(),
  last_full_sync_at = NOW(),
  status = 'success',
  records_synced = EXCLUDED.records_synced;
`;
writePhase("08_sync_state.sql", [syncSql]);

console.log("\n✓ all SQL written");
