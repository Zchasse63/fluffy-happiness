-- =========================================================================
-- Schemas for the remaining modules: facilities + waivers + retail products
-- + gift cards. Each is studio-scoped with RLS by current_studio_id().
-- =========================================================================

-- ─── Facilities (resources + maintenance log) ─────────────────────────

CREATE TABLE IF NOT EXISTS facility_resources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id    UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  location_id  UUID REFERENCES locations(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'sauna',
  capacity     INTEGER NOT NULL DEFAULT 1,
  status       TEXT NOT NULL DEFAULT 'live'
                 CHECK (status IN ('live', 'maintenance', 'offline', 'retired')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, name)
);

CREATE INDEX IF NOT EXISTS idx_facility_resources_studio
  ON facility_resources(studio_id, status);

CREATE TABLE IF NOT EXISTS facility_maintenance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id       UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  resource_id     UUID NOT NULL REFERENCES facility_resources(id) ON DELETE CASCADE,
  performed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_service_at TIMESTAMPTZ,
  kind            TEXT NOT NULL DEFAULT 'service',
  performed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facility_maintenance_resource
  ON facility_maintenance(resource_id, performed_at DESC);

-- ─── Waivers ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS waiver_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id    UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  version      TEXT NOT NULL DEFAULT 'v1',
  body         TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, name, version)
);

CREATE TABLE IF NOT EXISTS member_waivers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id       UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  template_id     UUID NOT NULL REFERENCES waiver_templates(id) ON DELETE RESTRICT,
  signed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  signed_signature TEXT,
  ip_address      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, member_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_member_waivers_studio_expires
  ON member_waivers(studio_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_member_waivers_member
  ON member_waivers(member_id);

-- ─── Retail products ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS retail_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id       UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'merch',
  sku             TEXT,
  price_cents     INTEGER NOT NULL,
  cost_cents      INTEGER NOT NULL DEFAULT 0,
  inventory       INTEGER NOT NULL DEFAULT 0,
  reorder_threshold INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, name)
);

CREATE INDEX IF NOT EXISTS idx_retail_products_studio
  ON retail_products(studio_id, is_active);

-- ─── Gift cards ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gift_cards (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id         UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  code              TEXT NOT NULL,
  recipient_name    TEXT,
  recipient_email   TEXT,
  amount_cents      INTEGER NOT NULL,
  balance_cents     INTEGER NOT NULL,
  issued_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  redeemed_by_member UUID REFERENCES members(id) ON DELETE SET NULL,
  issued_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'redeemed', 'expired', 'voided')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, code)
);

CREATE INDEX IF NOT EXISTS idx_gift_cards_studio_status
  ON gift_cards(studio_id, status);

-- ─── RLS + updated_at triggers ────────────────────────────────────────

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'facility_resources','facility_maintenance',
    'waiver_templates','member_waivers',
    'retail_products','gift_cards'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format(
      'DROP POLICY IF EXISTS %I_studio_write ON %I;',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I_studio_write ON %I FOR ALL USING (studio_id = current_studio_id()) WITH CHECK (studio_id = current_studio_id());',
      tbl, tbl
    );
  END LOOP;
END $$;

CREATE OR REPLACE TRIGGER set_facility_resources_updated_at
  BEFORE UPDATE ON facility_resources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_waiver_templates_updated_at
  BEFORE UPDATE ON waiver_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_retail_products_updated_at
  BEFORE UPDATE ON retail_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER set_gift_cards_updated_at
  BEFORE UPDATE ON gift_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
