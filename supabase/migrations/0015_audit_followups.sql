-- ===========================================================================
-- Audit follow-ups (cartographer 2026-04-30, findings M-01 + M-02).
--
-- M-01 — activity_log(actor_id) missing index. loadActivityFeed() joins
-- profiles:actor_id(full_name) on every Command Center load; without the
-- index this was a sequential scan over an ever-growing table.
--
-- M-02 — facility_maintenance has no updated_at column / trigger. If a
-- maintenance record is ever edited there is no audit trail. Add the
-- column + the standard set_updated_at trigger pattern used elsewhere.
-- ===========================================================================

-- M-01: index on activity_log.actor_id (partial — actor_id is nullable)
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_id
  ON activity_log(actor_id)
  WHERE actor_id IS NOT NULL;

-- M-02: updated_at on facility_maintenance + standard trigger
ALTER TABLE facility_maintenance
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_facility_maintenance_updated_at ON facility_maintenance;
CREATE TRIGGER trg_facility_maintenance_updated_at
  BEFORE UPDATE ON facility_maintenance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
