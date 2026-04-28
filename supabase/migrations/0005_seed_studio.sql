-- ===========================================================================
-- Seed: The Sauna Guys (Tampa) — single studio + location, default settings.
-- Idempotent: safe to re-run.
-- ===========================================================================

INSERT INTO studios (id, name, slug, timezone, tax_rate, currency)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'The Sauna Guys',
  'the-sauna-guys',
  'America/New_York',
  0.0425,
  'USD'
)
ON CONFLICT (id) DO UPDATE
  SET name      = EXCLUDED.name,
      slug      = EXCLUDED.slug,
      timezone  = EXCLUDED.timezone,
      tax_rate  = EXCLUDED.tax_rate,
      currency  = EXCLUDED.currency;

INSERT INTO locations (id, studio_id, name, address, city, state, postal_code)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Tampa',
  NULL,
  'Tampa',
  'FL',
  NULL
)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name;

INSERT INTO settings (studio_id, key, value)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'cancellation_policy_hours', '12'::JSONB),
  ('11111111-1111-1111-1111-111111111111', 'late_cancel_fee_cents',     '500'::JSONB),
  ('11111111-1111-1111-1111-111111111111', 'no_show_fee_cents',         '500'::JSONB),
  ('11111111-1111-1111-1111-111111111111', 'booking_window_days',       '14'::JSONB),
  ('11111111-1111-1111-1111-111111111111', 'tax_rate',                  '0.0425'::JSONB)
ON CONFLICT (studio_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
