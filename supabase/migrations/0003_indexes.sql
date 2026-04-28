-- ===========================================================================
-- Indexes — chosen for the queries we know we'll run (sync upserts, RLS
-- isolation, hot-path reads on the Command Center).
-- ===========================================================================

-- Sync lookups (partial — glofox_id is nullable for native-only records)
CREATE INDEX idx_profiles_glofox_id          ON profiles(glofox_id) WHERE glofox_id IS NOT NULL;
CREATE INDEX idx_members_glofox_id           ON members(glofox_id) WHERE glofox_id IS NOT NULL;
CREATE INDEX idx_class_instances_glofox_id   ON class_instances(glofox_id) WHERE glofox_id IS NOT NULL;
CREATE INDEX idx_class_templates_glofox_id   ON class_templates(glofox_id) WHERE glofox_id IS NOT NULL;
CREATE INDEX idx_bookings_glofox_id          ON bookings(glofox_id) WHERE glofox_id IS NOT NULL;
CREATE INDEX idx_transactions_glofox_id      ON transactions(glofox_id) WHERE glofox_id IS NOT NULL;
CREATE INDEX idx_leads_glofox_id             ON leads(glofox_id) WHERE glofox_id IS NOT NULL;
CREATE INDEX idx_membership_plans_glofox_id  ON membership_plans(glofox_id) WHERE glofox_id IS NOT NULL;
CREATE INDEX idx_credit_packs_glofox_id      ON credit_packs(glofox_id) WHERE glofox_id IS NOT NULL;
CREATE INDEX idx_programs_glofox_id          ON programs(glofox_id) WHERE glofox_id IS NOT NULL;
CREATE INDEX idx_trainers_glofox_id          ON trainers(glofox_id) WHERE glofox_id IS NOT NULL;

-- Auth lookups
CREATE INDEX idx_profiles_auth_user_id       ON profiles(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX idx_profiles_email              ON profiles(LOWER(email)) WHERE email IS NOT NULL;

-- Hot reads
CREATE INDEX idx_bookings_member_status      ON bookings(member_id, status);
CREATE INDEX idx_bookings_class_instance     ON bookings(class_instance_id, status);
CREATE INDEX idx_class_instances_starts_at   ON class_instances(studio_id, starts_at DESC);
CREATE INDEX idx_class_instances_template    ON class_instances(template_id, starts_at);
CREATE INDEX idx_credit_ledger_member        ON credit_ledger(member_id, credit_type, created_at DESC);
CREATE INDEX idx_transactions_member_created ON transactions(member_id, occurred_at DESC);
CREATE INDEX idx_transactions_studio_created ON transactions(studio_id, occurred_at DESC);
CREATE INDEX idx_members_status_studio       ON members(membership_status, studio_id);
CREATE INDEX idx_activity_log_studio_created ON activity_log(studio_id, created_at DESC);
CREATE INDEX idx_leads_status_studio         ON leads(studio_id, status);

-- RLS performance — gin on roles array
CREATE INDEX idx_profiles_studio_roles       ON profiles USING GIN (roles);
