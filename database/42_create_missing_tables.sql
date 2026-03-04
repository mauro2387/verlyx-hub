-- ============================================
-- Migration 42: Create 9 missing tables/views
-- ============================================
-- These tables are used by the frontend but never created:
--   1. goals                    → /goals, enterprise-helpers
--   2. automations              → /automations, enterprise-helpers
--   3. automation_steps         → enterprise-helpers (FK automations)
--   4. automation_logs          → enterprise-helpers (FK automations)
--   5. team_members             → /team, enterprise-helpers
--   6. team_member_hours        → enterprise-helpers (FK team_members)
--   7. team_member_payments     → enterprise-helpers (FK team_members)
--   8. contact_crm_summary     → /clients/[id], supabase.ts (VIEW)
--   9. pending_follow_ups      → dashboard, CRM (VIEW)
--
-- Tables 8 and 9 are views defined in migration 38/39 but
-- included here for completeness if those weren't run.
-- ============================================

-- =============================================
-- ENUM TYPES (safe: skip if already exist)
-- =============================================

DO $$ BEGIN
    CREATE TYPE automation_trigger AS ENUM (
        'deal_stage_changed',
        'task_completed',
        'contact_created',
        'payment_received',
        'manual',
        'scheduled',
        'webhook'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE automation_action AS ENUM (
        'send_email',
        'create_task',
        'update_field',
        'send_notification',
        'create_activity',
        'webhook',
        'delay',
        'condition'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE member_type AS ENUM (
        'partner', 'employee', 'contractor', 'freelancer', 'intern'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE member_status AS ENUM (
        'active', 'inactive', 'pending', 'on_leave', 'terminated'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE contract_type AS ENUM (
        'permanent', 'temporary', 'project', 'hourly', 'commission'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =============================================
-- 1. GOALS
-- =============================================

CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50) NOT NULL,       -- revenue, deals_won, projects_completed, custom
    target_value DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) DEFAULT 0,
    period_type VARCHAR(20) NOT NULL,     -- daily, weekly, monthly, quarterly, yearly
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',  -- active, achieved, failed, cancelled
    achieved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_active ON goals(status) WHERE status = 'active';


-- =============================================
-- 2. AUTOMATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type automation_trigger NOT NULL,
    trigger_conditions JSONB DEFAULT '{}'::jsonb,
    schedule_cron VARCHAR(100),
    schedule_timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
    is_active BOOLEAN DEFAULT TRUE,
    run_count INTEGER DEFAULT 0,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automations_user ON automations(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_trigger ON automations(trigger_type) WHERE is_active = TRUE;


-- =============================================
-- 3. AUTOMATION_STEPS
-- =============================================

CREATE TABLE IF NOT EXISTS automation_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL DEFAULT 0,
    parent_step_id UUID REFERENCES automation_steps(id),
    action_type automation_action NOT NULL,
    action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    delay_minutes INTEGER,
    condition_field VARCHAR(100),
    condition_operator VARCHAR(20),
    condition_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_steps_automation ON automation_steps(automation_id);


-- =============================================
-- 4. AUTOMATION_LOGS
-- =============================================

CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    trigger_entity_type VARCHAR(50),
    trigger_entity_id UUID,
    status VARCHAR(20) NOT NULL,  -- success, failed, skipped
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    steps_completed INTEGER DEFAULT 0,
    error_message TEXT,
    execution_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_automation ON automation_logs(automation_id);


-- =============================================
-- 5. TEAM_MEMBERS
-- =============================================

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    member_type member_type NOT NULL DEFAULT 'employee',
    status member_status NOT NULL DEFAULT 'pending',
    contract_type contract_type NOT NULL DEFAULT 'permanent',
    job_title VARCHAR(150),
    department VARCHAR(100),
    start_date DATE,
    end_date DATE,
    currency VARCHAR(3) DEFAULT 'MXN',
    salary DECIMAL(15,2),
    salary_type VARCHAR(20) DEFAULT 'monthly',
    hourly_rate DECIMAL(10,2),
    commission_percent DECIMAL(5,2),
    has_system_access BOOLEAN DEFAULT FALSE,
    linked_user_id UUID,
    permissions JSONB DEFAULT '{
        "can_view_projects": true,
        "can_edit_projects": false,
        "can_view_finances": false,
        "can_view_clients": true,
        "can_edit_clients": false,
        "can_manage_tasks": true
    }'::jsonb,
    address TEXT,
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(50),
    documents JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_members_type ON team_members(member_type);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(user_id, status) WHERE status = 'active';


-- =============================================
-- 6. TEAM_MEMBER_HOURS
-- =============================================

CREATE TABLE IF NOT EXISTS team_member_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    work_date DATE NOT NULL,
    hours_worked DECIMAL(5,2) NOT NULL DEFAULT 0,
    project_id UUID,
    project_name VARCHAR(255),
    description TEXT,
    hourly_rate DECIMAL(10,2),
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (hours_worked * COALESCE(hourly_rate, 0)) STORED,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_member_hours_member ON team_member_hours(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_hours_date ON team_member_hours(work_date DESC);


-- =============================================
-- 7. TEAM_MEMBER_PAYMENTS
-- =============================================

CREATE TABLE IF NOT EXISTS team_member_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    payment_type VARCHAR(50) NOT NULL DEFAULT 'salary',
    period_start DATE,
    period_end DATE,
    currency VARCHAR(3) DEFAULT 'MXN',
    gross_amount DECIMAL(15,2) NOT NULL,
    deductions DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2) GENERATED ALWAYS AS (gross_amount - deductions) STORED,
    status VARCHAR(20) DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_member_payments_member ON team_member_payments(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_payments_status ON team_member_payments(status);


-- =============================================
-- 8 & 9. VIEWS (contact_crm_summary, pending_follow_ups)
-- Only created if they don't already exist (migration 38 may have created them)
-- =============================================

DROP VIEW IF EXISTS public.contact_crm_summary;
CREATE VIEW public.contact_crm_summary AS
SELECT
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.company,
    c.type,
    c.status,
    c.my_company_id,
    c.user_id,
    c.created_at,
    c.updated_at,
    -- Lead score
    COALESCE(ls.score, 0) AS lead_score,
    COALESCE(ls.engagement_score, 0) AS engagement_score,
    -- Activity counts
    COALESCE(act.activity_count, 0) AS total_activities,
    act.last_activity_at,
    -- Deal info
    COALESCE(d.deal_count, 0) AS total_deals,
    COALESCE(d.total_deal_value, 0) AS total_deal_value,
    COALESCE(d.won_deals, 0) AS won_deals,
    -- Follow-up
    fu.next_follow_up_date,
    fu.follow_up_type AS next_follow_up_type
FROM contacts c
LEFT JOIN LATERAL (
    SELECT score, engagement_score
    FROM lead_scores
    WHERE contact_id = c.id
    ORDER BY calculated_at DESC
    LIMIT 1
) ls ON TRUE
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS activity_count, MAX(activity_date) AS last_activity_at
    FROM crm_activities
    WHERE contact_id = c.id
) act ON TRUE
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS deal_count,
           SUM(COALESCE(value, amount, 0)) AS total_deal_value,
           COUNT(*) FILTER (WHERE stage = 'won') AS won_deals
    FROM deals
    WHERE client_id = c.id
) d ON TRUE
LEFT JOIN LATERAL (
    SELECT follow_up_date AS next_follow_up_date, follow_up_type
    FROM follow_ups
    WHERE contact_id = c.id AND status = 'pending'
    ORDER BY follow_up_date ASC
    LIMIT 1
) fu ON TRUE;


DROP VIEW IF EXISTS public.pending_follow_ups;
CREATE VIEW public.pending_follow_ups AS
SELECT
    f.id,
    f.contact_id,
    f.follow_up_date,
    f.follow_up_type,
    f.notes,
    f.status,
    f.my_company_id,
    f.assigned_to,
    c.first_name || ' ' || COALESCE(c.last_name, '') AS contact_name,
    c.email AS contact_email,
    c.phone AS contact_phone,
    c.type AS contact_type,
    CASE
        WHEN f.follow_up_date < NOW() THEN 'overdue'
        WHEN f.follow_up_date < NOW() + INTERVAL '24 hours' THEN 'urgent'
        WHEN f.follow_up_date < NOW() + INTERVAL '7 days' THEN 'upcoming'
        ELSE 'scheduled'
    END AS urgency
FROM follow_ups f
JOIN contacts c ON c.id = f.contact_id
WHERE f.status = 'pending';


-- =============================================
-- RLS FOR ALL 7 TABLES
-- =============================================

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (safe re-run)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
            'goals', 'automations', 'automation_steps', 'automation_logs',
            'team_members', 'team_member_hours', 'team_member_payments'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- user_id scoped policies
CREATE POLICY "goals_user_access" ON goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "automations_user_access" ON automations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "team_members_user_access" ON team_members FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "team_member_hours_user_access" ON team_member_hours FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "team_member_payments_user_access" ON team_member_payments FOR ALL USING (auth.uid() = user_id);

-- FK-scoped policies (through parent table)
CREATE POLICY "automation_steps_access" ON automation_steps FOR ALL
    USING (automation_id IN (SELECT id FROM automations WHERE user_id = auth.uid()));
CREATE POLICY "automation_logs_access" ON automation_logs FOR ALL
    USING (automation_id IN (SELECT id FROM automations WHERE user_id = auth.uid()));


-- =============================================
-- TRIGGERS
-- =============================================

-- update_timestamp function should already exist; create if not
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_goals_timestamp') THEN
        CREATE TRIGGER update_goals_timestamp BEFORE UPDATE ON goals
            FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_automations_timestamp') THEN
        CREATE TRIGGER update_automations_timestamp BEFORE UPDATE ON automations
            FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_team_members_timestamp') THEN
        CREATE TRIGGER update_team_members_timestamp BEFORE UPDATE ON team_members
            FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    END IF;
END $$;


-- =============================================
-- VERIFY
-- =============================================

DO $$
DECLARE
    tbl_count INTEGER;
    view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tbl_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'goals', 'automations', 'automation_steps', 'automation_logs',
        'team_members', 'team_member_hours', 'team_member_payments'
      );

    SELECT COUNT(*) INTO view_count
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name IN ('contact_crm_summary', 'pending_follow_ups');

    RAISE NOTICE '✅ Tables created: %/7', tbl_count;
    RAISE NOTICE '✅ Views created: %/2', view_count;

    IF tbl_count = 7 AND view_count = 2 THEN
        RAISE NOTICE '✅ All 9 missing objects are now in the schema';
    ELSE
        RAISE WARNING '⚠️ Expected 7 tables + 2 views, got % + %', tbl_count, view_count;
    END IF;
END $$;
