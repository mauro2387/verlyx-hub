-- ============================================================
-- MIGRACIÓN 50: PROJECT MILESTONES + AI COACHING SYSTEM
-- ============================================================
-- Creates:
--   1. project_milestones — Milestone/checkpoint tracking per project
--   2. project_ai_logs    — AI conversation history per project
--   3. tasks.milestone_id — Links tasks to milestones
-- ============================================================

-- ==========================================
-- 1. PROJECT_MILESTONES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Timeline
  target_date DATE,
  completed_at TIMESTAMPTZ,
  
  -- Status tracking  
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'at_risk', 'overdue')),
  urgency VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  
  -- Ordering
  sort_order INTEGER NOT NULL DEFAULT 1,
  
  -- Extra data
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX idx_project_milestones_status ON project_milestones(status);
CREATE INDEX idx_project_milestones_target_date ON project_milestones(target_date);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_project_milestones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_milestones_updated_at
BEFORE UPDATE ON project_milestones
FOR EACH ROW
EXECUTE FUNCTION update_project_milestones_updated_at();

-- ==========================================
-- 2. PROJECT_AI_LOGS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS project_ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_project_ai_logs_project_id ON project_ai_logs(project_id);
CREATE INDEX idx_project_ai_logs_created_at ON project_ai_logs(created_at DESC);

-- ==========================================
-- 3. ADD milestone_id TO TASKS
-- ==========================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'milestone_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN milestone_id UUID REFERENCES project_milestones(id) ON DELETE SET NULL;
    CREATE INDEX idx_tasks_milestone_id ON tasks(milestone_id);
  END IF;
END $$;

-- ==========================================
-- 4. RLS POLICIES
-- ==========================================

-- Enable RLS
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_ai_logs ENABLE ROW LEVEL SECURITY;

-- Project Milestones: users can manage milestones for projects they own
CREATE POLICY "project_milestones_select" ON project_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_milestones.project_id
      AND (
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM my_companies mc WHERE mc.id = p.my_company_id AND mc.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "project_milestones_insert" ON project_milestones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_milestones.project_id
      AND (
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM my_companies mc WHERE mc.id = p.my_company_id AND mc.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "project_milestones_update" ON project_milestones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_milestones.project_id
      AND (
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM my_companies mc WHERE mc.id = p.my_company_id AND mc.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "project_milestones_delete" ON project_milestones
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_milestones.project_id
      AND (
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM my_companies mc WHERE mc.id = p.my_company_id AND mc.user_id = auth.uid()
        )
      )
    )
  );

-- AI Logs: users can read/write logs for their own projects
CREATE POLICY "project_ai_logs_select" ON project_ai_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_ai_logs.project_id
      AND (
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM my_companies mc WHERE mc.id = p.my_company_id AND mc.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "project_ai_logs_insert" ON project_ai_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_ai_logs.project_id
      AND (
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM my_companies mc WHERE mc.id = p.my_company_id AND mc.user_id = auth.uid()
        )
      )
    )
  );

-- ==========================================
-- 5. TABLE-LEVEL PERMISSIONS
-- ==========================================
-- RLS handles row-level access, but roles need base table permissions first.
-- Without these GRANTs, PostgREST returns 403 Forbidden.

-- Authenticated users (client-side Supabase calls)
GRANT SELECT, INSERT, UPDATE, DELETE ON project_milestones TO authenticated;
GRANT SELECT, INSERT ON project_ai_logs TO authenticated;

-- Anon (not typically needed, but for completeness)
GRANT SELECT ON project_milestones TO anon;
GRANT SELECT ON project_ai_logs TO anon;

-- Service role (API routes with service_role key bypass RLS)
GRANT ALL ON project_milestones TO service_role;
GRANT ALL ON project_ai_logs TO service_role;

-- ==========================================
-- VERIFICATION
-- ==========================================

DO $$
DECLARE
  milestones_exists BOOLEAN;
  ai_logs_exists BOOLEAN;
  milestone_col_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_milestones') INTO milestones_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_ai_logs') INTO ai_logs_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'milestone_id') INTO milestone_col_exists;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE 'MIGRATION 50 — PROJECT MILESTONES + AI COACHING';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ project_milestones table: %', CASE WHEN milestones_exists THEN 'CREATED' ELSE 'FAILED' END;
  RAISE NOTICE '✅ project_ai_logs table: %', CASE WHEN ai_logs_exists THEN 'CREATED' ELSE 'FAILED' END;
  RAISE NOTICE '✅ tasks.milestone_id column: %', CASE WHEN milestone_col_exists THEN 'ADDED' ELSE 'FAILED' END;
  RAISE NOTICE '================================================';
END $$;
