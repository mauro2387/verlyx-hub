-- ============================================================
-- MIGRATION 38: CREATE MISSING TABLES
-- ============================================================
-- Creates 5 tables and 2 views that the frontend expects
-- but don't exist in the database.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- 1. PRODUCTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  my_company_id uuid,
  sku character varying,
  name character varying NOT NULL,
  description text,
  product_type character varying NOT NULL DEFAULT 'service'::character varying
    CHECK (product_type::text = ANY (ARRAY['service','product','subscription'])),
  currency character varying NOT NULL DEFAULT 'UYU'::character varying,
  price numeric(12,2) NOT NULL DEFAULT 0,
  cost numeric(12,2) DEFAULT 0,
  unit character varying DEFAULT 'unidad'::character varying,
  tax_rate numeric(5,2) DEFAULT 0,
  tax_included boolean DEFAULT false,
  is_hourly boolean DEFAULT false,
  default_hours numeric,
  category character varying,
  tags text[] DEFAULT '{}'::text[],
  is_active boolean DEFAULT true,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Add company FK if my_companies exists
DO $$ BEGIN
  ALTER TABLE public.products 
    ADD CONSTRAINT products_my_company_id_fkey 
    FOREIGN KEY (my_company_id) REFERENCES public.my_companies(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_my_company_id ON public.products(my_company_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- ============================================================
-- 2. QUOTES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  my_company_id uuid,
  quote_number character varying NOT NULL,
  title character varying NOT NULL,
  status character varying NOT NULL DEFAULT 'draft'::character varying
    CHECK (status::text = ANY (ARRAY['draft','sent','viewed','accepted','rejected','expired','converted'])),
  currency character varying NOT NULL DEFAULT 'UYU'::character varying,
  subtotal numeric(12,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  valid_until date,
  notes text,
  terms text,
  contact_id uuid,
  contact_name character varying,
  contact_email character varying,
  contact_phone character varying,
  contact_company character varying,
  sent_at timestamp with time zone,
  accepted_at timestamp with time zone,
  rejected_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quotes_pkey PRIMARY KEY (id),
  CONSTRAINT quotes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

DO $$ BEGIN
  ALTER TABLE public.quotes 
    ADD CONSTRAINT quotes_my_company_id_fkey 
    FOREIGN KEY (my_company_id) REFERENCES public.my_companies(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.quotes 
    ADD CONSTRAINT quotes_contact_id_fkey 
    FOREIGN KEY (contact_id) REFERENCES public.contacts(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_my_company_id ON public.quotes(my_company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);

-- ============================================================
-- 3. QUOTE ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  product_id uuid,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  discount_percent numeric(5,2) DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 0,
  subtotal numeric(12,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quote_items_pkey PRIMARY KEY (id),
  CONSTRAINT quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE
);

DO $$ BEGIN
  ALTER TABLE public.quote_items 
    ADD CONSTRAINT quote_items_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES public.products(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);

-- ============================================================
-- 4. TIME ENTRIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.time_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  my_company_id uuid,
  project_id uuid,
  task_id uuid,
  project_name character varying,
  task_name character varying,
  description text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  duration_minutes integer NOT NULL DEFAULT 0,
  hourly_rate numeric(10,2),
  currency character varying DEFAULT 'UYU'::character varying,
  is_billable boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT time_entries_pkey PRIMARY KEY (id),
  CONSTRAINT time_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

DO $$ BEGIN
  ALTER TABLE public.time_entries 
    ADD CONSTRAINT time_entries_my_company_id_fkey 
    FOREIGN KEY (my_company_id) REFERENCES public.my_companies(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.time_entries 
    ADD CONSTRAINT time_entries_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES public.projects(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.time_entries 
    ADD CONSTRAINT time_entries_task_id_fkey 
    FOREIGN KEY (task_id) REFERENCES public.tasks(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON public.time_entries(start_time);

-- ============================================================
-- 5. ACTIVE TIMERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.active_timers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  task_id uuid,
  project_name character varying,
  task_name character varying,
  description text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT active_timers_pkey PRIMARY KEY (id),
  CONSTRAINT active_timers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT active_timers_user_unique UNIQUE (user_id)
);

-- ============================================================
-- 6. CONTACT CRM SUMMARY VIEW
-- ============================================================
-- Aggregates contacts + lead scores + activities + deals
DROP VIEW IF EXISTS public.contact_crm_summary;
CREATE OR REPLACE VIEW public.contact_crm_summary AS
SELECT
  c.id,
  c.my_company_id AS user_id, -- aliased for backward compat
  c.my_company_id,
  TRIM(CONCAT(c.first_name, ' ', COALESCE(c.last_name, ''))) AS name,
  c.email,
  c.phone,
  c.company,
  c.type,
  c.status,
  (c.status = 'active') AS is_active,
  -- Lead scoring
  COALESCE(cls.total_score, 0) AS lead_score,
  COALESCE(cls.temperature, 'cold') AS temperature,
  cls.engagement_score,
  cls.profile_score,
  cls.behavior_score,
  cls.financial_score,
  -- Activity aggregates
  COALESCE(act_agg.total_activities, 0) AS total_activities,
  act_agg.last_activity_date,
  act_agg.last_activity_type,
  -- Deal aggregates
  COALESCE(deal_agg.deals_count, 0) AS deals_count,
  COALESCE(deal_agg.total_revenue, 0) AS total_revenue,
  c.created_at,
  c.updated_at
FROM contacts c
LEFT JOIN contact_lead_scores cls ON cls.contact_id = c.id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::integer AS total_activities,
    MAX(ca.activity_date) AS last_activity_date,
    (ARRAY_AGG(ca.activity_type ORDER BY ca.activity_date DESC))[1] AS last_activity_type
  FROM contact_activities ca
  WHERE ca.contact_id = c.id
) act_agg ON true
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::integer AS deals_count,
    COALESCE(SUM(CASE WHEN d.stage = 'won' THEN d.value ELSE 0 END), 0) AS total_revenue
  FROM deals d
  WHERE d.contact_id = c.id
) deal_agg ON true;

-- ============================================================
-- 7. PENDING FOLLOW-UPS VIEW
-- ============================================================
DROP VIEW IF EXISTS public.pending_follow_ups;
CREATE OR REPLACE VIEW public.pending_follow_ups AS
SELECT
  ca.id,
  ca.my_company_id,
  ca.contact_id,
  TRIM(CONCAT(c.first_name, ' ', COALESCE(c.last_name, ''))) AS contact_name,
  c.email AS contact_email,
  ca.subject,
  ca.activity_type,
  ca.activity_date,
  ca.follow_up_date,
  ca.follow_up_notes,
  ca.assigned_to::text,
  CASE
    WHEN ca.follow_up_date < CURRENT_DATE THEN 'overdue'
    WHEN ca.follow_up_date = CURRENT_DATE THEN 'today'
    WHEN ca.follow_up_date <= CURRENT_DATE + interval '7 days' THEN 'this_week'
    ELSE 'later'
  END AS urgency
FROM contact_activities ca
JOIN contacts c ON c.id = ca.contact_id
WHERE ca.is_follow_up_done = false
  AND ca.follow_up_date IS NOT NULL;

-- ============================================================
-- ENABLE RLS ON NEW TABLES
-- ============================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_timers ENABLE ROW LEVEL SECURITY;

-- Products: user can manage own
CREATE POLICY products_user_policy ON public.products
  FOR ALL USING (user_id = auth.uid());

-- Quotes: user can manage own
CREATE POLICY quotes_user_policy ON public.quotes
  FOR ALL USING (user_id = auth.uid());

-- Quote items: user can manage through quote ownership
CREATE POLICY quote_items_user_policy ON public.quote_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.user_id = auth.uid())
  );

-- Time entries: user can manage own
CREATE POLICY time_entries_user_policy ON public.time_entries
  FOR ALL USING (user_id = auth.uid());

-- Active timers: user can manage own
CREATE POLICY active_timers_user_policy ON public.active_timers
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- DONE
-- ============================================================
-- Created: products, quotes, quote_items, time_entries, active_timers
-- Created views: contact_crm_summary, pending_follow_ups
-- Enabled RLS with user-based policies on all new tables
