-- ===========================================================================
-- Drop redundant _studio_isolation (SELECT) policies — _studio_write
-- (FOR ALL) already covers SELECT. Two permissive policies on the same
-- role/action force Postgres to evaluate both, doubling RLS overhead
-- (Supabase performance advisor `multiple_permissive_policies`).
-- ===========================================================================

DO $$
DECLARE
  tbl TEXT;
  policy_name TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'locations','profiles','programs','trainers',
    'members','class_templates','class_instances','bookings','transactions',
    'credit_ledger','credit_packs','leads','activity_log',
    'campaigns','campaign_recipients','automation_flows','automation_enrollments',
    'content_posts','ai_briefings','ai_insights','ai_cache','kpi_cache'
  ])
  LOOP
    policy_name := tbl || '_studio_isolation';
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', policy_name, tbl);
  END LOOP;
END $$;
