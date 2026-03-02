-- ============================================================
-- MIGRATION 34: Fix schema mismatches across all tables
-- Verlyx Hub
-- ============================================================
-- The live DB was created with 01_schema.sql which has column
-- names that differ from what the app code expects.
-- This migration adds missing columns and fixes references.
-- ============================================================

-- =============================================
-- 1. FIX my_companies TABLE
-- =============================================
-- Add owner_user_id (code uses this, DB has user_id)
ALTER TABLE my_companies ADD COLUMN IF NOT EXISTS owner_user_id UUID;
UPDATE my_companies SET owner_user_id = user_id WHERE owner_user_id IS NULL AND user_id IS NOT NULL;

-- Add missing columns the app expects
ALTER TABLE my_companies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE my_companies ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE my_companies ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_my_companies_owner ON my_companies(owner_user_id);

-- Recreate RLS policies using owner_user_id
DROP POLICY IF EXISTS "Users can view their own companies" ON my_companies;
DROP POLICY IF EXISTS "Users can insert their own companies" ON my_companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON my_companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON my_companies;

CREATE POLICY "Users can view their own companies"
ON my_companies FOR SELECT
USING (owner_user_id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "Users can insert their own companies"
ON my_companies FOR INSERT
WITH CHECK (owner_user_id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "Users can update their own companies"
ON my_companies FOR UPDATE
USING (owner_user_id = auth.uid() OR user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "Users can delete their own companies"
ON my_companies FOR DELETE
USING (owner_user_id = auth.uid() OR user_id = auth.uid());

-- =============================================
-- 2. FIX deals TABLE — add my_company_id
-- =============================================
-- 01_schema.sql created deals with user_id only; code queries my_company_id
ALTER TABLE deals ADD COLUMN IF NOT EXISTS my_company_id UUID REFERENCES my_companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_deals_my_company ON deals(my_company_id);

-- =============================================
-- 3. FIX projects TABLE — add missing columns
-- =============================================
-- Pulsarmoon page queries business_unit and company_id but schema
-- has project_type and my_company_id. Add aliases as real columns.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS business_unit VARCHAR(50);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS spent DECIMAL(15,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_members UUID[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS technologies TEXT[] DEFAULT '{}';

-- Sync business_unit from project_type for existing rows
UPDATE projects SET business_unit = project_type WHERE business_unit IS NULL AND project_type IS NOT NULL;

-- =============================================
-- 4. FIX tasks TABLE — add my_company_id
-- =============================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS my_company_id UUID REFERENCES my_companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_my_company ON tasks(my_company_id);

-- =============================================
-- 4b. FIX contacts TABLE — add my_company_id
-- =============================================
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS my_company_id UUID REFERENCES my_companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_my_company ON contacts(my_company_id);

-- =============================================
-- 5. AUTO-INSERT company_users WHEN CREATING COMPANY
-- =============================================
-- The opportunities RLS depends on company_users table.
-- When a user creates a company, they must also be in company_users as OWNER.
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

-- =============================================
-- 6. BACKFILL: Add existing companies to company_users
-- =============================================
-- Ensure all existing companies have their owner in company_users
INSERT INTO company_users (company_id, user_id, role)
SELECT mc.id, COALESCE(mc.owner_user_id, mc.user_id), 'OWNER'::user_role
FROM my_companies mc
WHERE COALESCE(mc.owner_user_id, mc.user_id) IS NOT NULL
ON CONFLICT (company_id, user_id) DO NOTHING;

-- =============================================
-- 7. VERIFY
-- =============================================
SELECT 'my_companies' as tbl, column_name, data_type
FROM information_schema.columns WHERE table_name = 'my_companies'
AND column_name IN ('owner_user_id','description','website','settings')
UNION ALL
SELECT 'deals', column_name, data_type
FROM information_schema.columns WHERE table_name = 'deals'
AND column_name = 'my_company_id'
UNION ALL
SELECT 'projects', column_name, data_type
FROM information_schema.columns WHERE table_name = 'projects'
AND column_name IN ('business_unit','client_name','spent','deadline')
UNION ALL
SELECT 'tasks', column_name, data_type
FROM information_schema.columns WHERE table_name = 'tasks'
AND column_name = 'my_company_id'
ORDER BY tbl;
