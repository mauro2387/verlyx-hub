-- ============================================================
-- MIGRATION 34: Fix my_companies schema — add missing columns
-- Verlyx Hub
-- ============================================================
-- The live DB was created with 01_schema.sql which uses 'user_id'
-- but the app code and RLS policies expect 'owner_user_id'.
-- Also missing: description, website, settings columns.
-- ============================================================

-- 1. Add owner_user_id column (mirrors user_id)
ALTER TABLE my_companies ADD COLUMN IF NOT EXISTS owner_user_id UUID;

-- 2. Copy existing user_id values into owner_user_id
UPDATE my_companies SET owner_user_id = user_id WHERE owner_user_id IS NULL AND user_id IS NOT NULL;

-- 3. Add missing columns the app expects
ALTER TABLE my_companies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE my_companies ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE my_companies ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- 4. Create index on owner_user_id
CREATE INDEX IF NOT EXISTS idx_my_companies_owner ON my_companies(owner_user_id);

-- 5. Recreate RLS policies using owner_user_id
-- (Drop first in case they exist with wrong column reference)
DROP POLICY IF EXISTS "Users can view their own companies" ON my_companies;
DROP POLICY IF EXISTS "Users can insert their own companies" ON my_companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON my_companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON my_companies;

CREATE POLICY "Users can view their own companies"
ON my_companies FOR SELECT
USING (owner_user_id = auth.uid());

CREATE POLICY "Users can insert their own companies"
ON my_companies FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can update their own companies"
ON my_companies FOR UPDATE
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Users can delete their own companies"
ON my_companies FOR DELETE
USING (owner_user_id = auth.uid());

-- 6. Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'my_companies'
ORDER BY ordinal_position;
