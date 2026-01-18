# Esquema de Base de Datos - Verlyx Hub

## 1. Diagrama ER Simplificado

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  profiles   │────┐    │   contacts   │────┬───│  companies  │
│             │    │    │              │    │    │             │
│ - id (PK)   │    │    │ - id (PK)    │    │    │ - id (PK)   │
│ - email     │    │    │ - name       │    │    │ - name      │
│ - role      │    │    │ - email      │    │    │ - type      │
└─────────────┘    │    │ - type       │    │    └─────────────┘
                   │    │ - status     │    │
                   │    │ - company_id │────┘
                   │    └──────────────┘
                   │           │
                   │           │
                   │    ┌──────▼───────┐
                   │    │    deals     │
                   │    │              │
                   │    │ - id (PK)    │
                   │    │ - contact_id │
                   │    │ - amount     │
                   │    │ - status     │
                   │    └──────────────┘
                   │
                   │    ┌──────────────┐
                   └───>│   projects   │
                        │              │
                        │ - id (PK)    │
                        │ - name       │
                        │ - owner_id   │
                        │ - status     │
                        └──────┬───────┘
                               │
                        ┌──────┴───────┐
                        │              │
                   ┌────▼─────┐   ┌───▼───────┐
                   │  tasks   │   │ documents │
                   └──────────┘   └───────────┘

┌──────────────┐         ┌───────────────┐
│ subscriptions│────────>│   payments    │
│              │         │               │
│ - id (PK)    │         │ - id (PK)     │
│ - customer_id│         │ - amount      │
│ - plan       │         │ - status      │
│ - status     │         │ - method      │
└──────────────┘         └───────────────┘

┌──────────────────┐         ┌──────────────┐
│ ai_conversations │────────>│ ai_messages  │
│                  │         │              │
│ - id (PK)        │         │ - id (PK)    │
│ - user_id        │         │ - conv_id    │
│ - context_type   │         │ - role       │
└──────────────────┘         │ - content    │
                             └──────────────┘
```

## 2. Tablas Principales

### 2.1 Authentication & Users

#### profiles

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  avatar_url TEXT,
  phone VARCHAR(50),
  timezone VARCHAR(100) DEFAULT 'America/Montevideo',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT role_check CHECK (role IN ('owner', 'admin', 'staff', 'readonly'))
);

-- Indices
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2.2 CRM Module

#### contacts

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Información básica
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  
  -- Clasificación
  type VARCHAR(50) NOT NULL DEFAULT 'lead',
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  source VARCHAR(100),
  
  -- Relaciones
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Información adicional
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Uruguay',
  notes TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_contacted_at TIMESTAMPTZ,
  
  CONSTRAINT type_check CHECK (type IN ('lead', 'client', 'partner', 'merchant')),
  CONSTRAINT status_check CHECK (status IN ('new', 'contacted', 'qualified', 'negotiation', 'won', 'lost', 'inactive'))
);

-- Índices
CREATE INDEX idx_contacts_type ON contacts(type);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_contacts_assigned_to ON contacts(assigned_to);
CREATE INDEX idx_contacts_created_at ON contacts(created_at DESC);

-- RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all contacts"
  ON contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Only owner and admin can modify contacts"
  ON contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
```

#### companies

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  
  -- Contacto
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(255),
  
  -- Dirección
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Uruguay',
  
  -- Clasificación (para Verlyx)
  category VARCHAR(100),
  industry VARCHAR(100),
  
  -- Información adicional
  tax_id VARCHAR(100),
  notes TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT type_check CHECK (type IN ('client', 'partner', 'building', 'merchant', 'supplier'))
);

-- Índices
CREATE INDEX idx_companies_type ON companies(type);
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_city ON companies(city);

-- RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view companies"
  ON companies FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
  );
```

#### interactions

```sql
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  type VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  notes TEXT,
  
  -- Información adicional
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT type_check CHECK (type IN ('call', 'email', 'meeting', 'note', 'task', 'whatsapp'))
);

-- Índices
CREATE INDEX idx_interactions_contact_id ON interactions(contact_id);
CREATE INDEX idx_interactions_user_id ON interactions(user_id);
CREATE INDEX idx_interactions_created_at ON interactions(created_at DESC);

-- RLS
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view interactions"
  ON interactions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
  );
```

#### deals

```sql
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Financiero
  amount DECIMAL(15, 2),
  currency VARCHAR(3) DEFAULT 'UYU',
  probability INTEGER DEFAULT 50,
  
  -- Estado
  stage VARCHAR(50) NOT NULL DEFAULT 'qualification',
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  
  -- Fechas
  expected_close_date DATE,
  closed_at TIMESTAMPTZ,
  
  -- Asignación
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Metadata
  source VARCHAR(100),
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT stage_check CHECK (stage IN ('qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  CONSTRAINT status_check CHECK (status IN ('open', 'won', 'lost'))
);

-- Índices
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_owner_id ON deals(owner_id);
```

### 2.3 Projects Module

#### projects

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Clasificación
  business_unit VARCHAR(50) NOT NULL,
  type VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  priority VARCHAR(20) DEFAULT 'medium',
  
  -- Relaciones
  client_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Financiero
  budget_amount DECIMAL(15, 2),
  actual_amount DECIMAL(15, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'UYU',
  
  -- Fechas
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  
  -- Progreso
  progress_percentage INTEGER DEFAULT 0,
  
  -- Metadata
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT business_unit_check CHECK (business_unit IN ('pulsarmoon', 'verlyx_buildings', 'verlyx_tourism', 'other')),
  CONSTRAINT status_check CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')),
  CONSTRAINT priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Índices
CREATE INDEX idx_projects_business_unit ON projects(business_unit);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_due_date ON projects(due_date);

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects"
  ON projects FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
  );
```

#### tasks

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Clasificación
  status VARCHAR(50) NOT NULL DEFAULT 'todo',
  priority VARCHAR(20) DEFAULT 'medium',
  
  -- Relaciones
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Relación genérica (para tareas no asociadas a proyectos)
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  
  -- Fechas
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  estimated_hours DECIMAL(5, 2),
  actual_hours DECIMAL(5, 2),
  tags TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT status_check CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'cancelled')),
  CONSTRAINT priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Índices
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_related_entity ON tasks(related_entity_type, related_entity_id);
```

### 2.4 Payments Module

#### payment_links

```sql
CREATE TABLE payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación externa
  external_id VARCHAR(255) UNIQUE,
  payment_url TEXT NOT NULL,
  
  -- Información del pago
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'UYU',
  description TEXT,
  
  -- Estado
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  
  -- Relaciones
  customer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Fechas
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT status_check CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled'))
);

-- Índices
CREATE INDEX idx_payment_links_external_id ON payment_links(external_id);
CREATE INDEX idx_payment_links_customer_id ON payment_links(customer_id);
CREATE INDEX idx_payment_links_status ON payment_links(status);
CREATE INDEX idx_payment_links_created_at ON payment_links(created_at DESC);
```

#### subscriptions

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación externa
  external_subscription_id VARCHAR(255) UNIQUE,
  
  -- Cliente
  customer_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  
  -- Plan
  plan_name VARCHAR(255) NOT NULL,
  plan_type VARCHAR(100),
  
  -- Financiero
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'UYU',
  billing_frequency VARCHAR(50) NOT NULL,
  
  -- Estado
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  
  -- Fechas
  start_date DATE NOT NULL,
  end_date DATE,
  next_billing_date DATE,
  cancelled_at TIMESTAMPTZ,
  
  -- Metadata
  payment_method_info JSONB,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT billing_frequency_check CHECK (billing_frequency IN ('monthly', 'quarterly', 'yearly')),
  CONSTRAINT status_check CHECK (status IN ('active', 'paused', 'cancelled', 'failed'))
);

-- Índices
CREATE INDEX idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing_date ON subscriptions(next_billing_date);
```

#### payments

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación externa
  external_payment_id VARCHAR(255) UNIQUE,
  
  -- Relaciones
  customer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  payment_link_id UUID REFERENCES payment_links(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Información del pago
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'UYU',
  
  -- Estado y método
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(100),
  
  -- Descripción
  description TEXT,
  
  -- Fechas
  paid_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT status_check CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))
);

-- Índices
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX idx_payments_external_id ON payments(external_payment_id);
```

### 2.5 AI Module

#### ai_conversations

```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  title VARCHAR(255),
  
  -- Contexto
  context_type VARCHAR(50),
  context_id UUID,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT context_type_check CHECK (
    context_type IN ('general', 'contact', 'project', 'deal', 'document')
  )
);

-- Índices
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_context ON ai_conversations(context_type, context_id);
CREATE INDEX idx_ai_conversations_created_at ON ai_conversations(created_at DESC);
```

#### ai_messages

```sql
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  
  -- Metadata
  tokens_used INTEGER,
  model VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT role_check CHECK (role IN ('system', 'user', 'assistant'))
);

-- Índices
CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created_at ON ai_messages(created_at);
```

### 2.6 Documents Module

#### documents

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Archivo
  file_type VARCHAR(100),
  file_size BIGINT,
  storage_path TEXT NOT NULL,
  
  -- Relación genérica
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  
  -- Propietario
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT related_entity_type_check CHECK (
    related_entity_type IN ('contact', 'company', 'project', 'deal', 'task', 'payment')
  )
);

-- Índices
CREATE INDEX idx_documents_related_entity ON documents(related_entity_type, related_entity_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
```

### 2.7 Notifications Module

#### notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  
  -- Estado
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Acción
  action_url TEXT,
  
  -- Relación
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT type_check CHECK (
    type IN ('payment', 'task', 'project', 'ai', 'system', 'reminder')
  )
);

-- Índices
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

## 3. Views útiles

### Dashboard Metrics View

```sql
CREATE OR REPLACE VIEW dashboard_metrics AS
SELECT
  -- Total de clientes activos
  (SELECT COUNT(*) FROM contacts WHERE type = 'client') as total_clients,
  
  -- Total de leads
  (SELECT COUNT(*) FROM contacts WHERE type = 'lead' AND status NOT IN ('won', 'lost')) as total_leads,
  
  -- Proyectos activos
  (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
  
  -- Ingresos del mes actual
  (SELECT COALESCE(SUM(amount), 0) 
   FROM payments 
   WHERE status = 'completed' 
   AND created_at >= date_trunc('month', CURRENT_DATE)) as monthly_revenue,
  
  -- Pagos pendientes
  (SELECT COUNT(*) FROM payment_links WHERE status = 'pending') as pending_payments,
  
  -- Tareas pendientes
  (SELECT COUNT(*) FROM tasks WHERE status IN ('todo', 'in_progress')) as pending_tasks;
```

### Recent Activity View

```sql
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
  'payment' as activity_type,
  id,
  description as title,
  amount::text as detail,
  created_at
FROM payments
WHERE created_at >= NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
  'project' as activity_type,
  id,
  name as title,
  status as detail,
  created_at
FROM projects
WHERE created_at >= NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
  'contact' as activity_type,
  id,
  first_name || ' ' || COALESCE(last_name, '') as title,
  status as detail,
  created_at
FROM contacts
WHERE created_at >= NOW() - INTERVAL '30 days'

ORDER BY created_at DESC
LIMIT 50;
```

## 4. Funciones Útiles

### Calcular progreso de proyecto

```sql
CREATE OR REPLACE FUNCTION calculate_project_progress(project_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tasks
  FROM tasks
  WHERE project_id = project_uuid;
  
  IF total_tasks = 0 THEN
    RETURN 0;
  END IF;
  
  SELECT COUNT(*) INTO completed_tasks
  FROM tasks
  WHERE project_id = project_uuid AND status = 'done';
  
  RETURN (completed_tasks * 100) / total_tasks;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar automáticamente
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET progress_percentage = calculate_project_progress(NEW.project_id)
  WHERE id = NEW.project_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_status_changed
AFTER INSERT OR UPDATE OF status ON tasks
FOR EACH ROW
WHEN (NEW.project_id IS NOT NULL)
EXECUTE FUNCTION update_project_progress();
```

## 5. Scripts de Migración

### Script inicial

```sql
-- 001_initial_schema.sql

BEGIN;

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear todas las tablas en orden
-- (Copiar definiciones anteriores)

COMMIT;
```

### Seeds para desarrollo

```sql
-- seeds/dev_data.sql

BEGIN;

-- Crear usuario owner
INSERT INTO profiles (id, email, full_name, role)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'owner@verlyx.com', 'Owner Verlyx', 'owner'),
  ('00000000-0000-0000-0000-000000000002', 'admin@verlyx.com', 'Admin User', 'admin');

-- Crear algunos contactos de ejemplo
INSERT INTO contacts (first_name, last_name, email, type, status)
VALUES
  ('Juan', 'Pérez', 'juan@example.com', 'lead', 'new'),
  ('María', 'González', 'maria@example.com', 'client', 'qualified'),
  ('Carlos', 'Rodríguez', 'carlos@example.com', 'partner', 'won');

-- Crear proyecto de ejemplo
INSERT INTO projects (name, description, business_unit, status, owner_id)
VALUES
  ('Desarrollo Web Empresa ABC', 'Sitio web corporativo', 'pulsarmoon', 'active', '00000000-0000-0000-0000-000000000001'),
  ('Sistema Edificio Torre Central', 'Sistema de gestión', 'verlyx_buildings', 'active', '00000000-0000-0000-0000-000000000001');

COMMIT;
```

## 6. Índices y Optimizaciones

### Índices compuestos adicionales

```sql
-- Para búsquedas frecuentes de contactos
CREATE INDEX idx_contacts_type_status ON contacts(type, status);
CREATE INDEX idx_contacts_company_assigned ON contacts(company_id, assigned_to);

-- Para dashboard de proyectos
CREATE INDEX idx_projects_status_business ON projects(status, business_unit);
CREATE INDEX idx_projects_dates ON projects(start_date, due_date);

-- Para reportes financieros
CREATE INDEX idx_payments_date_status ON payments(created_at DESC, status);
CREATE INDEX idx_subscriptions_billing ON subscriptions(next_billing_date, status);

-- Para búsqueda de tareas
CREATE INDEX idx_tasks_assigned_status ON tasks(assigned_to, status);
CREATE INDEX idx_tasks_due_status ON tasks(due_date, status);
```

### Particionamiento (para escala futura)

```sql
-- Particionar tabla de payments por fecha
CREATE TABLE payments_partitioned (
  LIKE payments INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Crear particiones por mes
CREATE TABLE payments_2024_01 PARTITION OF payments_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE payments_2024_02 PARTITION OF payments_partitioned
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- etc.
```

## 7. Backups y Mantenimiento

### Script de backup automatizado

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="verlyx_hub"

# Backup completo
pg_dump -U postgres -d $DB_NAME -F c -f "$BACKUP_DIR/verlyx_hub_$DATE.dump"

# Comprimir
gzip "$BACKUP_DIR/verlyx_hub_$DATE.dump"

# Limpiar backups antiguos (más de 30 días)
find $BACKUP_DIR -name "verlyx_hub_*.dump.gz" -mtime +30 -delete
```

### Vacuum y análisis

```sql
-- Ejecutar periódicamente
VACUUM ANALYZE contacts;
VACUUM ANALYZE projects;
VACUUM ANALYZE payments;
VACUUM ANALYZE ai_messages;
```

---

**Total de Tablas**: 15 principales
**Triggers**: 3
**Views**: 2
**Functions**: 2

Este esquema está diseñado para soportar todas las funcionalidades descritas en los requisitos, con flexibilidad para agregar nuevos negocios y features en el futuro.
