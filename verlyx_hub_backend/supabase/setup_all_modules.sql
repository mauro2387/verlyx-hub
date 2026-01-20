-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  client_id UUID,
  budget VARCHAR(100),
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update projects" ON projects;
DROP POLICY IF EXISTS "Users can delete projects" ON projects;

CREATE POLICY "Users can view all projects" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create projects" ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update projects" ON projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete projects" ON projects FOR DELETE TO authenticated USING (true);

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'cancelled')),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP WITH TIME ZONE,
  project_id UUID,
  assigned_to UUID,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_assigned_to FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON tasks;

CREATE POLICY "Users can view all tasks" ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update tasks" ON tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete tasks" ON tasks FOR DELETE TO authenticated USING (true);

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  description TEXT,
  folder VARCHAR(200),
  project_id UUID,
  tags TEXT[],
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  CONSTRAINT fk_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all documents" ON documents;
DROP POLICY IF EXISTS "Users can create documents" ON documents;
DROP POLICY IF EXISTS "Users can update documents" ON documents;
DROP POLICY IF EXISTS "Users can delete documents" ON documents;

CREATE POLICY "Users can view all documents" ON documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create documents" ON documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update documents" ON documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete documents" ON documents FOR DELETE TO authenticated USING (true);

-- ============================================
-- WORKSPACE (NOTION-STYLE) TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS workspace_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  icon VARCHAR(50),
  parent_id UUID,
  content JSONB DEFAULT '[]'::jsonb,
  page_type VARCHAR(50) NOT NULL CHECK (page_type IN ('page', 'note', 'goal', 'checklist', 'board')),
  is_favorite BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_parent FOREIGN KEY (parent_id) REFERENCES workspace_pages(id) ON DELETE CASCADE,
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_pages_parent_id ON workspace_pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_workspace_pages_page_type ON workspace_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_workspace_pages_created_by ON workspace_pages(created_by);
CREATE INDEX IF NOT EXISTS idx_workspace_pages_is_favorite ON workspace_pages(is_favorite);

ALTER TABLE workspace_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all workspace pages" ON workspace_pages;
DROP POLICY IF EXISTS "Users can create workspace pages" ON workspace_pages;
DROP POLICY IF EXISTS "Users can update workspace pages" ON workspace_pages;
DROP POLICY IF EXISTS "Users can delete workspace pages" ON workspace_pages;

CREATE POLICY "Users can view all workspace pages" ON workspace_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create workspace pages" ON workspace_pages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update workspace pages" ON workspace_pages FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete workspace pages" ON workspace_pages FOR DELETE TO authenticated USING (true);

-- ============================================
-- PDF TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS pdf_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('contract', 'invoice', 'receipt', 'quote', 'report')),
  template_data JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pdf_templates_template_type ON pdf_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_is_active ON pdf_templates(is_active);

ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all pdf templates" ON pdf_templates;
DROP POLICY IF EXISTS "Users can create pdf templates" ON pdf_templates;
DROP POLICY IF EXISTS "Users can update pdf templates" ON pdf_templates;
DROP POLICY IF EXISTS "Users can delete pdf templates" ON pdf_templates;

CREATE POLICY "Users can view all pdf templates" ON pdf_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create pdf templates" ON pdf_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update pdf templates" ON pdf_templates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete pdf templates" ON pdf_templates FOR DELETE TO authenticated USING (true);

-- ============================================
-- GENERATED PDFS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS generated_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  document_data JSONB NOT NULL,
  related_contact_id UUID,
  related_project_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_template FOREIGN KEY (template_id) REFERENCES pdf_templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_related_contact FOREIGN KEY (related_contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  CONSTRAINT fk_related_project FOREIGN KEY (related_project_id) REFERENCES projects(id) ON DELETE SET NULL,
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_generated_pdfs_template_id ON generated_pdfs(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_pdfs_related_contact_id ON generated_pdfs(related_contact_id);
CREATE INDEX IF NOT EXISTS idx_generated_pdfs_related_project_id ON generated_pdfs(related_project_id);

ALTER TABLE generated_pdfs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all generated pdfs" ON generated_pdfs;
DROP POLICY IF EXISTS "Users can create generated pdfs" ON generated_pdfs;
DROP POLICY IF EXISTS "Users can delete generated pdfs" ON generated_pdfs;

CREATE POLICY "Users can view all generated pdfs" ON generated_pdfs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create generated pdfs" ON generated_pdfs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can delete generated pdfs" ON generated_pdfs FOR DELETE TO authenticated USING (true);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_pages_updated_at ON workspace_pages;
CREATE TRIGGER update_workspace_pages_updated_at
  BEFORE UPDATE ON workspace_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pdf_templates_updated_at ON pdf_templates;
CREATE TRIGGER update_pdf_templates_updated_at
  BEFORE UPDATE ON pdf_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
