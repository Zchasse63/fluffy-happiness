-- ===========================================================================
-- Meridian — supporting indexes for the segment + analytics queries.
-- ===========================================================================
-- The segment-counts loader (`lib/data/segments.ts`) does:
--   SELECT member_id FROM bookings
--   WHERE studio_id = $1 AND status = 'checked_in' AND created_at >= $2
-- and a similar 21-day "no recent booking" probe. The existing
-- `idx_bookings_member_status` helps the per-member status check, but
-- a `(member_id, created_at DESC)` index serves the date-range path
-- better and is the natural fit for "last booking per member" lookups
-- that the cohort/segment work is going to lean on.
--
-- Plus a single-column `idx_bookings_created_at` to support the segment
-- query without a member-id seek.
-- ===========================================================================

CREATE INDEX IF NOT EXISTS idx_bookings_member_created
  ON bookings (member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_studio_created
  ON bookings (studio_id, created_at DESC);
