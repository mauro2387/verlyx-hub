-- =====================================================
-- MIGRACIÓN INCREMENTAL A SISTEMA MULTIEMPRESA
-- =====================================================
-- Este script SOLO agrega columnas faltantes
-- NO elimina ni modifica datos existentes
-- =====================================================

-- =====================================================
-- 1. AGREGAR COLUMNAS A TABLAS EXISTENTES
-- =====================================================

-- COMPANIES: ya existe, solo agregar columnas faltantes si no existen
DO $$ 
BEGIN
  -- Verificar y agregar columnas faltantes una por una
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='owner_user_id') THEN
    -- Si no existe owner_user_id, la tabla companies antigua no tenía esta estructura
    -- Necesitamos reestructurarla manteniendo datos existentes
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS temp_id UUID;
  END IF;
END $$;

-- PROJECTS: agregar company_id y relaciones nuevas
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_organization_id UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deal_id UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS spent_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completion_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- TASKS: agregar company_id y relaciones nuevas
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deal_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- DOCUMENTS: agregar company_id y campos nuevos
ALTER TABLE documents ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deal_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS client_organization_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES documents(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_latest_version BOOLEAN DEFAULT TRUE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_path TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- DEALS: agregar campos faltantes
ALTER TABLE deals ADD COLUMN IF NOT EXISTS client_organization_id UUID;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS value DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS actual_close_date DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source VARCHAR(100);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lost_reason TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE deals ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS next_action_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS next_action_description TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Renombrar contacts.company_id a contacts.client_organization_id para evitar confusión
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='company_id') THEN
    ALTER TABLE contacts RENAME COLUMN company_id TO client_organization_id;
  END IF;
END $$;

-- NOTIFICATIONS: agregar company_id y campos faltantes
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- PAYMENTS: agregar company_id y campos faltantes
ALTER TABLE payments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS external_payment_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS external_reference VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_response JSONB;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- SUBSCRIPTIONS: agregar company_id y campos faltantes
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS client_organization_id UUID;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(20);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_day INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_billing_date DATE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_end_date DATE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_link TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- WORKSPACE_PAGES: agregar company_id y reestructurar
ALTER TABLE workspace_pages ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE workspace_pages ADD COLUMN IF NOT EXISTS parent_page_id UUID REFERENCES workspace_pages(id) ON DELETE CASCADE;
ALTER TABLE workspace_pages ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE workspace_pages ADD COLUMN IF NOT EXISTS path TEXT;
ALTER TABLE workspace_pages ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE workspace_pages ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE workspace_pages ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE workspace_pages ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- AI_CONVERSATIONS: agregar company_id y contextos
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(id) ON DELETE SET NULL;
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS client_id UUID;

-- =====================================================
-- 2. CREAR TABLAS NUEVAS QUE NO EXISTEN
-- =====================================================

-- CLIENT_ORGANIZATIONS (nueva tabla)
CREATE TABLE IF NOT EXISTS client_organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  tax_id VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  notes TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CLIENTS (nueva tabla - diferente de contacts)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_organization_id UUID REFERENCES client_organizations(id) ON DELETE SET NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  position VARCHAR(100),
  type VARCHAR(50) DEFAULT 'contact',
  source VARCHAR(100),
  tags TEXT[],
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  avatar_url TEXT,
  linkedin_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WORKSPACE_BLOCKS (nueva tabla)
CREATE TABLE IF NOT EXISTS workspace_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES workspace_pages(id) ON DELETE CASCADE,
  parent_block_id UUID REFERENCES workspace_blocks(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  properties JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INVOICES (nueva tabla)
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
  status VARCHAR(50) DEFAULT 'draft',
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
  line_items JSONB DEFAULT '[]',
  notes TEXT,
  terms TEXT,
  pdf_document_id UUID REFERENCES documents(id),
  external_invoice_id VARCHAR(255),
  payment_link TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AUTOMATIONS (nueva tabla)
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(100) NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  conditions JSONB DEFAULT '[]',
  actions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AUTOMATION_LOGS (nueva tabla)
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  trigger_data JSONB,
  actions_executed JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AUDIT_LOGS (nueva tabla)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CREAR ÍNDICES PARA COLUMNAS NUEVAS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_org ON projects(client_organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_deal ON projects(deal_id);

CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deal ON tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);

CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_deal ON documents(deal_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_org ON documents(client_organization_id);

CREATE INDEX IF NOT EXISTS idx_deals_client_org ON deals(client_organization_id);

CREATE INDEX IF NOT EXISTS idx_client_orgs_company ON client_organizations(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(client_organization_id);

CREATE INDEX IF NOT EXISTS idx_workspace_blocks_page ON workspace_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_workspace_pages_company ON workspace_pages(company_id);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);

CREATE INDEX IF NOT EXISTS idx_automations_company ON automations(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_company ON ai_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_project ON ai_conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_deal ON ai_conversations(deal_id);

-- =====================================================
-- 4. ACTUALIZAR RLS POLICIES
-- =====================================================

-- PROJECTS: actualizar policies para company_id
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

CREATE POLICY "Company members can view projects" ON projects
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR -- proyectos antiguos sin company_id
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE company_users.company_id = projects.company_id 
      AND company_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can manage projects" ON projects
  FOR ALL TO authenticated
  USING (
    company_id IS NULL OR
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE company_users.company_id = projects.company_id 
      AND company_users.user_id = auth.uid()
    )
  );

-- TASKS: actualizar policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

CREATE POLICY "Company members can view tasks" ON tasks
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE company_users.company_id = tasks.company_id 
      AND company_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can manage tasks" ON tasks
  FOR ALL TO authenticated
  USING (
    company_id IS NULL OR
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE company_users.company_id = tasks.company_id 
      AND company_users.user_id = auth.uid()
    )
  );

-- DOCUMENTS: agregar policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view documents" ON documents
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE company_users.company_id = documents.company_id 
      AND company_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can manage documents" ON documents
  FOR ALL TO authenticated
  USING (
    company_id IS NULL OR
    EXISTS (
      SELECT 1 FROM company_users 
      WHERE company_users.company_id = documents.company_id 
      AND company_users.user_id = auth.uid()
    )
  );

-- CLIENT_ORGANIZATIONS: RLS
ALTER TABLE client_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view client orgs" ON client_organizations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = client_organizations.company_id 
    AND company_users.user_id = auth.uid()
  ));

CREATE POLICY "Company members can manage client orgs" ON client_organizations
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = client_organizations.company_id 
    AND company_users.user_id = auth.uid()
  ));

-- CLIENTS: RLS
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
  ));

-- INVOICES: RLS
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

-- AUTOMATIONS: RLS
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

-- AUDIT_LOGS: RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM company_users 
    WHERE company_users.company_id = audit_logs.company_id 
    AND company_users.user_id = auth.uid()
    AND company_users.role IN ('OWNER', 'ADMIN')
  ));

-- WORKSPACE_BLOCKS: RLS
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
-- 5. TRIGGERS
-- =====================================================

-- Función para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas nuevas que no lo tenían
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
    AND table_schema = 'public'
    AND table_name IN ('client_organizations', 'clients', 'workspace_blocks', 'invoices', 'automations')
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

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================

-- Comentarios
COMMENT ON COLUMN projects.company_id IS 'Empresa a la que pertenece el proyecto';
COMMENT ON COLUMN tasks.company_id IS 'Empresa a la que pertenece la tarea';
COMMENT ON COLUMN documents.company_id IS 'Empresa a la que pertenece el documento';
COMMENT ON TABLE client_organizations IS 'Organizaciones cliente (edificios, comercios, empresas)';
COMMENT ON TABLE clients IS 'Contactos individuales (personas)';
COMMENT ON TABLE workspace_blocks IS 'Bloques de contenido tipo Notion';
COMMENT ON TABLE invoices IS 'Facturas con line items';
COMMENT ON TABLE automations IS 'Workflows automatizados';
COMMENT ON TABLE audit_logs IS 'Registro de auditoría';
