-- ============================================
-- PHASE 1-B, STEP 5: ADD MISSING FOREIGN KEY CONSTRAINTS
-- Adds 37 missing FK relationships for referential integrity
-- Uses NOT VALID initially (zero downtime) — validate after
-- Run AFTER 04_consolidate_checks.sql
-- ============================================

-- NOTE: All FKs use ON DELETE SET NULL for optional references
-- and ON DELETE CASCADE for child records.
-- NOT VALID means existing data is NOT checked — run VALIDATE afterward.

-- =====================
-- QUOTES
-- =====================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quotes_user') THEN
    ALTER TABLE quotes ADD CONSTRAINT fk_quotes_user 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quotes_contact') THEN
    ALTER TABLE quotes ADD CONSTRAINT fk_quotes_contact 
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quotes_deal') THEN
    ALTER TABLE quotes ADD CONSTRAINT fk_quotes_deal 
      FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quotes_company') THEN
    ALTER TABLE quotes ADD CONSTRAINT fk_quotes_company 
      FOREIGN KEY (my_company_id) REFERENCES my_companies(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- QUOTE_ITEMS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_quote_items_product') THEN
    ALTER TABLE quote_items ADD CONSTRAINT fk_quote_items_product 
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

-- =====================
-- TIME_ENTRIES
-- =====================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_time_entries_user') THEN
    ALTER TABLE time_entries ADD CONSTRAINT fk_time_entries_user 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_time_entries_project') THEN
    ALTER TABLE time_entries ADD CONSTRAINT fk_time_entries_project 
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_time_entries_task') THEN
    ALTER TABLE time_entries ADD CONSTRAINT fk_time_entries_task 
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_time_entries_company') THEN
    ALTER TABLE time_entries ADD CONSTRAINT fk_time_entries_company 
      FOREIGN KEY (my_company_id) REFERENCES my_companies(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- =====================
-- PRODUCTS
-- =====================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_user') THEN
    ALTER TABLE products ADD CONSTRAINT fk_products_user 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_company') THEN
    ALTER TABLE products ADD CONSTRAINT fk_products_company 
      FOREIGN KEY (my_company_id) REFERENCES my_companies(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- =====================
-- GOALS
-- =====================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_goals_user') THEN
    ALTER TABLE goals ADD CONSTRAINT fk_goals_user 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_goals_company') THEN
    ALTER TABLE goals ADD CONSTRAINT fk_goals_company 
      FOREIGN KEY (my_company_id) REFERENCES my_companies(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- =====================
-- AUTOMATIONS
-- =====================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_automations_created_by') THEN
    ALTER TABLE automations ADD CONSTRAINT fk_automations_created_by 
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_automations_company') THEN
    ALTER TABLE automations ADD CONSTRAINT fk_automations_company 
      FOREIGN KEY (my_company_id) REFERENCES my_companies(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- AUTOMATION_STEPS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_automation_steps_parent') THEN
    ALTER TABLE automation_steps ADD CONSTRAINT fk_automation_steps_parent 
      FOREIGN KEY (parent_step_id) REFERENCES automation_steps(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

-- =====================
-- DOCUMENTS (Schema B — database/16)
-- =====================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'project_id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_project') THEN
      ALTER TABLE documents ADD CONSTRAINT fk_documents_project 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL NOT VALID;
    END IF;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'contact_id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_contact') THEN
      ALTER TABLE documents ADD CONSTRAINT fk_documents_contact 
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL NOT VALID;
    END IF;
  END IF;
END $$;

-- =====================
-- TEAM_MEMBERS
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_team_members_company') THEN
      ALTER TABLE team_members ADD CONSTRAINT fk_team_members_company 
        FOREIGN KEY (my_company_id) REFERENCES my_companies(id) ON DELETE CASCADE NOT VALID;
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_member_hours') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_team_member_hours_member') THEN
      ALTER TABLE team_member_hours ADD CONSTRAINT fk_team_member_hours_member 
        FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE NOT VALID;
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_member_payments') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_team_member_payments_member') THEN
      ALTER TABLE team_member_payments ADD CONSTRAINT fk_team_member_payments_member 
        FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE NOT VALID;
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_member_documents') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_team_member_documents_member') THEN
      ALTER TABLE team_member_documents ADD CONSTRAINT fk_team_member_documents_member 
        FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE NOT VALID;
    END IF;
  END IF;
END $$;

-- =====================
-- CONTACT_ACTIVITIES (CRM Advanced)
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_activities') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_contact_activities_deal') THEN
      ALTER TABLE contact_activities ADD CONSTRAINT fk_contact_activities_deal 
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_contact_activities_project') THEN
      ALTER TABLE contact_activities ADD CONSTRAINT fk_contact_activities_project 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_contact_activities_task') THEN
      ALTER TABLE contact_activities ADD CONSTRAINT fk_contact_activities_task 
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL NOT VALID;
    END IF;
  END IF;
END $$;

-- =====================
-- CLIENT_LEAD_SCORES
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_lead_scores') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lead_scores_contact') THEN
      ALTER TABLE client_lead_scores ADD CONSTRAINT fk_lead_scores_contact 
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE NOT VALID;
    END IF;
  END IF;
END $$;

-- =====================
-- LEAD_SCORE_HISTORY
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_score_history') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lead_score_history_rule') THEN
      ALTER TABLE lead_score_history ADD CONSTRAINT fk_lead_score_history_rule 
        FOREIGN KEY (rule_id) REFERENCES lead_scoring_rules(id) ON DELETE SET NULL NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lead_score_history_activity') THEN
      ALTER TABLE lead_score_history ADD CONSTRAINT fk_lead_score_history_activity 
        FOREIGN KEY (activity_id) REFERENCES contact_activities(id) ON DELETE SET NULL NOT VALID;
    END IF;
  END IF;
END $$;

-- =====================
-- CONTACT_SEGMENT_MEMBERS
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_segment_members') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_segment_members_segment') THEN
      ALTER TABLE contact_segment_members ADD CONSTRAINT fk_segment_members_segment 
        FOREIGN KEY (segment_id) REFERENCES client_segments(id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_segment_members_contact') THEN
      ALTER TABLE contact_segment_members ADD CONSTRAINT fk_segment_members_contact 
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE NOT VALID;
    END IF;
  END IF;
END $$;

-- =====================
-- SCHEDULED_COMMUNICATIONS
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_communications') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_scheduled_comm_contact') THEN
      ALTER TABLE scheduled_communications ADD CONSTRAINT fk_scheduled_comm_contact 
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_scheduled_comm_segment') THEN
      ALTER TABLE scheduled_communications ADD CONSTRAINT fk_scheduled_comm_segment 
        FOREIGN KEY (segment_id) REFERENCES client_segments(id) ON DELETE SET NULL NOT VALID;
    END IF;
  END IF;
END $$;

-- =====================
-- CALENDAR_EVENTS
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'calendar_events' AND column_name = 'created_by'
    ) THEN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_calendar_events_created_by') THEN
        ALTER TABLE calendar_events ADD CONSTRAINT fk_calendar_events_created_by 
          FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;
      END IF;
    END IF;
  END IF;
END $$;

-- =====================
-- WORKSPACE_PAGES
-- =====================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_pages') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'workspace_pages' AND column_name = 'parent_id'
    ) THEN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workspace_pages_parent') THEN
        ALTER TABLE workspace_pages ADD CONSTRAINT fk_workspace_pages_parent 
          FOREIGN KEY (parent_id) REFERENCES workspace_pages(id) ON DELETE SET NULL NOT VALID;
      END IF;
    END IF;
  END IF;
END $$;

-- =====================
-- VALIDATE ALL CONSTRAINTS (separate step — can be slow on large tables)
-- Run this after confirming no orphaned data exists
-- =====================

-- Uncomment to validate (will fail if orphaned rows exist):
-- ALTER TABLE quotes VALIDATE CONSTRAINT fk_quotes_user;
-- ALTER TABLE quotes VALIDATE CONSTRAINT fk_quotes_contact;
-- ALTER TABLE quotes VALIDATE CONSTRAINT fk_quotes_deal;
-- ALTER TABLE quotes VALIDATE CONSTRAINT fk_quotes_company;
-- ALTER TABLE quote_items VALIDATE CONSTRAINT fk_quote_items_product;
-- ALTER TABLE time_entries VALIDATE CONSTRAINT fk_time_entries_user;
-- ALTER TABLE time_entries VALIDATE CONSTRAINT fk_time_entries_project;
-- ALTER TABLE time_entries VALIDATE CONSTRAINT fk_time_entries_task;
-- ALTER TABLE time_entries VALIDATE CONSTRAINT fk_time_entries_company;
-- ... (uncomment all)

-- =====================
-- VERIFICATION
-- =====================
SELECT conname, conrelid::regclass AS table_name, confrelid::regclass AS ref_table
FROM pg_constraint 
WHERE contype = 'f' AND connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::TEXT, conname;

-- =====================
-- ROLLBACK
-- =====================
-- Each FK is named, so you can drop individually:
-- ALTER TABLE quotes DROP CONSTRAINT IF EXISTS fk_quotes_user;
-- ALTER TABLE quotes DROP CONSTRAINT IF EXISTS fk_quotes_contact;
-- ALTER TABLE quotes DROP CONSTRAINT IF EXISTS fk_quotes_deal;
-- ... etc.
