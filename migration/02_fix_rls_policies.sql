-- ============================================
-- PHASE 1-A, STEP 2: FIX RLS POLICIES
-- Fixes: All financial RLS policies that reference company_users.my_company_id (wrong column)
-- Also: Revoke anon access on pdf_templates and generated_pdfs
-- SAFE: Only recreates policies, no data changes
-- ============================================

-- =====================
-- FIX 1: Financial system RLS policies
-- Bug: Policies reference company_users.my_company_id but column is company_users.company_id
-- Source: 20_create_financial_system_FIXED.sql already has the correct version
-- We DROP and recreate all financial policies with the correct column
-- =====================

-- CATEGORIES policies
DROP POLICY IF EXISTS "Users can view categories of their company" ON categories;
DROP POLICY IF EXISTS "Users can create categories for their company" ON categories;
DROP POLICY IF EXISTS "Users can update categories of their company" ON categories;
DROP POLICY IF EXISTS "Users can delete categories of their company" ON categories;

CREATE POLICY "Users can view categories of their company" ON categories
  FOR SELECT USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create categories for their company" ON categories
  FOR INSERT WITH CHECK (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update categories of their company" ON categories
  FOR UPDATE USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete categories of their company" ON categories
  FOR DELETE USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- ACCOUNTS policies
DROP POLICY IF EXISTS "Users can view accounts of their company" ON accounts;
DROP POLICY IF EXISTS "Users can create accounts for their company" ON accounts;
DROP POLICY IF EXISTS "Users can update accounts of their company" ON accounts;
DROP POLICY IF EXISTS "Users can delete accounts of their company" ON accounts;

CREATE POLICY "Users can view accounts of their company" ON accounts
  FOR SELECT USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create accounts for their company" ON accounts
  FOR INSERT WITH CHECK (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update accounts of their company" ON accounts
  FOR UPDATE USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete accounts of their company" ON accounts
  FOR DELETE USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- EXPENSES policies
DROP POLICY IF EXISTS "Users can view expenses of their company" ON expenses;
DROP POLICY IF EXISTS "Users can create expenses for their company" ON expenses;
DROP POLICY IF EXISTS "Users can update expenses of their company" ON expenses;
DROP POLICY IF EXISTS "Users can delete expenses of their company" ON expenses;

CREATE POLICY "Users can view expenses of their company" ON expenses
  FOR SELECT USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create expenses for their company" ON expenses
  FOR INSERT WITH CHECK (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update expenses of their company" ON expenses
  FOR UPDATE USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete expenses of their company" ON expenses
  FOR DELETE USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- INCOMES policies
DROP POLICY IF EXISTS "Users can view incomes of their company" ON incomes;
DROP POLICY IF EXISTS "Users can create incomes for their company" ON incomes;
DROP POLICY IF EXISTS "Users can update incomes of their company" ON incomes;
DROP POLICY IF EXISTS "Users can delete incomes of their company" ON incomes;

CREATE POLICY "Users can view incomes of their company" ON incomes
  FOR SELECT USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create incomes for their company" ON incomes
  FOR INSERT WITH CHECK (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update incomes of their company" ON incomes
  FOR UPDATE USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete incomes of their company" ON incomes
  FOR DELETE USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- BUDGETS policies
DROP POLICY IF EXISTS "Users can view budgets of their company" ON budgets;
DROP POLICY IF EXISTS "Users can create budgets for their company" ON budgets;
DROP POLICY IF EXISTS "Users can update budgets of their company" ON budgets;
DROP POLICY IF EXISTS "Users can delete budgets of their company" ON budgets;

CREATE POLICY "Users can view budgets of their company" ON budgets
  FOR SELECT USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create budgets for their company" ON budgets
  FOR INSERT WITH CHECK (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update budgets of their company" ON budgets
  FOR UPDATE USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete budgets of their company" ON budgets
  FOR DELETE USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- TRANSACTIONS policies
DROP POLICY IF EXISTS "Users can view transactions of their company" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions for their company" ON transactions;

CREATE POLICY "Users can view transactions of their company" ON transactions
  FOR SELECT USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transactions for their company" ON transactions
  FOR INSERT WITH CHECK (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- =====================
-- FIX 2: Revoke anon access and enable RLS on pdf_templates and generated_pdfs
-- =====================

REVOKE ALL ON pdf_templates FROM anon;
REVOKE ALL ON generated_pdfs FROM anon;

ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_pdfs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pdf_templates (uses user_id, no my_company_id column)
DROP POLICY IF EXISTS "Users can view pdf_templates of their company" ON pdf_templates;
DROP POLICY IF EXISTS "Users can create pdf_templates for their company" ON pdf_templates;
DROP POLICY IF EXISTS "Users can update pdf_templates of their company" ON pdf_templates;
DROP POLICY IF EXISTS "Users can delete pdf_templates of their company" ON pdf_templates;

CREATE POLICY "Users can view their own pdf_templates" ON pdf_templates
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own pdf_templates" ON pdf_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own pdf_templates" ON pdf_templates
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own pdf_templates" ON pdf_templates
  FOR DELETE USING (user_id = auth.uid());

-- Create RLS policies for generated_pdfs (uses user_id, no my_company_id column)
DROP POLICY IF EXISTS "Users can view generated_pdfs of their company" ON generated_pdfs;
DROP POLICY IF EXISTS "Users can create generated_pdfs for their company" ON generated_pdfs;

CREATE POLICY "Users can view their own generated_pdfs" ON generated_pdfs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own generated_pdfs" ON generated_pdfs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================
-- VERIFICATION
-- =====================
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies fixed successfully';
  RAISE NOTICE '  - All financial policies now reference company_users.company_id (correct)';
  RAISE NOTICE '  - Revoked anon access on pdf_templates and generated_pdfs';
  RAISE NOTICE '  - Enabled RLS on pdf_templates and generated_pdfs';
END $$;

-- =====================
-- ROLLBACK
-- =====================
-- To rollback financial policies: re-run database/20_create_financial_system.sql policies
-- To rollback pdf access:
--   ALTER TABLE pdf_templates DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE generated_pdfs DISABLE ROW LEVEL SECURITY;
--   GRANT ALL ON pdf_templates TO anon;
--   GRANT ALL ON generated_pdfs TO anon;
