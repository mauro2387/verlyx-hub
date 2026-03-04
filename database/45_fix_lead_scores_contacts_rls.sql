-- =====================================================
-- Migration 45: Fix contact_lead_scores RLS + contacts update
-- =====================================================
-- Ensures contact_lead_scores is accessible via API and
-- contacts can be updated properly.
-- =====================================================

-- 1. Ensure RLS is enabled
ALTER TABLE IF EXISTS public.contact_lead_scores ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (they may be broken or use old subquery pattern)
DROP POLICY IF EXISTS "Users can view contact_lead_scores of their company" ON contact_lead_scores;
DROP POLICY IF EXISTS "Users can manage contact_lead_scores of their company" ON contact_lead_scores;
DROP POLICY IF EXISTS rls_company_access ON contact_lead_scores;

-- 3. Recreate with SECURITY DEFINER helper (avoids RLS recursion)
CREATE POLICY "contact_lead_scores_select"
ON contact_lead_scores FOR SELECT
USING (my_company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "contact_lead_scores_insert"
ON contact_lead_scores FOR INSERT
WITH CHECK (my_company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "contact_lead_scores_update"
ON contact_lead_scores FOR UPDATE
USING (my_company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "contact_lead_scores_delete"
ON contact_lead_scores FOR DELETE
USING (my_company_id IN (SELECT public.get_user_company_ids()));

-- 4. Same fix for contacts table (ensure UPDATE works)
DROP POLICY IF EXISTS rls_company_access ON contacts;
DROP POLICY IF EXISTS "contacts_select" ON contacts;
DROP POLICY IF EXISTS "contacts_insert" ON contacts;
DROP POLICY IF EXISTS "contacts_update" ON contacts;
DROP POLICY IF EXISTS "contacts_delete" ON contacts;

CREATE POLICY "contacts_select"
ON contacts FOR SELECT
USING (my_company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "contacts_insert"
ON contacts FOR INSERT
WITH CHECK (my_company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "contacts_update"
ON contacts FOR UPDATE
USING (my_company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "contacts_delete"
ON contacts FOR DELETE
USING (my_company_id IN (SELECT public.get_user_company_ids()));

-- 5. Also fix lead_score_history (depends on contact_lead_scores)
ALTER TABLE IF EXISTS public.lead_score_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view lead_score_history of their company" ON lead_score_history;
DROP POLICY IF EXISTS rls_lead_score_history ON lead_score_history;

CREATE POLICY "lead_score_history_select"
ON lead_score_history FOR SELECT
USING (
  contact_lead_score_id IN (
    SELECT id FROM contact_lead_scores
    WHERE my_company_id IN (SELECT public.get_user_company_ids())
  )
);

CREATE POLICY "lead_score_history_insert"
ON lead_score_history FOR INSERT
WITH CHECK (
  contact_lead_score_id IN (
    SELECT id FROM contact_lead_scores
    WHERE my_company_id IN (SELECT public.get_user_company_ids())
  )
);
