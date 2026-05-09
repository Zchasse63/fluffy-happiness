-- ===========================================================================
-- Meridian — Add columns the sync engine needs after the 2026-05-08 field
-- audit (specs/audits/qa-discovery-2026-05-08.md §A).
-- ===========================================================================
-- One column added to capture data the sync was dropping on the floor:
--
--   bookings.is_from_waiting_list    Whether this booking was promoted from the
--                                    waitlist. Glofox returns
--                                    `is_from_waiting_list: boolean` per
--                                    booking. Useful for retention analytics
--                                    ("how many converted from waitlist end up
--                                    booking again?") and for operations ("did I
--                                    tell waitlist members they were upgraded?").
--
-- The realtime per-class waitlist count is captured into the existing
-- class_instances.waitlist_count column (already wired into app/api/classes/
-- route.ts) — no new column needed. The earlier draft of this migration also
-- added waiting_count which was redundant; the follow-up migration
-- 0023_consolidate_waitlist_count drops it.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS so a re-run is a no-op.
-- ===========================================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS is_from_waiting_list BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN bookings.is_from_waiting_list IS
  'Whether this booking was promoted from a waitlist (Glofox is_from_waiting_list flag).';
