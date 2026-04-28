-- ===========================================================================
-- Marketing + AI tables (Phase R0.6 — port of phase2 + phase3 migrations
-- from the original repo).
-- ===========================================================================

-- ─── Campaigns ─────────────────────────────────────────────────────────

CREATE TABLE campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id       UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','scheduled','sending','sent','paused','cancelled')),
  channel         TEXT NOT NULL DEFAULT 'email'
                    CHECK (channel IN ('email','sms','both')),
  segment_id      TEXT,
  subject         TEXT,
  body_html       TEXT,
  body_text       TEXT,
  sms_body        TEXT,
  ab_variants     JSONB,
  scheduled_for   TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count      INTEGER NOT NULL DEFAULT 0,
  open_count      INTEGER NOT NULL DEFAULT 0,
  click_count     INTEGER NOT NULL DEFAULT 0,
  bounce_count    INTEGER NOT NULL DEFAULT 0,
  conversion_count INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE campaign_recipients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id     UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  member_id     UUID REFERENCES members(id) ON DELETE SET NULL,
  email         TEXT NOT NULL,
  variant       TEXT,
  status        TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','sent','delivered','opened','clicked','bounced','complained','converted')),
  sent_at       TIMESTAMPTZ,
  opened_at     TIMESTAMPTZ,
  clicked_at    TIMESTAMPTZ,
  bounced_at    TIMESTAMPTZ,
  resend_message_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id, status);
CREATE INDEX idx_campaign_recipients_member ON campaign_recipients(member_id);
CREATE INDEX idx_campaigns_studio_status ON campaigns(studio_id, status);

-- ─── Automations ──────────────────────────────────────────────────────

CREATE TABLE automation_flows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id     UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  trigger       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','paused','draft')),
  steps         JSONB NOT NULL DEFAULT '[]',
  exit_conditions JSONB NOT NULL DEFAULT '{}',
  cooldown_days INTEGER NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE automation_enrollments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id     UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  flow_id       UUID NOT NULL REFERENCES automation_flows(id) ON DELETE CASCADE,
  member_id     UUID REFERENCES members(id) ON DELETE CASCADE,
  current_step  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','completed','exited','paused')),
  enrolled_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  exit_reason   TEXT,
  state         JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_automation_enroll_flow ON automation_enrollments(flow_id, status);
CREATE INDEX idx_automation_enroll_member ON automation_enrollments(member_id);

-- ─── Content ──────────────────────────────────────────────────────────

CREATE TABLE content_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id     UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  url           TEXT,
  published_at  TIMESTAMPTZ,
  impressions   INTEGER NOT NULL DEFAULT 0,
  reactions     INTEGER NOT NULL DEFAULT 0,
  saves         INTEGER NOT NULL DEFAULT 0,
  clicks        INTEGER NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AI tables ───────────────────────────────────────────────────────

CREATE TABLE ai_briefings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id     UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date          DATE NOT NULL,
  insights      JSONB NOT NULL,
  model         TEXT,
  UNIQUE (studio_id, date)
);

CREATE TABLE ai_insights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id     UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  rank          TEXT NOT NULL CHECK (rank IN ('P1','P2','P3','P4')),
  tone          TEXT NOT NULL CHECK (tone IN ('neg','warn','info','pos')),
  kicker        TEXT NOT NULL,
  headline      TEXT NOT NULL,
  body          TEXT,
  data          JSONB NOT NULL DEFAULT '{}',
  href          TEXT,
  confidence    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','acted','dismissed','expired')),
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ
);

CREATE INDEX idx_ai_insights_studio_status ON ai_insights(studio_id, status, generated_at DESC);

CREATE TABLE ai_cache (
  cache_key     TEXT PRIMARY KEY,
  studio_id     UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  payload       JSONB NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_cache_expires ON ai_cache(expires_at);

-- ─── KPI cache for analytics ─────────────────────────────────────────

CREATE TABLE kpi_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id     UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  bucket        TEXT NOT NULL,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  metrics       JSONB NOT NULL,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (studio_id, bucket, period_start, period_end)
);

-- ─── Triggers + RLS for new tables ───────────────────────────────────

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'campaigns','campaign_recipients','automation_flows','automation_enrollments',
    'content_posts','ai_briefings','ai_insights','ai_cache','kpi_cache'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
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

-- updated_at triggers for tables that have an updated_at column
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'campaigns','automation_flows','content_posts'
  ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;
