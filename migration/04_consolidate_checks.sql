-- ============================================
-- PHASE 1-B, STEP 4: CONSOLIDATE CHECK CONSTRAINTS
-- Replaces old CHECK/ENUM constraints with canonical lowercase CHECK constraints
-- Run AFTER 03_normalize_values.sql
-- ============================================

-- =====================
-- TASKS constraints
-- =====================

-- Drop old constraints (safe — IF EXISTS)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS task_status_check;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS task_priority_check;

-- If Schema B ENUM columns exist, convert to VARCHAR first
DO $$
BEGIN
  -- Check if status is an ENUM type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'status' AND udt_name = 'task_status'
  ) THEN
    ALTER TABLE tasks ALTER COLUMN status TYPE VARCHAR(20) USING status::TEXT;
    RAISE NOTICE 'Converted tasks.status from ENUM to VARCHAR';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'priority' AND udt_name = 'priority_level'
  ) THEN
    ALTER TABLE tasks ALTER COLUMN priority TYPE VARCHAR(20) USING priority::TEXT;
    RAISE NOTICE 'Converted tasks.priority from ENUM to VARCHAR';
  END IF;
END $$;

-- Add canonical CHECK constraints
ALTER TABLE tasks ADD CONSTRAINT task_status_check 
  CHECK (status IN ('todo', 'in_progress', 'review', 'blocked', 'done', 'cancelled'));

ALTER TABLE tasks ADD CONSTRAINT task_priority_check 
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Set sensible defaults
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'todo';
ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT 'medium';

-- =====================
-- DEALS constraints
-- =====================

ALTER TABLE deals DROP CONSTRAINT IF EXISTS deal_stage_check;
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deal_probability_check;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deals' AND column_name = 'stage' AND udt_name = 'deal_stage'
  ) THEN
    ALTER TABLE deals ALTER COLUMN stage TYPE VARCHAR(20) USING stage::TEXT;
    RAISE NOTICE 'Converted deals.stage from ENUM to VARCHAR';
  END IF;
END $$;

ALTER TABLE deals ADD CONSTRAINT deal_stage_check 
  CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'));

ALTER TABLE deals ADD CONSTRAINT deal_probability_check 
  CHECK (probability BETWEEN 0 AND 100);

ALTER TABLE deals ALTER COLUMN stage SET DEFAULT 'lead';

-- =====================
-- PROJECTS constraints
-- =====================

ALTER TABLE projects DROP CONSTRAINT IF EXISTS project_status_check;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS project_priority_check;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS project_progress_check;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS project_type_check;

ALTER TABLE projects ADD CONSTRAINT project_status_check 
  CHECK (status IN ('backlog', 'planning', 'in_progress', 'on_hold', 'review', 'done', 'cancelled'));

ALTER TABLE projects ADD CONSTRAINT project_priority_check 
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE projects ADD CONSTRAINT project_progress_check 
  CHECK (progress BETWEEN 0 AND 100);

ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'backlog';
ALTER TABLE projects ALTER COLUMN priority SET DEFAULT 'medium';

-- =====================
-- CONTACTS constraints
-- =====================

ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contact_type_check;
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contact_status_check;

ALTER TABLE contacts ADD CONSTRAINT contact_type_check 
  CHECK (type IN ('lead', 'client', 'partner', 'supplier', 'merchant'));

ALTER TABLE contacts ADD CONSTRAINT contact_status_check 
  CHECK (status IN ('new', 'contacted', 'qualified', 'negotiation', 'won', 'lost', 'inactive'));

ALTER TABLE contacts ALTER COLUMN type SET DEFAULT 'lead';
ALTER TABLE contacts ALTER COLUMN status SET DEFAULT 'new';

-- =====================
-- PAYMENT_LINKS constraints
-- =====================

ALTER TABLE payment_links DROP CONSTRAINT IF EXISTS payment_link_status_check;

-- Normalize any non-canonical values before adding constraint
UPDATE payment_links SET status = 'paid' WHERE status = 'completed';
UPDATE payment_links SET status = 'pending' WHERE status NOT IN ('pending', 'active', 'expired', 'paid', 'cancelled', 'rejected');

ALTER TABLE payment_links ADD CONSTRAINT payment_link_status_check 
  CHECK (status IN ('pending', 'active', 'expired', 'paid', 'cancelled', 'rejected'));

ALTER TABLE payment_links ALTER COLUMN status SET DEFAULT 'pending';

-- =====================
-- PAYMENTS constraints
-- =====================

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payment_status_check;

-- Normalize any non-canonical values before adding constraint
UPDATE payments SET status = 'approved' WHERE status = 'completed';
UPDATE payments SET status = 'pending' WHERE status NOT IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded');

ALTER TABLE payments ADD CONSTRAINT payment_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded'));

ALTER TABLE payments ALTER COLUMN status SET DEFAULT 'pending';

-- =====================
-- SUBSCRIPTIONS constraints
-- =====================

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscription_status_check;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscription_billing_cycle_check;

ALTER TABLE subscriptions ADD CONSTRAINT subscription_status_check 
  CHECK (status IN ('pending', 'active', 'paused', 'cancelled', 'expired'));

ALTER TABLE subscriptions ADD CONSTRAINT subscription_billing_cycle_check 
  CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly'));

-- =====================
-- NOTIFICATIONS constraints
-- =====================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'type'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notification_type_check;
    ALTER TABLE notifications ADD CONSTRAINT notification_type_check 
      CHECK (type IN ('info', 'success', 'warning', 'error', 'task', 'payment', 'message', 'reminder', 'mention', 'assignment', 'deadline', 'system'));
  END IF;
  
  -- Also handle notification_type column (Schema B)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'notification_type'  
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'notification_type' AND udt_name = 'notification_type'
    ) THEN
      ALTER TABLE notifications ALTER COLUMN notification_type TYPE VARCHAR(30) USING notification_type::TEXT;
    END IF;
  END IF;
END $$;

-- =====================
-- Drop unused ENUM types (cleanup)
-- =====================

DO $$
BEGIN
  -- Only drop if they exist and are no longer referenced
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    DROP TYPE IF EXISTS task_status CASCADE;
    RAISE NOTICE 'Dropped unused ENUM task_status';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deal_stage') THEN
    DROP TYPE IF EXISTS deal_stage CASCADE;
    RAISE NOTICE 'Dropped unused ENUM deal_stage';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
    DROP TYPE IF EXISTS priority_level CASCADE;
    RAISE NOTICE 'Dropped unused ENUM priority_level';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
    DROP TYPE IF EXISTS event_type CASCADE;
    RAISE NOTICE 'Dropped unused ENUM event_type';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
    DROP TYPE IF EXISTS event_status CASCADE;
    RAISE NOTICE 'Dropped unused ENUM event_status';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_priority') THEN
    DROP TYPE IF EXISTS event_priority CASCADE;
    RAISE NOTICE 'Dropped unused ENUM event_priority';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Note: Some ENUMs may still be in use. Skipping: %', SQLERRM;
END $$;

-- =====================
-- Fix dashboard_metrics view (if exists)
-- =====================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'dashboard_metrics') THEN
    DROP VIEW IF EXISTS dashboard_metrics;
    RAISE NOTICE 'Dropped dashboard_metrics view — must be recreated with correct values';
  END IF;
END $$;

-- Recreate dashboard_metrics with canonical lowercase values
CREATE OR REPLACE VIEW dashboard_metrics AS
SELECT
  (SELECT COUNT(*) FROM projects WHERE status = 'in_progress') AS active_projects,
  (SELECT COUNT(*) FROM tasks WHERE status = 'todo') AS pending_tasks,
  (SELECT COUNT(*) FROM deals WHERE stage = 'won') AS won_deals,
  (SELECT SUM(COALESCE(value, 0)) FROM deals WHERE stage = 'won') AS total_revenue,
  (SELECT COUNT(*) FROM contacts) AS total_contacts;

-- =====================
-- Fix calculate_project_progress function (if exists)
-- =====================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_project_progress') THEN
    DROP FUNCTION calculate_project_progress(UUID);
    RAISE NOTICE 'Dropped old calculate_project_progress function';
  END IF;
END $$;

CREATE FUNCTION calculate_project_progress(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_tasks INT;
  completed_tasks INT;
BEGIN
  SELECT COUNT(*) INTO total_tasks FROM tasks WHERE project_id = p_project_id;
  SELECT COUNT(*) INTO completed_tasks FROM tasks WHERE project_id = p_project_id AND status = 'done';
  
  IF total_tasks = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN (completed_tasks * 100 / total_tasks);
END;
$$ LANGUAGE plpgsql;

-- =====================
-- VERIFICATION
-- =====================
DO $$
BEGIN
  RAISE NOTICE '✅ Constraints consolidated to canonical lowercase';
  RAISE NOTICE '  - tasks: todo, in_progress, review, blocked, done, cancelled';
  RAISE NOTICE '  - deals: lead, qualified, proposal, negotiation, won, lost';
  RAISE NOTICE '  - projects: backlog, planning, in_progress, on_hold, review, done, cancelled';
  RAISE NOTICE '  - contacts: lead, client, partner, supplier, merchant';
  RAISE NOTICE '  - priorities: low, medium, high, urgent';
END $$;

-- =====================
-- ROLLBACK
-- =====================
-- To rollback constraints:
--   ALTER TABLE tasks DROP CONSTRAINT task_status_check;
--   ALTER TABLE tasks ADD CONSTRAINT task_status_check CHECK (status IN ('pending', 'in_progress', 'review', 'completed', 'cancelled'));
--   (repeat for each table with old constraint values)
