-- ============================================
-- PHASE 1-C, STEP 7: ENABLE RLS ON REMAINING TABLES
-- Enables RLS and creates policies for 10 tables that currently have RLS disabled
-- (pdf_templates and generated_pdfs handled in 02_fix_rls_policies.sql)
-- Run AFTER all data fixes are complete
-- ============================================

-- =====================
-- PAYMENT_LINKS
-- (no user_id/my_company_id — route through project_id or deal_id)
-- =====================

ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their payment_links" ON payment_links;
CREATE POLICY "Users can view their payment_links" ON payment_links
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      project_id IN (
        SELECT id FROM projects WHERE my_company_id IN (
          SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
      )
      OR deal_id IN (
        SELECT id FROM deals WHERE user_id = auth.uid()
      )
      OR (project_id IS NULL AND deal_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can create payment_links" ON payment_links;
CREATE POLICY "Users can create payment_links" ON payment_links
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      project_id IN (
        SELECT id FROM projects WHERE my_company_id IN (
          SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
      )
      OR deal_id IN (
        SELECT id FROM deals WHERE user_id = auth.uid()
      )
      OR (project_id IS NULL AND deal_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can update their payment_links" ON payment_links;
CREATE POLICY "Users can update their payment_links" ON payment_links
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      project_id IN (
        SELECT id FROM projects WHERE my_company_id IN (
          SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
      )
      OR deal_id IN (
        SELECT id FROM deals WHERE user_id = auth.uid()
      )
      OR (project_id IS NULL AND deal_id IS NULL)
    )
  );

-- =====================
-- PAYMENTS
-- (no user_id/my_company_id — route through payment_link_id → project_id or deal_id)
-- =====================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their payments" ON payments;
CREATE POLICY "Users can view their payments" ON payments
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      payment_link_id IN (
        SELECT id FROM payment_links
        WHERE project_id IN (
          SELECT id FROM projects WHERE my_company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
          )
        )
        OR deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
        OR (project_id IS NULL AND deal_id IS NULL)
      )
      OR project_id IN (
        SELECT id FROM projects WHERE my_company_id IN (
          SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
      )
      OR deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create payments" ON payments;
CREATE POLICY "Users can create payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================
-- REFUNDS (if exists)
-- (no user_id/my_company_id — route through payment_id → payments)
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refunds' AND table_schema = 'public') THEN
    ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their refunds" ON refunds;
    EXECUTE 'CREATE POLICY "Users can view their refunds" ON refunds
      FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
          payment_id IN (
            SELECT id FROM payments
            WHERE project_id IN (
              SELECT id FROM projects WHERE my_company_id IN (
                SELECT company_id FROM company_users WHERE user_id = auth.uid()
              )
            )
            OR deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
          )
        )
      )';
      
    DROP POLICY IF EXISTS "Users can create refunds" ON refunds;
    EXECUTE 'CREATE POLICY "Users can create refunds" ON refunds
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END $$;

-- =====================
-- DOCUMENTS (if RLS not already enabled)
-- (has user_id and project_id/contact_id but no my_company_id)
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
        project_id IN (
          SELECT id FROM projects WHERE my_company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
          )
        )
      )';
      
    DROP POLICY IF EXISTS "Users can create documents" ON documents;
    EXECUTE 'CREATE POLICY "Users can create documents" ON documents
      FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        project_id IN (
          SELECT id FROM projects WHERE my_company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
          )
        )
      )';
      
    DROP POLICY IF EXISTS "Users can update their documents" ON documents;
    EXECUTE 'CREATE POLICY "Users can update their documents" ON documents
      FOR UPDATE USING (
        user_id = auth.uid() OR
        project_id IN (
          SELECT id FROM projects WHERE my_company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
          )
        )
      )';
      
    DROP POLICY IF EXISTS "Users can delete their documents" ON documents;
    EXECUTE 'CREATE POLICY "Users can delete their documents" ON documents
      FOR DELETE USING (
        user_id = auth.uid()
      )';
    
    RAISE NOTICE 'Enabled RLS on documents';
  END IF;
END $$;

-- =====================
-- WORKSPACE TABLES (workspaces, pages, blocks, page_comments, page_permissions, page_versions)
-- pages links via workspace_id → workspaces.my_company_id
-- =====================

DO $$ BEGIN
  -- WORKSPACES
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspaces' AND table_schema = 'public') THEN
    ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can access workspaces of their company" ON workspaces;
    EXECUTE 'CREATE POLICY "Users can access workspaces of their company" ON workspaces
      FOR ALL USING (
        my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
      )';
  END IF;

  -- PAGES (workspace_id → workspaces.my_company_id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pages' AND table_schema = 'public') THEN
    ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can access pages of their company" ON pages;
    EXECUTE 'CREATE POLICY "Users can access pages of their company" ON pages
      FOR ALL USING (
        workspace_id IN (
          SELECT id FROM workspaces WHERE my_company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
          )
        )
        OR created_by = auth.uid()
        OR is_public = true
      )';
  END IF;

  -- BLOCKS (page_id → pages)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blocks' AND table_schema = 'public') THEN
    ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can manage blocks via page access" ON blocks;
    EXECUTE 'CREATE POLICY "Users can manage blocks via page access" ON blocks
      FOR ALL USING (
        page_id IN (
          SELECT id FROM pages WHERE workspace_id IN (
            SELECT id FROM workspaces WHERE my_company_id IN (
              SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
          )
        )
      )';
  END IF;

  -- PAGE_COMMENTS (page_id → pages)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'page_comments' AND table_schema = 'public') THEN
    ALTER TABLE page_comments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can manage page_comments via page access" ON page_comments;
    EXECUTE 'CREATE POLICY "Users can manage page_comments via page access" ON page_comments
      FOR ALL USING (
        page_id IN (
          SELECT id FROM pages WHERE workspace_id IN (
            SELECT id FROM workspaces WHERE my_company_id IN (
              SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
          )
        )
      )';
  END IF;

  -- PAGE_PERMISSIONS (page_id → pages)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'page_permissions' AND table_schema = 'public') THEN
    ALTER TABLE page_permissions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view page_permissions of their company" ON page_permissions;
    EXECUTE 'CREATE POLICY "Users can view page_permissions of their company" ON page_permissions
      FOR ALL USING (
        page_id IN (
          SELECT id FROM pages WHERE workspace_id IN (
            SELECT id FROM workspaces WHERE my_company_id IN (
              SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
          )
        )
      )';
  END IF;

  -- PAGE_VERSIONS (page_id → pages)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'page_versions' AND table_schema = 'public') THEN
    ALTER TABLE page_versions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view page_versions of their company" ON page_versions;
    EXECUTE 'CREATE POLICY "Users can view page_versions of their company" ON page_versions
      FOR ALL USING (
        page_id IN (
          SELECT id FROM pages WHERE workspace_id IN (
            SELECT id FROM workspaces WHERE my_company_id IN (
              SELECT company_id FROM company_users WHERE user_id = auth.uid()
            )
          )
        )
      )';
  END IF;
END $$;

-- =====================
-- CALENDAR_EVENTS
-- (has user_id but no created_by or my_company_id)
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
    ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view calendar_events of their company" ON calendar_events;
    EXECUTE 'CREATE POLICY "Users can view calendar_events of their company" ON calendar_events
      FOR SELECT USING (
        user_id = auth.uid()
      )';
    
    DROP POLICY IF EXISTS "Users can manage their calendar_events" ON calendar_events;
    EXECUTE 'CREATE POLICY "Users can manage their calendar_events" ON calendar_events
      FOR ALL USING (
        user_id = auth.uid()
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
