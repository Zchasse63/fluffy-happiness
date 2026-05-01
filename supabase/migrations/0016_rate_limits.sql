-- ===========================================================================
-- Rate-limit token bucket for cost-sensitive endpoints (audit M-08).
--
-- A single row per (studio_id, key). The check_rate_limit RPC does the
-- read + increment + window-reset atomically (FOR UPDATE) so concurrent
-- callers can't slip past the cap.
--
-- Caller responsibilities:
--   - Pick a stable `key` that combines purpose + actor, e.g.
--     'ai:ask:<profile_id>'.
--   - Pass max + window_ms.
--   - Return 429 with Retry-After header when allowed=false.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  studio_id    UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  key          TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count        INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (studio_id, key)
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role only — callers never read this table directly; they go
-- through the RPC, which uses SECURITY DEFINER to bypass RLS.
CREATE POLICY rate_limits_no_anon ON rate_limits
  FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_studio_id UUID,
  p_key       TEXT,
  p_max       INT,
  p_window_ms BIGINT
)
RETURNS TABLE(allowed BOOLEAN, retry_after_ms BIGINT, current_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count        INT;
  v_now          TIMESTAMPTZ := clock_timestamp();
  v_window_secs  NUMERIC      := p_window_ms::NUMERIC / 1000.0;
BEGIN
  SELECT rl.window_start, rl.count
  INTO   v_window_start, v_count
  FROM   rate_limits rl
  WHERE  rl.studio_id = p_studio_id AND rl.key = p_key
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO rate_limits (studio_id, key, window_start, count, updated_at)
    VALUES (p_studio_id, p_key, v_now, 1, v_now);
    RETURN QUERY SELECT TRUE, 0::BIGINT, 1;
    RETURN;
  END IF;

  -- Window expired — reset the bucket.
  IF v_now - v_window_start > make_interval(secs => v_window_secs) THEN
    UPDATE rate_limits
    SET    window_start = v_now, count = 1, updated_at = v_now
    WHERE  studio_id = p_studio_id AND key = p_key;
    RETURN QUERY SELECT TRUE, 0::BIGINT, 1;
    RETURN;
  END IF;

  -- Within window, over the cap — refuse.
  IF v_count >= p_max THEN
    RETURN QUERY SELECT
      FALSE,
      (EXTRACT(EPOCH FROM (v_window_start + make_interval(secs => v_window_secs) - v_now)) * 1000)::BIGINT,
      v_count;
    RETURN;
  END IF;

  -- Within window, under the cap — increment.
  UPDATE rate_limits
  SET    count = v_count + 1, updated_at = v_now
  WHERE  studio_id = p_studio_id AND key = p_key;
  RETURN QUERY SELECT TRUE, 0::BIGINT, v_count + 1;
END;
$$;

REVOKE ALL ON FUNCTION check_rate_limit(UUID, TEXT, INT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID, TEXT, INT, BIGINT) TO service_role;
