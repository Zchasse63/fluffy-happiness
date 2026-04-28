-- ===========================================================================
-- Meridian — Initial schema (Phase R0 foundation, per rebuild-handoff §6)
-- ===========================================================================
-- Glofox is the source of truth for all imported entities. Every imported
-- record carries `glofox_id` (unique within studio) so the sync engine can
-- upsert idempotently. Mutable Meridian-side records add `glofox_write_status`
-- to track write-back state.
--
-- Conventions:
-- * Every tenant-owned table has `studio_id UUID NOT NULL` for RLS isolation.
-- * Timestamps use TIMESTAMPTZ + DEFAULT NOW().
-- * Enum-like columns use CHECK constraints ONLY when the value set is truly
--   fixed (booking status, campaign status). Extensible enums (activity_log
--   types) are validated at the API layer with Zod.
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ───── Tenancy roots ──────────────────────────────────────────────────────

CREATE TABLE studios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  timezone    TEXT NOT NULL DEFAULT 'America/New_York',
  tax_rate    NUMERIC(5,4) NOT NULL DEFAULT 0.0425,
  currency    TEXT NOT NULL DEFAULT 'USD',
  settings    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id   UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  glofox_id   TEXT,
  name        TEXT NOT NULL,
  address     TEXT,
  city        TEXT,
  state       TEXT,
  postal_code TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, glofox_id)
);

-- ───── Identity ───────────────────────────────────────────────────────────
-- profiles is the canonical user record. Linked 1:1 to auth.users for staff;
-- members may exist as profiles without an auth user (guest accounts).

CREATE TABLE profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id     UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  auth_user_id  UUID UNIQUE,
  glofox_id     TEXT,
  email         TEXT,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  roles         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  acquisition_source TEXT,
  acquisition_campaign_id UUID,
  metadata      JSONB NOT NULL DEFAULT '{}',
  glofox_synced_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, glofox_id)
);

-- ───── Programs (replaces hardcoded class type UUIDs) ─────────────────────

CREATE TABLE programs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id    UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  glofox_id    TEXT,
  name         TEXT NOT NULL,
  description  TEXT,
  category     TEXT, -- 'open' | 'guided' | 'cold_plunge' | …
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, glofox_id)
);

-- ───── Trainers ───────────────────────────────────────────────────────────

CREATE TABLE trainers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id             UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  glofox_id             TEXT,
  bio                   TEXT,
  base_pay_per_class_cents INTEGER NOT NULL DEFAULT 0,
  bonus_threshold       NUMERIC(4,2),
  bonus_rate            NUMERIC(4,2),
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, profile_id),
  UNIQUE (studio_id, glofox_id)
);

-- ───── Membership plans (with cross-location + legacy support) ───────────

CREATE TABLE membership_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id           UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  location_id         UUID REFERENCES locations(id) ON DELETE SET NULL,
  glofox_id           TEXT,
  stripe_price_id     TEXT,
  name                TEXT NOT NULL,
  tier                TEXT,
  price_cents         INTEGER NOT NULL,
  billing_interval    TEXT NOT NULL DEFAULT 'month',
  credits_per_cycle   INTEGER,
  guest_passes        INTEGER NOT NULL DEFAULT 0,
  is_cross_location   BOOLEAN NOT NULL DEFAULT FALSE,
  is_legacy           BOOLEAN NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  label               TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, glofox_id)
);

-- ───── Members ────────────────────────────────────────────────────────────
-- Per-member subscription state. Credit balances are denormalized caches
-- rebuilt from the credit_ledger (see migration 0004).

CREATE TABLE members (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id                UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  profile_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  glofox_id                TEXT,
  glofox_subscription_id   TEXT,
  stripe_customer_id       TEXT,
  stripe_subscription_id   TEXT,
  membership_status        TEXT NOT NULL DEFAULT 'active'
                              CHECK (membership_status IN ('active','paused','cancelled','expired','trialing','prospect')),
  membership_tier          TEXT,
  plan_id                  UUID REFERENCES membership_plans(id) ON DELETE SET NULL,
  plan_code                TEXT,
  plan_price_cents         INTEGER,
  pending_plan_id          UUID REFERENCES membership_plans(id) ON DELETE SET NULL,
  pending_change_at        TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  paused_until             TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,
  membership_credits       INTEGER NOT NULL DEFAULT 0,
  flex_credits             INTEGER NOT NULL DEFAULT 0,
  guest_passes_remaining   INTEGER NOT NULL DEFAULT 0,
  wallet_balance_cents     INTEGER NOT NULL DEFAULT 0,
  strike_count             INTEGER NOT NULL DEFAULT 0,
  glofox_write_status      TEXT NOT NULL DEFAULT 'synced'
                              CHECK (glofox_write_status IN ('pending','synced','failed')),
  glofox_synced_at         TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, profile_id),
  UNIQUE (studio_id, glofox_id)
);

-- ───── Class templates + instances (recurring vs one-off) ─────────────────

CREATE TABLE class_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id       UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  location_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
  program_id      UUID REFERENCES programs(id) ON DELETE SET NULL,
  trainer_id      UUID REFERENCES trainers(id) ON DELETE SET NULL,
  glofox_id       TEXT,
  title           TEXT NOT NULL,
  recurrence_days INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[], -- 0=Sun..6=Sat
  start_time      TIME,
  duration_min    INTEGER NOT NULL DEFAULT 60,
  capacity        INTEGER NOT NULL DEFAULT 12,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, glofox_id)
);

CREATE TABLE class_instances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id       UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  template_id     UUID REFERENCES class_templates(id) ON DELETE SET NULL,
  location_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
  program_id      UUID REFERENCES programs(id) ON DELETE SET NULL,
  trainer_id      UUID REFERENCES trainers(id) ON DELETE SET NULL,
  glofox_id       TEXT,
  title           TEXT NOT NULL,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  capacity        INTEGER NOT NULL DEFAULT 12,
  booked_count    INTEGER NOT NULL DEFAULT 0,
  waitlist_count  INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','live','completed','cancelled')),
  is_one_off      BOOLEAN NOT NULL DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, glofox_id)
);

-- ───── Bookings ──────────────────────────────────────────────────────────

CREATE TABLE bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id           UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  class_instance_id   UUID NOT NULL REFERENCES class_instances(id) ON DELETE CASCADE,
  member_id           UUID REFERENCES members(id) ON DELETE SET NULL,
  guest_name          TEXT,
  guest_email         TEXT,
  glofox_id           TEXT,
  status              TEXT NOT NULL DEFAULT 'booked'
                        CHECK (status IN ('booked','checked_in','no_show','cancelled','late_cancelled','waitlisted')),
  source              TEXT NOT NULL DEFAULT 'meridian'
                        CHECK (source IN ('meridian','glofox','classpass','walk_in','staff_added')),
  credit_type_used    TEXT,
  checked_in_at       TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancelled_reason    TEXT,
  glofox_write_status TEXT NOT NULL DEFAULT 'synced'
                        CHECK (glofox_write_status IN ('pending','synced','failed')),
  glofox_synced_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, glofox_id)
);

-- ───── Transactions ──────────────────────────────────────────────────────

CREATE TABLE transactions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id            UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  member_id            UUID REFERENCES members(id) ON DELETE SET NULL,
  class_instance_id    UUID REFERENCES class_instances(id) ON DELETE SET NULL,
  campaign_id          UUID,
  glofox_id            TEXT,
  stripe_payment_intent TEXT,
  stripe_charge_id     TEXT,
  type                 TEXT NOT NULL
                          CHECK (type IN ('membership','class_pack','retail','gift_card','walk_in','refund','adjustment','corporate')),
  status               TEXT NOT NULL DEFAULT 'completed'
                          CHECK (status IN ('pending','completed','failed','refunded','disputed')),
  amount_cents         INTEGER NOT NULL,
  tax_cents            INTEGER NOT NULL DEFAULT 0,
  fee_cents            INTEGER NOT NULL DEFAULT 0,
  net_cents            INTEGER GENERATED ALWAYS AS (amount_cents - fee_cents) STORED,
  currency             TEXT NOT NULL DEFAULT 'USD',
  description          TEXT,
  promo_code           TEXT,
  metadata             JSONB NOT NULL DEFAULT '{}',
  occurred_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, glofox_id)
);

-- ───── Credit ledger (append-only audit trail) ───────────────────────────

CREATE TABLE credit_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id       UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  credit_type     TEXT NOT NULL
                    CHECK (credit_type IN ('membership','flex','guest_pass','wallet')),
  delta           INTEGER NOT NULL,
  balance_after   INTEGER NOT NULL,
  reason          TEXT NOT NULL,
  booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,
  transaction_id  UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───── Credit packs (prepaid bundles) ────────────────────────────────────

CREATE TABLE credit_packs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id          UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  member_id          UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  glofox_id          TEXT,
  pack_type          TEXT NOT NULL,
  credits_total      INTEGER NOT NULL,
  credits_remaining  INTEGER NOT NULL,
  expires_at         TIMESTAMPTZ,
  purchased_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, glofox_id)
);

-- ───── Leads ────────────────────────────────────────────────────────────

CREATE TABLE leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id           UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  glofox_id           TEXT,
  email               TEXT,
  phone               TEXT,
  full_name           TEXT,
  source              TEXT,
  campaign_id         UUID,
  status              TEXT NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new','contacted','trial','converted','lost')),
  score               INTEGER NOT NULL DEFAULT 0,
  assigned_to         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  converted_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  notes               TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, glofox_id)
);

-- ───── Activity log (no CHECK on type — extensible) ─────────────────────

CREATE TABLE activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id     UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  subject_id    UUID,
  subject_type  TEXT,
  type          TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───── Settings (tenant-scoped key/value) ────────────────────────────────

CREATE TABLE settings (
  studio_id   UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (studio_id, key)
);

-- ───── Glofox sync bookkeeping ───────────────────────────────────────────

CREATE TABLE glofox_sync_state (
  studio_id          UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  entity_type        TEXT NOT NULL,
  last_synced_at     TIMESTAMPTZ,
  last_full_sync_at  TIMESTAMPTZ,
  records_synced     INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','running','success','failed')),
  error_message      TEXT,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (studio_id, entity_type)
);

CREATE TABLE glofox_sync_conflicts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id     UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL,
  conflict_type TEXT NOT NULL,
  glofox_data   JSONB,
  meridian_data JSONB,
  resolution    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

-- updated_at triggers --------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'studios','locations','profiles','programs','trainers','membership_plans',
    'members','class_templates','class_instances','bookings','transactions',
    'credit_packs','leads'
  ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;
