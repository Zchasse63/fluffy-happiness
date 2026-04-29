-- ===========================================================================
-- Meridian — case-insensitive email uniqueness + FK index coverage.
-- ===========================================================================
-- 1. Profiles email is matched case-insensitively in
--    `app/auth/callback/route.ts` (link-by-email after a verified
--    magic link). The existing `idx_profiles_email` is on LOWER(email)
--    but only enforces a non-unique index. A unique constraint on
--    (studio_id, LOWER(email)) prevents two profiles from sharing an
--    email and racing the linker into ambiguity.
--
-- 2. Several FK columns on hot-path tables had no index, which means
--    sequential scans on join + RLS checks. Index every FK that the
--    code (or RLS qual) joins through.
-- ===========================================================================

-- 1. Email uniqueness — partial UNIQUE so the rule applies only when
-- email is set. NULL emails (corporate seats, anonymized) stay free.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_studio_lower_email_uniq
  ON profiles (studio_id, LOWER(email))
  WHERE email IS NOT NULL;

-- 2. FK indexes that didn't exist before.
CREATE INDEX IF NOT EXISTS idx_transactions_member_id
  ON transactions (member_id) WHERE member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_class_instance_id
  ON transactions (class_instance_id) WHERE class_instance_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_campaign_id
  ON transactions (campaign_id) WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_class_instance_id
  ON bookings (class_instance_id);

CREATE INDEX IF NOT EXISTS idx_class_instances_program_id
  ON class_instances (program_id) WHERE program_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_class_instances_trainer_id
  ON class_instances (trainer_id) WHERE trainer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_class_instances_location_id
  ON class_instances (location_id) WHERE location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_members_plan_id
  ON members (plan_id) WHERE plan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_members_profile_id
  ON members (profile_id);

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to
  ON leads (assigned_to) WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_campaign_id
  ON leads (campaign_id) WHERE campaign_id IS NOT NULL;
