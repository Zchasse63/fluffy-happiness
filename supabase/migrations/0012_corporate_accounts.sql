-- =========================================================================
-- Corporate accounts (B2B) + linkage from members.
-- A corporate account aggregates its sponsored memberships and event-style
-- group bookings. Member.corporate_account_id is nullable — most members
-- are individuals.
-- =========================================================================

CREATE TABLE IF NOT EXISTS corporate_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id       UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'paused', 'cancelled')),
  monthly_fee_cents INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, name)
);

CREATE INDEX IF NOT EXISTS idx_corporate_accounts_studio
  ON corporate_accounts(studio_id, status);

-- Add the linkage column to members. Idempotent.
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS corporate_account_id UUID
    REFERENCES corporate_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_members_corporate
  ON members(corporate_account_id)
  WHERE corporate_account_id IS NOT NULL;

ALTER TABLE corporate_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS corporate_accounts_studio_write ON corporate_accounts;
CREATE POLICY corporate_accounts_studio_write
  ON corporate_accounts FOR ALL
  USING (studio_id = current_studio_id())
  WITH CHECK (studio_id = current_studio_id());

CREATE OR REPLACE TRIGGER set_corporate_accounts_updated_at
  BEFORE UPDATE ON corporate_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
