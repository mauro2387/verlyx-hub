-- ============================================
-- PHASE 1 MIGRATION: PRE-FLIGHT CHECKS
-- Run this FIRST to understand current DB state
-- DO NOT run other migrations until you review output
-- ============================================

-- 1. Check which tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Check if Schema B ENUMs exist
SELECT typname, enumlabel 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE typname IN ('task_status', 'deal_stage', 'priority_level', 'project_status', 'audit_action',
                  'member_type', 'member_status', 'contract_type', 'quote_status',
                  'notification_type', 'automation_trigger', 'automation_action',
                  'event_type', 'event_status', 'event_priority',
                  'contact_activity_type', 'communication_direction', 'interaction_sentiment',
                  'lead_temperature', 'segment_type', 'communication_status',
                  'organization_type', 'goal_type', 'goal_period', 'goal_status',
                  'product_type_enum')
ORDER BY typname, enumsortorder;

-- 3. Check current constraint definitions on critical tables
SELECT tc.table_name, tc.constraint_name, tc.constraint_type, cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('tasks', 'deals', 'projects', 'contacts', 'payments', 'payment_links', 'incomes', 'expenses')
  AND tc.constraint_type IN ('CHECK', 'FOREIGN KEY')
ORDER BY tc.table_name, tc.constraint_type;

-- 4. Check column definitions for tasks (Schema A vs B detection)
SELECT column_name, data_type, udt_name, column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Check column definitions for deals
SELECT column_name, data_type, udt_name, column_default
FROM information_schema.columns 
WHERE table_name = 'deals' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Check column definitions for company_users
SELECT column_name, data_type, udt_name
FROM information_schema.columns 
WHERE table_name = 'company_users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Count existing data
SELECT 
  (SELECT COUNT(*) FROM tasks) AS tasks_count,
  (SELECT COUNT(*) FROM deals) AS deals_count,
  (SELECT COUNT(*) FROM projects) AS projects_count,
  (SELECT COUNT(*) FROM contacts) AS contacts_count;

-- 8. Check current values in status/stage columns (detect UPPER vs lower)
SELECT 'tasks' AS table_name, status AS value, COUNT(*) AS cnt FROM tasks GROUP BY status
UNION ALL
SELECT 'tasks_priority', priority, COUNT(*) FROM tasks GROUP BY priority
UNION ALL
SELECT 'deals', stage, COUNT(*) FROM deals GROUP BY stage
UNION ALL
SELECT 'projects', status, COUNT(*) FROM projects GROUP BY status
UNION ALL
SELECT 'contacts', type, COUNT(*) FROM contacts GROUP BY type
ORDER BY table_name, value;

-- 9. Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 10. Check existing triggers
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
