-- ===========================================================================
-- RLS policies — every tenant table is isolated by studio_id, with stricter
-- policies for sensitive admin tables. All policies use auth.uid() resolved
-- through the profiles table; a JWT custom claim "studio_id" is honored as
-- a fallback for service contexts.
-- ===========================================================================

-- Helper: resolve current studio from JWT or from profiles row
CREATE OR REPLACE FUNCTION current_studio_id() RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claim.studio_id', true))::UUID,
    (SELECT p.studio_id FROM profiles p WHERE p.auth_user_id = auth.uid() LIMIT 1)
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION current_user_roles() RETURNS TEXT[] AS $$
  SELECT COALESCE(
    (SELECT roles FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1),
    ARRAY[]::TEXT[]
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT current_user_roles() && ARRAY['owner','manager'];
$$ LANGUAGE SQL STABLE;

-- Enable RLS on every tenant table -----------------------------------------

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'studios','locations','profiles','programs','trainers','membership_plans',
    'members','class_templates','class_instances','bookings','transactions',
    'credit_ledger','credit_packs','leads','activity_log','settings',
    'glofox_sync_state','glofox_sync_conflicts'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END $$;

-- studios — owner can read their own studio --------------------------------
CREATE POLICY studios_isolation ON studios
  FOR SELECT USING (id = current_studio_id());
CREATE POLICY studios_admin_write ON studios
  FOR UPDATE USING (id = current_studio_id() AND is_admin())
  WITH CHECK (id = current_studio_id() AND is_admin());

-- Generic studio_id isolation for the bulk of tables -----------------------
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'locations','profiles','programs','trainers','membership_plans',
    'members','class_templates','class_instances','bookings','transactions',
    'credit_ledger','credit_packs','leads','activity_log','settings'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY %I_studio_isolation ON %I FOR SELECT USING (studio_id = current_studio_id());',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I_studio_write ON %I FOR ALL USING (studio_id = current_studio_id()) WITH CHECK (studio_id = current_studio_id());',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Tighter policies for admin-sensitive tables ------------------------------
-- Override the generic write policy: only owner/manager may mutate.
DROP POLICY IF EXISTS membership_plans_studio_write ON membership_plans;
CREATE POLICY membership_plans_admin_write ON membership_plans
  FOR ALL USING (studio_id = current_studio_id() AND is_admin())
  WITH CHECK (studio_id = current_studio_id() AND is_admin());

DROP POLICY IF EXISTS settings_studio_write ON settings;
CREATE POLICY settings_admin_write ON settings
  FOR ALL USING (studio_id = current_studio_id() AND is_admin())
  WITH CHECK (studio_id = current_studio_id() AND is_admin());

-- Sync state — admin only (read + write) -----------------------------------
CREATE POLICY sync_state_admin_read ON glofox_sync_state
  FOR SELECT USING (studio_id = current_studio_id() AND is_admin());
CREATE POLICY sync_state_admin_write ON glofox_sync_state
  FOR ALL USING (studio_id = current_studio_id() AND is_admin())
  WITH CHECK (studio_id = current_studio_id() AND is_admin());

CREATE POLICY sync_conflicts_admin_read ON glofox_sync_conflicts
  FOR SELECT USING (studio_id = current_studio_id() AND is_admin());
CREATE POLICY sync_conflicts_admin_write ON glofox_sync_conflicts
  FOR ALL USING (studio_id = current_studio_id() AND is_admin())
  WITH CHECK (studio_id = current_studio_id() AND is_admin());
