-- ============================================
-- PHASE 1-C, STEP 7: ENABLE RLS ON REMAINING TABLES
-- Enables RLS and creates policies for 10 tables that currently have RLS disabled
-- (pdf_templates and generated_pdfs handled in 02_fix_rls_policies.sql)
-- Run AFTER all data fixes are complete
-- ============================================

-- =====================
-- PAYMENT_LINKS
-- =====================

ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their payment_links" ON payment_links;
CREATE POLICY "Users can view their payment_links" ON payment_links
  FOR SELECT USING (
    user_id = auth.uid() OR
    my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create payment_links" ON payment_links;
CREATE POLICY "Users can create payment_links" ON payment_links
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their payment_links" ON payment_links;
CREATE POLICY "Users can update their payment_links" ON payment_links
  FOR UPDATE USING (
    user_id = auth.uid() OR
    my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
  );

-- =====================
-- PAYMENTS
-- =====================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their payments" ON payments;
CREATE POLICY "Users can view their payments" ON payments
  FOR SELECT USING (
    user_id = auth.uid() OR
    my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create payments" ON payments;
CREATE POLICY "Users can create payments" ON payments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
  );

-- =====================
-- REFUNDS (if exists)
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refunds' AND table_schema = 'public') THEN
    ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their refunds" ON refunds;
    EXECUTE 'CREATE POLICY "Users can view their refunds" ON refunds
      FOR SELECT USING (
        my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
      )';
      
    DROP POLICY IF EXISTS "Users can create refunds" ON refunds;
    EXECUTE 'CREATE POLICY "Users can create refunds" ON refunds
      FOR INSERT WITH CHECK (
        my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
      )';
  END IF;
END $$;

-- =====================
-- DOCUMENTS (if RLS not already enabled)
-- =====================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'documents' AND schemaname = 'public' AND rowsecurity = false
  ) THEN
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their documents" ON documents;
    EXECUTE 'CREATE POLICY "Users can view their documents" ON documents
      FOR SELECT USING (
        user_id = auth.uid() OR
        my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
      )';
      
    DROP POLICY IF EXISTS "Users can create documents" ON documents;
    EXECUTE 'CREATE POLICY "Users can create documents" ON documents
      FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
      )';
      
    DROP POLICY IF EXISTS "Users can update their documents" ON documents;
    EXECUTE 'CREATE POLICY "Users can update their documents" ON documents
      FOR UPDATE USING (
        user_id = auth.uid() OR
        my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
      )';
      
    DROP POLICY IF EXISTS "Users can delete their documents" ON documents;
    EXECUTE 'CREATE POLICY "Users can delete their documents" ON documents
      FOR DELETE USING (
        user_id = auth.uid() OR
        my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
      )';
    
    RAISE NOTICE 'Enabled RLS on documents';
  END IF;
END $$;

-- =====================
-- WORKSPACE TABLES (pages, page_blocks, page_comments, page_permissions)
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_pages') THEN
    ALTER TABLE workspace_pages ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view workspace_pages of their company" ON workspace_pages;
    EXECUTE 'CREATE POLICY "Users can view workspace_pages of their company" ON workspace_pages
      FOR SELECT USING (
        my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
      )';
    
    DROP POLICY IF EXISTS "Users can manage workspace_pages of their company" ON workspace_pages;
    EXECUTE 'CREATE POLICY "Users can manage workspace_pages of their company" ON workspace_pages
      FOR ALL USING (
        my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
      )';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'page_blocks') THEN
    ALTER TABLE page_blocks ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can manage page_blocks via page access" ON page_blocks;
    EXECUTE 'CREATE POLICY "Users can manage page_blocks via page access" ON page_blocks
      FOR ALL USING (
        page_id IN (
          SELECT id FROM workspace_pages WHERE my_company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
          )
        )
      )';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'page_comments') THEN
    ALTER TABLE page_comments ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can manage page_comments via page access" ON page_comments;
    EXECUTE 'CREATE POLICY "Users can manage page_comments via page access" ON page_comments
      FOR ALL USING (
        page_id IN (
          SELECT id FROM workspace_pages WHERE my_company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
          )
        )
      )';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'page_permissions') THEN
    ALTER TABLE page_permissions ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view page_permissions of their company" ON page_permissions;
    EXECUTE 'CREATE POLICY "Users can view page_permissions of their company" ON page_permissions
      FOR ALL USING (
        page_id IN (
          SELECT id FROM workspace_pages WHERE my_company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
          )
        )
      )';
  END IF;
END $$;

-- =====================
-- CALENDAR_EVENTS
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
    ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view calendar_events of their company" ON calendar_events;
    EXECUTE 'CREATE POLICY "Users can view calendar_events of their company" ON calendar_events
      FOR SELECT USING (
        created_by = auth.uid() OR
        my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
      )';
    
    DROP POLICY IF EXISTS "Users can manage their calendar_events" ON calendar_events;
    EXECUTE 'CREATE POLICY "Users can manage their calendar_events" ON calendar_events
      FOR ALL USING (
        created_by = auth.uid() OR
        my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
      )';
  END IF;
END $$;

-- =====================
-- ACTIVE_TIMERS 
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_timers') THEN
    ALTER TABLE active_timers ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their active_timers" ON active_timers;
    EXECUTE 'CREATE POLICY "Users can view their active_timers" ON active_timers
      FOR SELECT USING (user_id = auth.uid())';
    
    DROP POLICY IF EXISTS "Users can manage their active_timers" ON active_timers;
    EXECUTE 'CREATE POLICY "Users can manage their active_timers" ON active_timers
      FOR ALL USING (user_id = auth.uid())';
  END IF;
END $$;

-- =====================
-- VERIFICATION
-- =====================

SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

DO $$
BEGIN
  RAISE NOTICE '✅ RLS enabled on all remaining tables';
  RAISE NOTICE '  - payment_links, payments, refunds, documents';
  RAISE NOTICE '  - workspace_pages, page_blocks, page_comments, page_permissions';
  RAISE NOTICE '  - calendar_events, active_timers';
END $$;

-- =====================
-- ROLLBACK (EMERGENCY)
-- =====================
-- ALTER TABLE payment_links DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE refunds DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE workspace_pages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE page_blocks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE page_comments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE page_permissions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE active_timers DISABLE ROW LEVEL SECURITY;
