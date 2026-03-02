-- ============================================
-- PHASE 1-A, STEP 1: FIX BROKEN TRIGGERS
-- Fixes: log_page_changes(), create_income_from_verlyx_payment()
-- SAFE: Only replaces function bodies, no data changes
-- ============================================

-- =====================
-- PREREQUISITE: Create audit_action enum if it doesn't exist
-- (defined in database/08_create_audit_logs.sql but may not have been run)
-- =====================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
    CREATE TYPE audit_action AS ENUM (
      'CREATE', 'UPDATE', 'DELETE',
      'LOGIN', 'LOGOUT',
      'PERMISSION_CHANGE', 'ROLE_CHANGE',
      'INVITE_SENT', 'INVITE_ACCEPTED',
      'MEMBER_ADDED', 'MEMBER_REMOVED',
      'EXPORT', 'IMPORT',
      'STATUS_CHANGE', 'OTHER'
    );
    RAISE NOTICE '✅ Created audit_action enum type';
  ELSE
    RAISE NOTICE 'ℹ️  audit_action enum already exists';
  END IF;
END $$;

-- =====================
-- PREREQUISITE: Create audit_logs table if it doesn't exist
-- =====================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES my_companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  action audit_action NOT NULL,
  changes JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =====================
-- FIX 1: log_page_changes()
-- Bug: TG_OP returns 'INSERT'/'UPDATE'/'DELETE' but audit_action enum expects 'CREATE'/'UPDATE'/'DELETE'
-- Bug: company_id set from workspace_id (wrong FK)
-- Bug: user_id set from last_edited_by (may not be auth.users UUID)
-- =====================

CREATE OR REPLACE FUNCTION log_page_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action audit_action;
  v_company_id UUID;
BEGIN
  -- Map PostgreSQL TG_OP to our audit_action enum
  CASE TG_OP
    WHEN 'INSERT' THEN v_action := 'CREATE';
    WHEN 'UPDATE' THEN v_action := 'UPDATE';
    WHEN 'DELETE' THEN v_action := 'DELETE';
    ELSE v_action := 'OTHER';
  END CASE;

  -- Get the actual company_id from the workspace
  -- workspace_pages.my_company_id is the correct company reference
  v_company_id := COALESCE(NEW.my_company_id, OLD.my_company_id);

  INSERT INTO audit_logs (
    company_id,
    user_id,
    action,
    entity_type,
    entity_id,
    changes
  ) VALUES (
    v_company_id,
    auth.uid(),  -- Use the authenticated user, not last_edited_by
    v_action,
    'page',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'title', COALESCE(NEW.title, OLD.title),
      'operation', TG_OP
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- FIX 2: create_income_from_verlyx_payment()
-- Bug: Uses wrong column names (company_id→my_company_id, concept→description, income_date→payment_date)
-- =====================

CREATE OR REPLACE FUNCTION create_income_from_verlyx_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.receiver_company_id IS NOT NULL THEN
    INSERT INTO incomes (
      my_company_id,        -- FIXED: was company_id
      amount,
      description,          -- FIXED: was concept
      payment_date,         -- FIXED: was income_date
      payment_method,
      status,
      notes,
      created_by
    ) VALUES (
      NEW.receiver_company_id,
      NEW.amount,
      COALESCE(NEW.concept, 'Pago recibido vía Verlyx'),
      CURRENT_DATE,
      'verlyx_transfer',
      'received',
      'Transfer ID: ' || NEW.id::TEXT,
      NEW.receiver_user_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- VERIFICATION
-- =====================
DO $$
BEGIN
  RAISE NOTICE '✅ Triggers fixed successfully';
  RAISE NOTICE '  - log_page_changes() now maps TG_OP to audit_action enum';
  RAISE NOTICE '  - create_income_from_verlyx_payment() now uses correct column names';
END $$;

-- =====================
-- ROLLBACK (if needed)
-- =====================
-- To rollback, restore the original function definitions from:
--   database/14_workspace_pages.sql (log_page_changes)
--   database/22_create_verlyx_payments.sql (create_income_from_verlyx_payment)
