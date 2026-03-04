-- ============================================
-- Migration 41: Fix get_dashboard_stats function
-- ============================================
-- Problem: The function uses wrong status values:
--   - projects: 'active' doesn't exist, should be 'in_progress'
--   - tasks: 'TODO', 'pending', 'IN_PROGRESS' don't exist, should be 'todo', 'in_progress'
--   - deals: 'CLOSED_WON' doesn't exist, should be 'won'
-- ============================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'projectsTotal', (
      SELECT COUNT(*) FROM projects WHERE user_id = p_user_id
    ),
    'projectsInProgress', (
      SELECT COUNT(*) FROM projects 
      WHERE user_id = p_user_id AND status IN ('in_progress', 'planning', 'active')
    ),
    'tasksTotal', (
      SELECT COUNT(*) FROM tasks WHERE user_id = p_user_id
    ),
    'tasksPending', (
      SELECT COUNT(*) FROM tasks 
      WHERE user_id = p_user_id AND status IN ('todo', 'in_progress')
    ),
    'dealsTotal', (
      SELECT COUNT(*) FROM deals WHERE user_id = p_user_id
    ),
    'dealsValue', (
      SELECT COALESCE(SUM(COALESCE(value, amount, 0)), 0) FROM deals 
      WHERE user_id = p_user_id AND stage IN ('won', 'closed_won')
    ),
    'clientsTotal', (
      SELECT COUNT(*) FROM contacts 
      WHERE user_id = p_user_id AND type = 'client'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
