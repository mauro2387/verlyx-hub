-- ============================================
-- PHASE 1-B, STEP 3: NORMALIZE VALUES TO LOWERCASE
-- Converts any UPPERCASE enum/status values to canonical lowercase
-- Run AFTER pre-flight check confirms which schema is deployed
-- ============================================

-- IMPORTANT: Adjust this script based on pre-flight check results.
-- If Schema B ENUMs are deployed, you must handle the ENUM->VARCHAR conversion
-- differently than if Schema A CHECK constraints are deployed.

-- =====================
-- SCENARIO A: Schema A is deployed (VARCHAR + CHECK constraints)
-- Just update the data values if any UPPERCASE exists
-- =====================

-- Tasks: normalize status
UPDATE tasks SET status = LOWER(status) WHERE status != LOWER(status);
-- Map Schema A values to canonical
UPDATE tasks SET status = 'todo' WHERE status = 'pending';
UPDATE tasks SET status = 'done' WHERE status = 'completed';

-- Tasks: normalize priority
UPDATE tasks SET priority = LOWER(priority) WHERE priority != LOWER(priority);

-- Deals: normalize stage
UPDATE deals SET stage = LOWER(stage) WHERE stage != LOWER(stage);
-- Map CLOSED_WON/CLOSED_LOST to won/lost
UPDATE deals SET stage = 'won' WHERE LOWER(stage) = 'closed_won';
UPDATE deals SET stage = 'lost' WHERE LOWER(stage) = 'closed_lost';

-- Projects: normalize status
UPDATE projects SET status = LOWER(status) WHERE status != LOWER(status);
-- Map old values to canonical
UPDATE projects SET status = 'in_progress' WHERE status = 'active';
UPDATE projects SET status = 'done' WHERE status = 'completed';

-- Projects: normalize priority
UPDATE projects SET priority = LOWER(priority) WHERE priority != LOWER(priority);

-- Contacts: normalize type (should already be lowercase)
UPDATE contacts SET type = LOWER(type) WHERE type != LOWER(type);

-- =====================
-- VERIFICATION
-- =====================
DO $$
DECLARE
  upper_tasks INT;
  upper_deals INT;
  upper_projects INT;
BEGIN
  SELECT COUNT(*) INTO upper_tasks FROM tasks WHERE status != LOWER(status) OR priority != LOWER(priority);
  SELECT COUNT(*) INTO upper_deals FROM deals WHERE stage != LOWER(stage);
  SELECT COUNT(*) INTO upper_projects FROM projects WHERE status != LOWER(status) OR priority != LOWER(priority);
  
  IF upper_tasks = 0 AND upper_deals = 0 AND upper_projects = 0 THEN
    RAISE NOTICE '✅ All values normalized to lowercase';
  ELSE
    RAISE WARNING '⚠️ Some values still uppercase: tasks=%, deals=%, projects=%', upper_tasks, upper_deals, upper_projects;
  END IF;
END $$;

-- Verify final values
SELECT 'tasks_status' AS field, status AS value, COUNT(*) FROM tasks GROUP BY status
UNION ALL
SELECT 'tasks_priority', priority, COUNT(*) FROM tasks GROUP BY priority
UNION ALL
SELECT 'deals_stage', stage, COUNT(*) FROM deals GROUP BY stage
UNION ALL
SELECT 'projects_status', status, COUNT(*) FROM projects GROUP BY status
UNION ALL
SELECT 'projects_priority', priority, COUNT(*) FROM projects GROUP BY priority
UNION ALL
SELECT 'contacts_type', type, COUNT(*) FROM contacts GROUP BY type
ORDER BY 1, 2;

-- =====================
-- ROLLBACK
-- =====================
-- Data migration cannot be perfectly rolled back since we merged values (e.g., pending→todo).
-- To approximate rollback:
--   UPDATE tasks SET status = UPPER(status);
--   UPDATE tasks SET status = 'CLOSED_WON' WHERE status = 'WON';
--   UPDATE tasks SET status = 'CLOSED_LOST' WHERE status = 'LOST';
--   UPDATE deals SET stage = UPPER(stage);
--   UPDATE projects SET status = UPPER(status);
