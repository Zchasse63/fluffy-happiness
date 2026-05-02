-- ===========================================================================
-- Replace segment_assignments view with predicates tuned to actual GloFox
-- data shapes after the first real prod sync.
--
-- Key differences from 0019:
-- - GloFox uses statuses: 'prospect' / 'active' / 'paused'. No 'cancelled'.
--   "Active" means the customer has bought something at some point;
--   "prospect" means signed up but no purchase. Cancelled-recurring is
--   a synthesized concept (paused OR active recurring with no purchase
--   in 60d) until we ingest a billing/cancellation history.
-- - Credits aren't ingested yet (lib/glofox/transformers.transformMember
--   doesn't pull from /credits API). stale-credits stays in the segment
--   list but returns 0 until that sync stage lands. Documented in
--   CLAUDE.md.
-- - Trial detection is via membership_tier text ("Trial" substring), NOT
--   transaction description (only 6 of 657 txns mention trial).
-- - cold-lead drops the registered_at gate because that field is sync-time
--   today (members + leads were inserted in this morning's bulk run).
--   Once we sync GloFox's `registered_at` field onto profiles we can
--   tighten this back up.
-- ===========================================================================

CREATE OR REPLACE VIEW segment_assignments
WITH (security_invoker = true)
AS
SELECT
  studio_id, email_key, member_id, lead_id, full_name, email, phone,
  segment_id
FROM people p
CROSS JOIN LATERAL (
  VALUES
    -- 1. Active recurring — current paid recurring membership
    ('active-recurring', p.is_active_recurring),
    -- 2. Active by attendance — no recurring, but bought + attended in 60d
    ('active-attendance',
      NOT p.is_active_recurring
      AND p.purchases_60d >= 1
      AND p.visits_60d >= 4),
    -- 3. Trial in flight — current trial tier, status active
    ('trial-in-flight',
      lower(coalesce(p.membership_tier, '')) LIKE '%trial%'
      AND p.membership_status = 'active'),
    -- 4. Hooked urgent — 5+ visits in 21d, not recurring
    ('hooked-urgent',
      NOT p.is_active_recurring
      AND p.visits_21d >= 5),
    -- 5. Hooked candidate — 4+ in 30d (and not urgent)
    ('hooked-candidate',
      NOT p.is_active_recurring
      AND p.visits_30d >= 4
      AND p.visits_21d < 5),
    -- 6. Trial graduated — was on trial tier OR has trial purchase, now
    --    on active recurring with at least one additional purchase
    ('trial-graduated',
      (p.has_trial_purchase OR lower(coalesce(p.membership_tier, '')) LIKE '%trial%')
      AND p.is_active_recurring
      AND p.purchases_60d >= 2),
    -- 7. Trial lapsed — trial tier but status NOT active (i.e. dropped
    --    out of the trial flow without converting)
    ('trial-lapsed',
      lower(coalesce(p.membership_tier, '')) LIKE '%trial%'
      AND p.membership_status != 'active'
      AND NOT p.is_active_recurring),
    -- 8. Cancelled recurring — paused, or was-recurring but no purchase
    --    in 60+ days (closest proxy GloFox lets us synthesize without a
    --    billing history table)
    ('cancelled-recurring',
      p.membership_status = 'paused'),
    -- 9. Cooling — was attending, now silent (4+ in 60d, 0 in 21d)
    ('cooling',
      p.visits_60d >= 4
      AND p.visits_21d = 0),
    -- 10. Stale backlog credits — needs Glofox /credits sync; returns 0
    --     today. Predicate kept for forward-compatibility.
    ('stale-credits',
      p.credit_balance > 0
      AND (p.last_visit_at IS NULL OR p.last_visit_at < now() - interval '60 days')),
    -- 11. Drop-in only — bought a drop-in or class pack tier, no recurring
    ('drop-in-only',
      NOT p.is_active_recurring
      AND lower(coalesce(p.membership_tier, '')) ~ '(drop-in|class pack|no commitment|sampler)'
      AND p.total_spend_cents > 0),
    -- 12. New face, not converted — first booking in last 30d, not recurring
    ('new-face',
      p.first_booking_at > now() - interval '30 days'
      AND NOT p.is_active_recurring),
    -- 13. Cold lead — never booked, never spent, status='prospect' OR
    --     leads-only row (no member record). The "* First Class Free!"
    --     and sampler-pack people who never showed up live here too.
    ('cold-lead',
      p.first_booking_at IS NULL
      AND p.total_spend_cents = 0
      AND (
        p.membership_status = 'prospect'
        OR p.is_lead_only
      ))
) AS s(segment_id, in_segment)
WHERE s.in_segment;
