-- ============================================================
-- MIGRATION 48: Fix my_companies RLS + get_dashboard_stats
-- ============================================================
-- Fixes two issues:
--   1. my_companies INSERT returns 403 (RLS policy missing/broken)
--   2. get_dashboard_stats RPC returns 400 (function doesn't exist
--      or references wrong table names)
-- ============================================================

-- =============================================
-- STEP 1: Ensure owner_user_id column exists
-- =============================================
ALTER TABLE my_companies ADD COLUMN IF NOT EXISTS owner_user_id UUID;
-- Backfill from user_id if it exists
UPDATE my_companies SET owner_user_id = user_id
  WHERE owner_user_id IS NULL AND user_id IS NOT NULL;

-- Add missing columns the front-end expects
ALTER TABLE my_companies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE my_companies ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE my_companies ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_my_companies_owner ON my_companies(owner_user_id);

-- =============================================
-- STEP 2: Recreate RLS policies for my_companies
-- =============================================
ALTER TABLE my_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own companies" ON my_companies;
DROP POLICY IF EXISTS "Users can insert their own companies" ON my_companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON my_companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON my_companies;

-- SELECT: allow if owner_user_id OR user_id matches
CREATE POLICY "Users can view their own companies"
ON my_companies FOR SELECT
USING (owner_user_id = auth.uid() OR user_id = auth.uid());

-- INSERT: allow if owner_user_id matches the authenticated user
CREATE POLICY "Users can insert their own companies"
ON my_companies FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

-- UPDATE: owner can update
CREATE POLICY "Users can update their own companies"
ON my_companies FOR UPDATE
USING (owner_user_id = auth.uid() OR user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid() OR user_id = auth.uid());

-- DELETE: owner can delete
CREATE POLICY "Users can delete their own companies"
ON my_companies FOR DELETE
USING (owner_user_id = auth.uid() OR user_id = auth.uid());

-- =============================================
-- STEP 3: Auto-insert company_users when creating company
-- =============================================
-- Create company_users table if not exists (needed by opportunities RLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS company_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role user_role NOT NULL DEFAULT 'MEMBER',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

CREATE OR REPLACE FUNCTION auto_insert_company_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO company_users (company_id, user_id, role)
  VALUES (NEW.id, COALESCE(NEW.owner_user_id, NEW.user_id), 'OWNER'::user_role)
  ON CONFLICT (company_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_company_owner ON my_companies;
CREATE TRIGGER trigger_auto_company_owner
  AFTER INSERT ON my_companies
  FOR EACH ROW
  EXECUTE FUNCTION auto_insert_company_owner();

-- Backfill existing companies
INSERT INTO company_users (company_id, user_id, role)
SELECT mc.id, COALESCE(mc.owner_user_id, mc.user_id), 'OWNER'::user_role
FROM my_companies mc
WHERE COALESCE(mc.owner_user_id, mc.user_id) IS NOT NULL
ON CONFLICT (company_id, user_id) DO NOTHING;

-- =============================================
-- STEP 4: Recreate get_dashboard_stats function
-- =============================================
-- The old version references 'deals' table which doesn't exist;
-- the actual table is 'opportunities'. Also uses correct status values.
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'projectsTotal', (
      SELECT COUNT(*) FROM projects WHERE user_id = p_user_id
    ),
    'projectsInProgress', (
      SELECT COUNT(*) FROM projects
      WHERE user_id = p_user_id AND status IN ('in_progress', 'planning', 'active')
    ),
    'tasksTotal', (
      SELECT COUNT(*) FROM tasks WHERE user_id = p_user_id
    ),
    'tasksPending', (
      SELECT COUNT(*) FROM tasks
      WHERE user_id = p_user_id AND status IN ('todo', 'in_progress')
    ),
    'dealsTotal', (
      SELECT COUNT(*) FROM opportunities WHERE user_id = p_user_id
    ),
    'dealsValue', (
      SELECT COALESCE(SUM(COALESCE(final_amount, tentative_amount, estimated_amount_max, 0)), 0)
      FROM opportunities
      WHERE user_id = p_user_id AND stage = 'won'
    ),
    'clientsTotal', (
      SELECT COUNT(*) FROM contacts
      WHERE user_id = p_user_id AND type = 'client'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 5: Ensure my_company_id columns exist on related tables
-- =============================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS my_company_id UUID REFERENCES my_companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_my_company ON tasks(my_company_id);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS my_company_id UUID REFERENCES my_companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_my_company ON contacts(my_company_id);

-- Projects should already have my_company_id but just in case
ALTER TABLE projects ADD COLUMN IF NOT EXISTS my_company_id UUID REFERENCES my_companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_my_company ON projects(my_company_id);

-- PulsarMoon-related columns on projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS business_unit VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS spent DECIMAL(15,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_members UUID[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS technologies TEXT[] DEFAULT '{}';

-- =============================================
-- DONE
-- =============================================
