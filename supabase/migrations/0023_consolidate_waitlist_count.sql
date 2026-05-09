-- ===========================================================================
-- Meridian — Consolidate waitlist_count.
-- ===========================================================================
-- An earlier draft of 0022_glofox_sync_columns.sql added a `waiting_count`
-- column to class_instances. The pre-existing `waitlist_count` column was
-- already wired into app/api/classes/route.ts and serves the same purpose —
-- the realtime waitlist length per class instance, populated from Glofox
-- `events.waiting`. Drop the duplicate.
--
-- Idempotent: DROP COLUMN IF EXISTS so a re-run is a no-op.
-- ===========================================================================

ALTER TABLE class_instances DROP COLUMN IF EXISTS waiting_count;

COMMENT ON COLUMN class_instances.waitlist_count IS
  'Realtime waitlist length from Glofox events.waiting field. Refreshed each sync cycle.';
