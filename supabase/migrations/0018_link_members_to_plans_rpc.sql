-- ===========================================================================
-- link_members_to_plans — set members.plan_id + plan_price_cents from
-- the text membership_tier matched against membership_plans.name.
--
-- Glofox returns each member's plan as a text label (membership_name),
-- not a foreign key. Meridian's membership_plans table is hand-curated
-- (prices are an operator decision, not a Glofox-controlled value), so
-- we resolve the FK here as a post-sync step.
--
-- Idempotent: re-running just refreshes the link. Members with a
-- membership_tier that doesn't match any plan name (e.g. trial flags
-- like "* First Class Free!", one-off private events) keep plan_id =
-- NULL — that's the intended behaviour, those aren't paying members.
--
-- Called from lib/glofox/sync-engine.ts after the members upsert.
-- ===========================================================================

CREATE OR REPLACE FUNCTION link_members_to_plans(p_studio_id UUID)
RETURNS TABLE(linked_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INT;
BEGIN
  WITH updated AS (
    UPDATE members m
    SET    plan_id = mp.id,
           plan_price_cents = mp.price_cents,
           updated_at = NOW()
    FROM   membership_plans mp
    WHERE  m.studio_id = p_studio_id
      AND  mp.studio_id = p_studio_id
      AND  m.membership_tier IS NOT NULL
      AND  lower(trim(m.membership_tier)) = lower(trim(mp.name))
      AND  (
        m.plan_id IS DISTINCT FROM mp.id
        OR m.plan_price_cents IS DISTINCT FROM mp.price_cents
      )
    RETURNING m.id
  )
  SELECT COUNT(*)::INT INTO v_count FROM updated;
  RETURN QUERY SELECT v_count;
END;
$$;

REVOKE ALL ON FUNCTION link_members_to_plans(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION link_members_to_plans(UUID) TO service_role;
