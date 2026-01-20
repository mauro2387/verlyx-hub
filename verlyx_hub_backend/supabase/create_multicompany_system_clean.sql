-- =====================================================
-- VERLYX HUB - SISTEMA MULTIEMPRESA COMPLETO
-- =====================================================
-- Este script crea TODAS las tablas necesarias para el sistema
-- Se ejecuta de manera incremental: NO elimina tablas existentes
-- =====================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. EMPRESAS (COMPANIES)
-- =====================================================

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100), -- 'turismo', 'agencia', 'marca_ropa', 'software', etc.
  description TEXT,
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#6366f1', -- hex color
  secondary_color VARCHAR(7) DEFAULT '#8b5cf6',
  settings JSONB DEFAULT '{}', -- configuraciones adicionales
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);

-- RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their companies" ON companies
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = companies.id 
    AND company_users.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own companies" ON companies
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners can update their companies" ON companies
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Owners can delete their companies" ON companies
  FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());

-- =====================================================
-- 2. USUARIOS POR EMPRESA (COMPANY_USERS)
-- =====================================================

CREATE TABLE IF NOT EXISTS company_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'GUEST', -- OWNER, ADMIN, MANAGER, OPERATIVE, FINANCE, MARKETING, GUEST
  permissions JSONB DEFAULT '{}', -- permisos granulares adicionales
  is_active BOOLEAN DEFAULT TRUE,
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_company_users_company ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user ON company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_role ON company_users(role);

-- RLS
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company members" ON company_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.company_id = company_users.company_id
    AND cu.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage company users" ON company_users
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users cu
    WHERE cu.company_id = company_users.company_id
    AND cu.user_id = auth.uid()
    AND cu.role IN ('OWNER', 'ADMIN')
  ));

-- =====================================================
-- 3. ORGANIZACIONES CLIENTE (CLIENT_ORGANIZATIONS)
-- =====================================================

CREATE TABLE IF NOT EXISTS client_organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100), -- 'building', 'store', 'restaurant', 'hotel', 'office', etc.
  tax_id VARCHAR(50), -- RUT, CUIT, EIN, etc.
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  notes TEXT,
  tags TEXT[], -- ['vip', 'edificio', 'cliente_recurrente']
  custom_fields JSONB DEFAULT '{}',
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_client_orgs_company ON client_organizations(company_id);
CREATE INDEX IF NOT EXISTS idx_client_orgs_type ON client_organizations(type);
CREATE INDEX IF NOT EXISTS idx_client_orgs_tags ON client_organizations USING GIN(tags);

-- RLS
ALTER TABLE client_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view client organizations" ON client_organizations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = client_organizations.company_id 
    AND company_users.user_id = auth.uid()
  ));

CREATE POLICY "Company members can manage client organizations" ON client_organizations
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = client_organizations.company_id 
    AND company_users.user_id = auth.uid()
    AND company_users.role IN ('OWNER', 'ADMIN', 'MANAGER', 'OPERATIVE')
  ));

-- =====================================================
-- 4. CONTACTOS/CLIENTES (CLIENTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_organization_id UUID REFERENCES client_organizations(id) ON DELETE SET NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  position VARCHAR(100), -- cargo en la organizaciÃ³n
  type VARCHAR(50) DEFAULT 'contact', -- 'lead', 'contact', 'customer', 'partner'
  source VARCHAR(100), -- 'web', 'referral', 'cold_call', 'event', etc.
  tags TEXT[],
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  avatar_url TEXT,
  linkedin_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_organization ON clients(client_organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(type);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_tags ON clients USING GIN(tags);

-- RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view clients" ON clients
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = clients.company_id 
    AND company_users.user_id = auth.uid()
  ));

CREATE POLICY "Company members can manage clients" ON clients
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = clients.company_id 
    AND company_users.user_id = auth.uid()
    AND company_users.role IN ('OWNER', 'ADMIN', 'MANAGER', 'OPERATIVE', 'MARKETING')
  ));

-- =====================================================
-- 5. DEALS (CRM PIPELINE)
-- =====================================================

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_organization_id UUID REFERENCES client_organizations(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  stage VARCHAR(50) NOT NULL DEFAULT 'lead', -- lead, contacted, qualified, proposal, negotiation, won, lost
  value DECIMAL(15, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  probability INTEGER DEFAULT 0, -- 0-100
  expected_close_date DATE,
  actual_close_date DATE,
  source VARCHAR(100),
  lost_reason TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  assigned_to UUID ,
  next_action_date TIMESTAMP WITH TIME ZONE,
  next_action_description TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_deals_company ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_client ON deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_assigned ON deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_tags ON deals USING GIN(tags);

-- RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view deals" ON deals
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = deals.company_id 
    AND company_users.user_id = auth.uid()
  ));

CREATE POLICY "Company members can manage deals" ON deals
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = deals.company_id 
    AND company_users.user_id = auth.uid()
    AND company_users.role IN ('OWNER', 'ADMIN', 'MANAGER', 'OPERATIVE', 'MARKETING')
  ));

-- =====================================================
-- 6. PROYECTOS (PROJECTS)
-- =====================================================

-- Agregar columnas faltantes a la tabla projects existente
DO $$ 
BEGIN
  -- company_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='company_id') THEN
    ALTER TABLE projects ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_projects_company ON projects(company_id);
  END IF;
  
  -- client_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='client_id') THEN
    ALTER TABLE projects ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
    CREATE INDEX idx_projects_client ON projects(client_id);
  END IF;
  
  -- client_organization_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='client_organization_id') THEN
    ALTER TABLE projects ADD COLUMN client_organization_id UUID REFERENCES client_organizations(id) ON DELETE SET NULL;
  END IF;
  
  -- deal_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='deal_id') THEN
    ALTER TABLE projects ADD COLUMN deal_id UUID REFERENCES deals(id) ON DELETE SET NULL;
    CREATE INDEX idx_projects_deal ON projects(deal_id);
  END IF;
  
  -- budget
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='budget') THEN
    ALTER TABLE projects ADD COLUMN budget DECIMAL(15, 2);
  END IF;
  
  -- spent_amount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='spent_amount') THEN
    ALTER TABLE projects ADD COLUMN spent_amount DECIMAL(15, 2) DEFAULT 0;
  END IF;
  
  -- currency
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='currency') THEN
    ALTER TABLE projects ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
  END IF;
  
  -- start_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='start_date') THEN
    ALTER TABLE projects ADD COLUMN start_date DATE;
  END IF;
  
  -- due_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='due_date') THEN
    ALTER TABLE projects ADD COLUMN due_date DATE;
  END IF;
  
  -- completion_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='completion_date') THEN
    ALTER TABLE projects ADD COLUMN completion_date DATE;
  END IF;
  
  -- progress_percentage
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='progress_percentage') THEN
    ALTER TABLE projects ADD COLUMN progress_percentage INTEGER DEFAULT 0;
  END IF;
  
  -- project_manager_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='project_manager_id') THEN
    ALTER TABLE projects ADD COLUMN project_manager_id UUID ;
    CREATE INDEX idx_projects_manager ON projects(project_manager_id);
  END IF;
  
  -- tags
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='tags') THEN
    ALTER TABLE projects ADD COLUMN tags TEXT[];
  END IF;
  
  -- custom_fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='custom_fields') THEN
    ALTER TABLE projects ADD COLUMN custom_fields JSONB DEFAULT '{}';
  END IF;
  
  -- is_archived
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='is_archived') THEN
    ALTER TABLE projects ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- created_by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='created_by') THEN
    ALTER TABLE projects ADD COLUMN created_by UUID ;
  END IF;
  
  -- priority
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='projects' AND column_name='priority') THEN
    ALTER TABLE projects ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
  END IF;
END $$;

-- Crear tabla projects solo si NO existe
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'backlog',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices adicionales para projects
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- RLS para projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

CREATE POLICY "Company members can view projects" ON projects
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = projects.company_id 
    AND company_users.user_id = auth.uid()
  ));

CREATE POLICY "Company members can manage projects" ON projects
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = projects.company_id 
    AND company_users.user_id = auth.uid()
    AND company_users.role IN ('OWNER', 'ADMIN', 'MANAGER', 'OPERATIVE')
  ));

-- =====================================================
-- 7. TAREAS (TASKS)
-- =====================================================

-- Agregar columnas faltantes a la tabla tasks existente
DO $$ 
BEGIN
  -- company_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='company_id') THEN
    ALTER TABLE tasks ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_tasks_company ON tasks(company_id);
  END IF;
  
  -- deal_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='deal_id') THEN
    ALTER TABLE tasks ADD COLUMN deal_id UUID REFERENCES deals(id) ON DELETE SET NULL;
    CREATE INDEX idx_tasks_deal ON tasks(deal_id);
  END IF;
  
  -- client_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='client_id') THEN
    ALTER TABLE tasks ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
    CREATE INDEX idx_tasks_client ON tasks(client_id);
  END IF;
  
  -- parent_task_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='parent_task_id') THEN
    ALTER TABLE tasks ADD COLUMN parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;
  
  -- start_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='start_date') THEN
    ALTER TABLE tasks ADD COLUMN start_date TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- completed_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='completed_at') THEN
    ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- estimated_hours
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='estimated_hours') THEN
    ALTER TABLE tasks ADD COLUMN estimated_hours DECIMAL(10, 2);
  END IF;
  
  -- actual_hours
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='actual_hours') THEN
    ALTER TABLE tasks ADD COLUMN actual_hours DECIMAL(10, 2);
  END IF;
  
  -- tags
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='tags') THEN
    ALTER TABLE tasks ADD COLUMN tags TEXT[];
  END IF;
  
  -- custom_fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='custom_fields') THEN
    ALTER TABLE tasks ADD COLUMN custom_fields JSONB DEFAULT '{}';
  END IF;
  
  -- is_archived
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='is_archived') THEN
    ALTER TABLE tasks ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- created_by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='created_by') THEN
    ALTER TABLE tasks ADD COLUMN created_by UUID ;
  END IF;
END $$;

-- Crear tabla tasks solo si NO existe
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo',
  priority VARCHAR(20) DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  assigned_to UUID ,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices adicionales para tasks
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- RLS para tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

CREATE POLICY "Company members can view tasks" ON tasks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = tasks.company_id 
    AND company_users.user_id = auth.uid()
  ));

CREATE POLICY "Company members can manage tasks" ON tasks
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = tasks.company_id 
    AND company_users.user_id = auth.uid()
  ));

-- =====================================================
-- 8. DOCUMENTOS (DOCUMENTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_organization_id UUID REFERENCES client_organizations(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL, -- ruta en Supabase Storage
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100), -- pdf, docx, xlsx, image, etc.
  file_size BIGINT, -- bytes
  mime_type VARCHAR(100),
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  is_latest_version BOOLEAN DEFAULT TRUE,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  folder_path TEXT, -- para organizar en carpetas virtuales
  is_archived BOOLEAN DEFAULT FALSE,
  uploaded_by UUID ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_deal ON documents(deal_id);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_path);

-- RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view documents" ON documents
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = documents.company_id 
    AND company_users.user_id = auth.uid()
  ));

CREATE POLICY "Company members can manage documents" ON documents
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = documents.company_id 
    AND company_users.user_id = auth.uid()
  ));

-- =====================================================
-- 9. WORKSPACE - PÃGINAS (WORKSPACE_PAGES)
-- =====================================================

CREATE TABLE IF NOT EXISTS workspace_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_page_id UUID REFERENCES workspace_pages(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  icon VARCHAR(50), -- emoji o nombre de icono
  cover_image_url TEXT,
  path TEXT, -- ruta jerÃ¡rquica: /page1/subpage1/subpage2
  order_index INTEGER DEFAULT 0,
  is_template BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  permissions JSONB DEFAULT '{}', -- permisos especÃ­ficos de la pÃ¡gina
  created_by UUID ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_workspace_pages_company ON workspace_pages(company_id);
CREATE INDEX IF NOT EXISTS idx_workspace_pages_parent ON workspace_pages(parent_page_id);
CREATE INDEX IF NOT EXISTS idx_workspace_pages_path ON workspace_pages(path);

-- RLS
ALTER TABLE workspace_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view workspace pages" ON workspace_pages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = workspace_pages.company_id 
    AND company_users.user_id = auth.uid()
  ));

CREATE POLICY "Company members can manage workspace pages" ON workspace_pages
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = workspace_pages.company_id 
    AND company_users.user_id = auth.uid()
  ));

-- =====================================================
-- 10. WORKSPACE - BLOQUES (WORKSPACE_BLOCKS)
-- =====================================================

CREATE TABLE IF NOT EXISTS workspace_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES workspace_pages(id) ON DELETE CASCADE,
  parent_block_id UUID REFERENCES workspace_blocks(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- text, heading, list, checklist, table, code, image, embed, relation, etc.
  content JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  properties JSONB DEFAULT '{}', -- propiedades adicionales del bloque
  created_by UUID ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_workspace_blocks_page ON workspace_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_workspace_blocks_parent ON workspace_blocks(parent_block_id);
CREATE INDEX IF NOT EXISTS idx_workspace_blocks_type ON workspace_blocks(type);

-- RLS
ALTER TABLE workspace_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view workspace blocks" ON workspace_blocks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspace_pages wp
    JOIN company_users cu ON cu.company_id = wp.company_id
    WHERE wp.id = workspace_blocks.page_id
    AND cu.user_id = auth.uid()
  ));

CREATE POLICY "Company members can manage workspace blocks" ON workspace_blocks
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspace_pages wp
    JOIN company_users cu ON cu.company_id = wp.company_id
    WHERE wp.id = workspace_blocks.page_id
    AND cu.user_id = auth.uid()
  ));

-- =====================================================
-- 11. FACTURAS (INVOICES)
-- =====================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_organization_id UUID REFERENCES client_organizations(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, viewed, paid, overdue, cancelled, refunded
  amount_subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  amount_tax DECIMAL(15, 2) DEFAULT 0,
  amount_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(15, 2) DEFAULT 0,
  amount_due DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  issue_date DATE NOT NULL,
  due_date DATE,
  paid_date DATE,
  line_items JSONB DEFAULT '[]', -- [{description, quantity, unit_price, amount}]
  notes TEXT,
  terms TEXT,
  pdf_document_id UUID REFERENCES documents(id),
  external_invoice_id VARCHAR(255), -- ID de sistema externo (MercadoPago, etc.)
  payment_link TEXT,
  created_by UUID ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view invoices" ON invoices
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = invoices.company_id 
    AND company_users.user_id = auth.uid()
  ));

CREATE POLICY "Finance members can manage invoices" ON invoices
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = invoices.company_id 
    AND company_users.user_id = auth.uid()
    AND company_users.role IN ('OWNER', 'ADMIN', 'FINANCE')
  ));

-- =====================================================
-- 12. PAGOS (PAYMENTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL, -- pending, processing, paid, failed, refunded, cancelled
  payment_method VARCHAR(50), -- card, bank_transfer, cash, check, wallet, etc.
  external_payment_id VARCHAR(255), -- ID de MercadoPago/Stripe
  external_reference VARCHAR(255),
  transaction_id VARCHAR(255),
  payment_date TIMESTAMP WITH TIME ZONE,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  gateway VARCHAR(50), -- mercadopago, stripe, paypal, etc.
  gateway_response JSONB,
  created_by UUID ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_payment_id);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view payments" ON payments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = payments.company_id 
    AND company_users.user_id = auth.uid()
  ));

CREATE POLICY "Finance members can manage payments" ON payments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = payments.company_id 
    AND company_users.user_id = auth.uid()
    AND company_users.role IN ('OWNER', 'ADMIN', 'FINANCE')
  ));

-- =====================================================
-- 13. SUSCRIPCIONES (SUBSCRIPTIONS)
-- =====================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_organization_id UUID REFERENCES client_organizations(id) ON DELETE SET NULL,
  plan_name VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_interval VARCHAR(20) NOT NULL, -- monthly, quarterly, yearly
  billing_day INTEGER, -- dÃ­a del mes para cobro
  status VARCHAR(50) DEFAULT 'active', -- active, paused, cancelled, expired, pending
  start_date DATE NOT NULL,
  end_date DATE,
  next_billing_date DATE,
  last_billing_date DATE,
  trial_end_date DATE,
  external_subscription_id VARCHAR(255), -- preapproval_id de MercadoPago
  payment_link TEXT,
  auto_renew BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_by UUID ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_client ON subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view subscriptions" ON subscriptions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = subscriptions.company_id 
    AND company_users.user_id = auth.uid()
  ));

CREATE POLICY "Finance members can manage subscriptions" ON subscriptions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = subscriptions.company_id 
    AND company_users.user_id = auth.uid()
    AND company_users.role IN ('OWNER', 'ADMIN', 'FINANCE')
  ));

-- =====================================================
-- 14. AUTOMATIZACIONES (AUTOMATIONS)
-- =====================================================

CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(100) NOT NULL, -- new_deal, deal_stage_changed, payment_success, task_overdue, time_based, etc.
  trigger_config JSONB DEFAULT '{}',
  conditions JSONB DEFAULT '[]', -- condiciones a evaluar
  actions JSONB DEFAULT '[]', -- acciones a ejecutar
  is_active BOOLEAN DEFAULT TRUE,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_automations_company ON automations(company_id);
CREATE INDEX IF NOT EXISTS idx_automations_trigger ON automations(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automations_active ON automations(is_active);

-- RLS
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view automations" ON automations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = automations.company_id 
    AND company_users.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage automations" ON automations
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = automations.company_id 
    AND company_users.user_id = auth.uid()
    AND company_users.role IN ('OWNER', 'ADMIN')
  ));

-- =====================================================
-- 15. LOGS DE AUTOMATIZACIONES (AUTOMATION_LOGS)
-- =====================================================

CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL, -- success, failed, partial
  trigger_data JSONB,
  actions_executed JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_automation_logs_automation ON automation_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_company ON automation_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_executed ON automation_logs(executed_at);

-- =====================================================
-- 16. NOTIFICACIONES (NOTIFICATIONS)
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL, -- task_assigned, deal_won, payment_received, mention, etc.
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link TEXT, -- deep link a la entidad relacionada
  entity_type VARCHAR(50), -- Deal, Task, Invoice, etc.
  entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- 17. AUDITORÃA (AUDIT_LOGS)
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID,
  action VARCHAR(50) NOT NULL, -- create, update, delete, login, permission_change, etc.
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  changes JSONB, -- diff de cambios
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = audit_logs.company_id 
    AND company_users.user_id = auth.uid()
    AND company_users.role IN ('OWNER', 'ADMIN')
  ));

-- =====================================================
-- 18. CONVERSACIONES IA (actualizar con company_id)
-- =====================================================

-- Agregar company_id a ai_conversations (si no existe)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='ai_conversations' AND column_name='company_id') THEN
    ALTER TABLE ai_conversations ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    CREATE INDEX idx_ai_conversations_company ON ai_conversations(company_id);
  END IF;
  
  -- Agregar campos de contexto adicionales
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='ai_conversations' AND column_name='project_id') THEN
    ALTER TABLE ai_conversations ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
    ALTER TABLE ai_conversations ADD COLUMN deal_id UUID REFERENCES deals(id) ON DELETE SET NULL;
    ALTER TABLE ai_conversations ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
    CREATE INDEX idx_ai_conversations_project ON ai_conversations(project_id);
    CREATE INDEX idx_ai_conversations_deal ON ai_conversations(deal_id);
    CREATE INDEX idx_ai_conversations_client ON ai_conversations(client_id);
  END IF;
END $$;

-- Actualizar RLS policies de ai_conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON ai_conversations;

CREATE POLICY "Company members can view ai conversations" ON ai_conversations
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE company_users.company_id = ai_conversations.company_id 
      AND company_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can create ai conversations" ON ai_conversations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own ai conversations" ON ai_conversations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own ai conversations" ON ai_conversations
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- TRIGGERS Y FUNCIONES
-- =====================================================

-- FunciÃ³n para actualizar updated_at automÃ¡ticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de updated_at a todas las tablas relevantes
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
    AND table_schema = 'public'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;

-- FunciÃ³n para auto-crear CompanyUser cuando se crea una Company
CREATE OR REPLACE FUNCTION auto_add_owner_to_company()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO company_users (company_id, user_id, role)
  VALUES (NEW.id, NEW.owner_user_id, 'OWNER');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_add_owner_to_company_trigger ON companies;
CREATE TRIGGER auto_add_owner_to_company_trigger
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_owner_to_company();

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÃ“N
-- =====================================================

COMMENT ON TABLE companies IS 'Empresas internas del dueÃ±o (Verlyx, PulsarMoon, VOVO, etc.)';
COMMENT ON TABLE company_users IS 'RelaciÃ³n usuario-empresa con roles y permisos';
COMMENT ON TABLE client_organizations IS 'Organizaciones cliente (edificios, comercios, empresas cliente)';
COMMENT ON TABLE clients IS 'Contactos/personas dentro de organizaciones o individuales';
COMMENT ON TABLE deals IS 'Oportunidades de venta en el CRM pipeline';
COMMENT ON TABLE projects IS 'Proyectos de cada empresa';
COMMENT ON TABLE tasks IS 'Tareas vinculadas a proyectos, deals, clientes';
COMMENT ON TABLE documents IS 'Documentos con versionado y relaciones mÃºltiples';
COMMENT ON TABLE workspace_pages IS 'PÃ¡ginas estilo Notion para cada empresa';
COMMENT ON TABLE workspace_blocks IS 'Bloques de contenido dentro de pÃ¡ginas workspace';
COMMENT ON TABLE invoices IS 'Facturas con line items y estados';
COMMENT ON TABLE payments IS 'Pagos vinculados a facturas o suscripciones';
COMMENT ON TABLE subscriptions IS 'Suscripciones recurrentes de clientes';
COMMENT ON TABLE automations IS 'DefiniciÃ³n de workflows automatizados';
COMMENT ON TABLE automation_logs IS 'Registro de ejecuciones de automatizaciones';
COMMENT ON TABLE notifications IS 'Notificaciones internas para usuarios';
COMMENT ON TABLE audit_logs IS 'Registro de auditorÃ­a de todas las acciones';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

