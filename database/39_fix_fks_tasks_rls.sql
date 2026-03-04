-- ============================================================
-- MIGRATION 39: FIX DUPLICATE FKs + ADD MISSING TASK COLUMNS + RLS
-- ============================================================
-- 1. Remove duplicate foreign key constraints
-- 2. Add missing columns to tasks table
-- 3. Enable RLS on all existing tables
-- ============================================================

-- ============================================================
-- 1. DROP DUPLICATE FOREIGN KEYS
-- ============================================================
-- These have the pattern fk_* that duplicate the standard *_fkey constraints

-- contact_activities
ALTER TABLE public.contact_activities DROP CONSTRAINT IF EXISTS fk_contact_activities_deal;
ALTER TABLE public.contact_activities DROP CONSTRAINT IF EXISTS fk_contact_activities_project;
ALTER TABLE public.contact_activities DROP CONSTRAINT IF EXISTS fk_contact_activities_task;

-- documents
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS fk_documents_project;
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS fk_documents_contact;

-- contact_segment_members
ALTER TABLE public.contact_segment_members DROP CONSTRAINT IF EXISTS fk_segment_members_segment;
ALTER TABLE public.contact_segment_members DROP CONSTRAINT IF EXISTS fk_segment_members_contact;

-- scheduled_communications
ALTER TABLE public.scheduled_communications DROP CONSTRAINT IF EXISTS fk_scheduled_comm_contact;
ALTER TABLE public.scheduled_communications DROP CONSTRAINT IF EXISTS fk_scheduled_comm_segment;

-- lead_score_history
ALTER TABLE public.lead_score_history DROP CONSTRAINT IF EXISTS fk_lead_score_history_rule;
ALTER TABLE public.lead_score_history DROP CONSTRAINT IF EXISTS fk_lead_score_history_activity;

-- ============================================================
-- 2. ADD MISSING COLUMNS TO TASKS TABLE
-- ============================================================
-- The TypeScript Task interface expects these but the DB doesn't have them

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_task_id uuid;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deal_id uuid;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS blocked_reason text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS progress_percentage integer DEFAULT 0;

-- Add foreign keys for new columns
DO $$ BEGIN
  ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_parent_task_id_fkey
    FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_deal_id_fkey
    FOREIGN KEY (deal_id) REFERENCES public.deals(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES public.contacts(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);

-- ============================================================
-- 3. ENABLE RLS ON ALL EXISTING TABLES
-- ============================================================
-- Enable RLS (idempotent — won't fail if already enabled)

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.my_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospecting_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

-- 4a. SECURITY DEFINER helper — bypasses RLS to avoid recursion
-- All policies call this instead of querying my_companies directly
CREATE OR REPLACE FUNCTION public.get_user_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.my_companies WHERE user_id = auth.uid()
  UNION
  SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND is_active = true;
$$;

-- 4b. Drop ALL pre-existing policies on every table (from earlier migrations)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- 4c. Company-scoped tables (my_company_id)
DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'accounts', 'budgets', 'categories', 'contact_activities',
    'contact_lead_scores', 'contact_segments', 'contacts',
    'expenses', 'incomes', 'lead_activities', 'leads',
    'opportunities', 'opportunity_activities', 'onboarding_items',
    'prospecting_campaigns', 'recurring_payment_schedules',
    'scheduled_communications', 'transactions', 'workspaces',
    'ai_request_logs', 'ai_usage_summary',
    'lead_scoring_rules'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY rls_company_access ON public.%I
       FOR ALL USING (
         my_company_id IN (SELECT public.get_user_company_ids())
       )', tbl
    );
  END LOOP;
END $$;

-- 4d. User-scoped tables (user_id)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'calendar_events', 'documents', 'generated_pdfs',
    'notifications', 'pdf_templates', 'subscriptions'
  ])
  LOOP
    EXECUTE format(
      'CREATE POLICY rls_user_access ON public.%I
       FOR ALL USING (user_id = auth.uid())', tbl
    );
  END LOOP;
END $$;

-- my_companies: direct ownership (no subquery on self — avoids recursion)
CREATE POLICY rls_own_companies ON public.my_companies
  FOR ALL USING (
    user_id = auth.uid()
    OR id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() AND is_active = true)
  );

-- profiles
CREATE POLICY rls_own_profile ON public.profiles
  FOR ALL USING (id = auth.uid());

-- deals: user + company
CREATE POLICY rls_deals_access ON public.deals
  FOR ALL USING (
    user_id = auth.uid()
    OR my_company_id IN (SELECT public.get_user_company_ids())
  );

-- projects: user + company
CREATE POLICY rls_projects_access ON public.projects
  FOR ALL USING (
    user_id = auth.uid()
    OR my_company_id IN (SELECT public.get_user_company_ids())
  );

-- tasks: user + company
CREATE POLICY rls_tasks_access ON public.tasks
  FOR ALL USING (
    user_id = auth.uid()
    OR my_company_id IN (SELECT public.get_user_company_ids())
  );

-- company_users
CREATE POLICY rls_company_users ON public.company_users
  FOR ALL USING (user_id = auth.uid());

-- contact_segment_members: via segment
CREATE POLICY rls_segment_members ON public.contact_segment_members
  FOR ALL USING (
    segment_id IN (
      SELECT cs.id FROM public.contact_segments cs
      WHERE cs.my_company_id IN (SELECT public.get_user_company_ids())
    )
  );

-- notification_preferences
CREATE POLICY rls_notification_prefs ON public.notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- audit_logs
CREATE POLICY rls_audit_logs ON public.audit_logs
  FOR ALL USING (
    user_id = auth.uid()
    OR company_id IN (SELECT public.get_user_company_ids())
  );

-- pages: creator + public + workspace company
CREATE POLICY rls_pages_access ON public.pages
  FOR ALL USING (
    created_by = auth.uid()
    OR is_public = true
    OR workspace_id IN (
      SELECT w.id FROM public.workspaces w
      WHERE w.my_company_id IN (SELECT public.get_user_company_ids())
    )
  );

-- blocks: via page
CREATE POLICY rls_blocks_access ON public.blocks
  FOR ALL USING (
    page_id IN (SELECT id FROM public.pages WHERE created_by = auth.uid() OR is_public = true)
  );

-- AI tables (global read for models/rules, scoped for user data)
CREATE POLICY rls_ai_models ON public.ai_models
  FOR SELECT USING (true);

CREATE POLICY rls_ai_routing ON public.ai_routing_rules
  FOR SELECT USING (true);

CREATE POLICY rls_ai_convos ON public.ai_conversations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY rls_ai_messages ON public.ai_messages
  FOR ALL USING (
    conversation_id IN (SELECT id FROM public.ai_conversations WHERE user_id = auth.uid())
  );

-- payment_links, payments, refunds: open (webhook access)
CREATE POLICY rls_payment_links ON public.payment_links
  FOR ALL USING (true);

CREATE POLICY rls_payments ON public.payments
  FOR ALL USING (true);

CREATE POLICY rls_refunds ON public.refunds
  FOR ALL USING (true);

-- lead_score_history: via contact_lead_scores → company
CREATE POLICY rls_lead_score_history ON public.lead_score_history
  FOR ALL USING (
    contact_lead_score_id IN (
      SELECT cls.id FROM public.contact_lead_scores cls
      WHERE cls.my_company_id IN (SELECT public.get_user_company_ids())
    )
  );

-- page_versions, page_comments, page_permissions: via page
CREATE POLICY rls_page_versions ON public.page_versions
  FOR ALL USING (
    page_id IN (SELECT id FROM public.pages WHERE created_by = auth.uid() OR is_public = true)
  );

CREATE POLICY rls_page_comments ON public.page_comments
  FOR ALL USING (
    page_id IN (SELECT id FROM public.pages WHERE created_by = auth.uid() OR is_public = true)
  );

CREATE POLICY rls_page_permissions ON public.page_permissions
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- DONE
-- ============================================================
-- 1. Removed 10 duplicate FK constraints
-- 2. Added 6 missing columns to tasks
-- 3. Enabled RLS on ALL 45+ tables
-- 4. Created SECURITY DEFINER helper to avoid recursion
-- 5. Dropped ALL pre-existing policies, created clean ones for every table
