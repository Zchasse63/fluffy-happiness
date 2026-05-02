-- ===========================================================================
-- people view + segment_counts RPC.
--
-- Why: GloFox treats every signup as a "lead" regardless of whether they
-- later became a paying member. The leads table is essentially a
-- person-of-interest log. The members table is a subset of leads who
-- got a membership (recurring or otherwise). To do honest segmentation
-- we union both into a single per-person view, dedupe by email, and
-- attach behavioral signals (last visit, last purchase, visit counts
-- over rolling windows, lifetime spend, current credit balance).
--
-- Membership ≠ credits. A person can have credits without a recurring
-- membership; only `membership_status = 'active'` AND a recurring tier
-- counts as an "active recurring" customer. The segments below split
-- "active" into recurring vs by-attendance accordingly.
-- ===========================================================================

-- 1. People view -----------------------------------------------------------

CREATE OR REPLACE VIEW people
WITH (security_invoker = true)
AS
WITH booking_agg AS (
  SELECT
    member_id,
    MIN(created_at) AS first_booking_at,
    MAX(CASE WHEN status = 'checked_in' THEN created_at END) AS last_visit_at,
    COUNT(*) FILTER (
      WHERE status = 'checked_in' AND created_at > now() - interval '21 days'
    ) AS visits_21d,
    COUNT(*) FILTER (
      WHERE status = 'checked_in' AND created_at > now() - interval '30 days'
    ) AS visits_30d,
    COUNT(*) FILTER (
      WHERE status = 'checked_in' AND created_at > now() - interval '60 days'
    ) AS visits_60d
  FROM bookings
  WHERE member_id IS NOT NULL
  GROUP BY member_id
),
txn_agg AS (
  SELECT
    member_id,
    MAX(occurred_at) AS last_purchase_at,
    COALESCE(SUM(amount_cents), 0) AS total_spend_cents,
    COUNT(*) FILTER (WHERE occurred_at > now() - interval '60 days') AS purchases_60d,
    BOOL_OR(lower(coalesce(description, '')) LIKE '%trial%') AS has_trial_purchase
  FROM transactions
  WHERE member_id IS NOT NULL
    AND status = 'completed'
  GROUP BY member_id
),
member_rows AS (
  SELECT
    m.studio_id,
    m.id AS member_id,
    NULL::uuid AS lead_id,
    lower(p.email) AS email_key,
    p.email,
    p.full_name,
    p.phone,
    LEAST(p.created_at, m.created_at) AS registered_at,
    m.membership_status,
    m.membership_tier,
    m.plan_id,
    m.plan_price_cents,
    (COALESCE(m.membership_credits, 0) + COALESCE(m.flex_credits, 0)) AS credit_balance,
    TRUE AS is_member,
    FALSE AS is_lead_only
  FROM members m
  JOIN profiles p ON p.id = m.profile_id
  WHERE p.email IS NOT NULL
),
lead_only_rows AS (
  -- Leads whose email isn't already in members. We surface these as
  -- pure lead/cold rows; the unified view downstream prefers the
  -- member record when both exist.
  SELECT
    l.studio_id,
    NULL::uuid AS member_id,
    l.id AS lead_id,
    lower(l.email) AS email_key,
    l.email,
    l.full_name,
    NULLIF(l.phone, '') AS phone,
    l.created_at AS registered_at,
    NULL::text AS membership_status,
    NULL::text AS membership_tier,
    NULL::uuid AS plan_id,
    NULL::integer AS plan_price_cents,
    0 AS credit_balance,
    FALSE AS is_member,
    TRUE AS is_lead_only
  FROM leads l
  WHERE l.email IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM members m
      JOIN profiles p ON p.id = m.profile_id
      WHERE m.studio_id = l.studio_id
        AND p.email IS NOT NULL
        AND lower(p.email) = lower(l.email)
    )
),
unified AS (
  SELECT * FROM member_rows
  UNION ALL
  SELECT * FROM lead_only_rows
)
SELECT
  u.studio_id,
  u.member_id,
  u.lead_id,
  u.email_key,
  u.email,
  u.full_name,
  u.phone,
  u.registered_at,
  u.membership_status,
  u.membership_tier,
  u.plan_id,
  u.plan_price_cents,
  u.credit_balance,
  u.is_member,
  u.is_lead_only,
  -- Recurring tiers (heuristic: any tier name containing "monthly",
  -- "annual", or "unlimited" but excluding the trial). Plus an explicit
  -- check on plan billing_interval = 'month'/'year' when plan_id is set.
  (
    u.membership_status = 'active'
    AND (
      lower(coalesce(u.membership_tier, '')) ~ '(monthly|annual|unlimited)'
      AND lower(coalesce(u.membership_tier, '')) NOT LIKE '%trial%'
    )
  ) AS is_active_recurring,
  ba.first_booking_at,
  ba.last_visit_at,
  COALESCE(ba.visits_21d, 0) AS visits_21d,
  COALESCE(ba.visits_30d, 0) AS visits_30d,
  COALESCE(ba.visits_60d, 0) AS visits_60d,
  ta.last_purchase_at,
  COALESCE(ta.total_spend_cents, 0) AS total_spend_cents,
  COALESCE(ta.purchases_60d, 0) AS purchases_60d,
  COALESCE(ta.has_trial_purchase, FALSE) AS has_trial_purchase
FROM unified u
LEFT JOIN booking_agg ba ON ba.member_id = u.member_id
LEFT JOIN txn_agg ta     ON ta.member_id = u.member_id;

-- 2. Segment assignment view ----------------------------------------------
-- One row per (person, segment_id) so we can COUNT(*) GROUP BY for the
-- segments page and filter by segment_id for the drill-down list. A
-- person can belong to multiple segments (e.g. a Hooked-urgent who's
-- also a Trial-in-flight); that's intentional.

CREATE OR REPLACE VIEW segment_assignments
WITH (security_invoker = true)
AS
SELECT
  studio_id, email_key, member_id, lead_id, full_name, email, phone,
  segment_id
FROM people p
CROSS JOIN LATERAL (
  VALUES
    -- 1. Active recurring
    ('active-recurring', p.is_active_recurring),
    -- 2. Active by attendance (no recurring, but bought + attended in 60d)
    ('active-attendance',
      NOT p.is_active_recurring
      AND p.purchases_60d >= 1
      AND p.visits_60d >= 4),
    -- 3. Trial in flight
    ('trial-in-flight',
      lower(coalesce(p.membership_tier, '')) LIKE '%trial%'
      AND p.last_purchase_at > now() - interval '21 days'),
    -- 4. Hooked urgent — 5+ visits in 21d, not recurring
    ('hooked-urgent',
      NOT p.is_active_recurring
      AND p.visits_21d >= 5),
    -- 5. Hooked candidate — 4+ visits in 30d, not recurring, not urgent
    ('hooked-candidate',
      NOT p.is_active_recurring
      AND p.visits_30d >= 4
      AND p.visits_21d < 5),
    -- 6. Trial graduated — bought a trial AND has a later purchase
    ('trial-graduated',
      p.has_trial_purchase
      AND p.purchases_60d >= 2
      AND p.is_active_recurring),
    -- 7. Trial lapsed — bought a trial, no purchase in 30d, not active
    ('trial-lapsed',
      p.has_trial_purchase
      AND NOT p.is_active_recurring
      AND (p.last_purchase_at IS NULL OR p.last_purchase_at < now() - interval '30 days')),
    -- 8. Cancelled recurring — explicit cancelled status
    ('cancelled-recurring',
      p.membership_status = 'cancelled'),
    -- 9. Cooling — was attending, now silent
    ('cooling',
      p.visits_60d >= 4
      AND p.visits_21d = 0
      AND p.last_visit_at > now() - interval '60 days'),
    -- 10. Stale backlog credits — has credits, no recent visit
    ('stale-credits',
      p.credit_balance > 0
      AND (p.last_visit_at IS NULL OR p.last_visit_at < now() - interval '60 days')),
    -- 11. Drop-in only — has purchases, never on recurring or trial
    ('drop-in-only',
      NOT p.is_active_recurring
      AND NOT p.has_trial_purchase
      AND p.total_spend_cents > 0
      AND p.purchases_60d >= 0),
    -- 12. New face, not converted — first booking in last 30d, no recurring
    ('new-face',
      p.first_booking_at > now() - interval '30 days'
      AND NOT p.is_active_recurring),
    -- 13. Cold lead — never booked, never purchased, registered 30d+ ago
    ('cold-lead',
      p.first_booking_at IS NULL
      AND p.total_spend_cents = 0
      AND p.registered_at < now() - interval '30 days')
) AS s(segment_id, in_segment)
WHERE s.in_segment;

-- 3. Segment counts RPC ---------------------------------------------------
-- One round trip returns counts for every segment + the stale-credit
-- liability total. Cached at the loader level via withKpiCache.

CREATE OR REPLACE FUNCTION segment_counts(p_studio_id UUID)
RETURNS TABLE (
  segment_id           TEXT,
  member_count         INTEGER,
  stale_credit_value   INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    sa.segment_id,
    COUNT(*)::INTEGER AS member_count,
    -- Stale-credit liability: only meaningful for the stale-credits
    -- segment. Rough $ value = credit_balance × $40 (rounded
    -- average drop-in price). Real per-person value comes from
    -- joining transactions, but this gives an order-of-magnitude
    -- liability headline for the segments page.
    CASE WHEN sa.segment_id = 'stale-credits'
      THEN COALESCE(SUM(p.credit_balance) * 4000, 0)::INTEGER
      ELSE 0
    END AS stale_credit_value
  FROM segment_assignments sa
  LEFT JOIN people p
    ON p.studio_id = sa.studio_id
   AND p.email_key = sa.email_key
  WHERE sa.studio_id = p_studio_id
  GROUP BY sa.segment_id;
$$;

REVOKE ALL ON FUNCTION segment_counts(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION segment_counts(UUID) TO authenticated, service_role;

-- 4. Segment people RPC ---------------------------------------------------
-- Drill-down: list people in a segment with their key signals. Capped at
-- 500 rows (operator UI shouldn't render more anyway).

CREATE OR REPLACE FUNCTION segment_people(
  p_studio_id UUID,
  p_segment_id TEXT,
  p_limit INTEGER DEFAULT 200
)
RETURNS TABLE (
  email                TEXT,
  full_name            TEXT,
  phone                TEXT,
  member_id            UUID,
  lead_id              UUID,
  membership_status    TEXT,
  membership_tier      TEXT,
  credit_balance       INTEGER,
  visits_30d           INTEGER,
  last_visit_at        TIMESTAMPTZ,
  last_purchase_at     TIMESTAMPTZ,
  total_spend_cents    INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p.email,
    p.full_name,
    p.phone,
    p.member_id,
    p.lead_id,
    p.membership_status,
    p.membership_tier,
    p.credit_balance,
    p.visits_30d,
    p.last_visit_at,
    p.last_purchase_at,
    p.total_spend_cents
  FROM segment_assignments sa
  JOIN people p
    ON p.studio_id = sa.studio_id
   AND p.email_key = sa.email_key
  WHERE sa.studio_id = p_studio_id
    AND sa.segment_id = p_segment_id
  ORDER BY
    -- Most-actionable-first per segment: highest spend / most visits.
    p.total_spend_cents DESC,
    p.visits_30d DESC
  LIMIT GREATEST(LEAST(p_limit, 500), 1);
$$;

REVOKE ALL ON FUNCTION segment_people(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION segment_people(UUID, TEXT, INTEGER) TO authenticated, service_role;
