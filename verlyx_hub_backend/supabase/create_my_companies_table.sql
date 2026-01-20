-- ============================================
-- MY COMPANIES TABLE
-- Tabla para las empresas propias del usuario (Verlyx, PulsarMoon, Venta de Vapes, etc.)
-- ============================================

CREATE TABLE IF NOT EXISTS my_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  description TEXT,
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#6366f1',
  secondary_color VARCHAR(7) DEFAULT '#8b5cf6',
  
  -- Business info
  tax_id VARCHAR(100),
  industry VARCHAR(100),
  website VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Uruguay',
  
  -- Settings
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT my_company_type_check CHECK (type IN (
    'technology',
    'consulting',
    'retail',
    'services',
    'education',
    'health',
    'finance',
    'manufacturing',
    'real_estate',
    'marketing',
    'design',
    'legal',
    'other'
  ))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_my_companies_owner ON my_companies(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_my_companies_type ON my_companies(type);
CREATE INDEX IF NOT EXISTS idx_my_companies_active ON my_companies(is_active);

-- RLS Policies
ALTER TABLE my_companies ENABLE ROW LEVEL SECURITY;

-- Users can only see their own companies
CREATE POLICY "Users can view their own companies"
  ON my_companies FOR SELECT
  USING (owner_user_id = auth.uid());

-- Users can create their own companies
CREATE POLICY "Users can create their own companies"
  ON my_companies FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());

-- Users can update their own companies
CREATE POLICY "Users can update their own companies"
  ON my_companies FOR UPDATE
  USING (owner_user_id = auth.uid());

-- Users can delete their own companies
CREATE POLICY "Users can delete their own companies"
  ON my_companies FOR DELETE
  USING (owner_user_id = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_my_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_my_companies_updated_at
  BEFORE UPDATE ON my_companies
  FOR EACH ROW
  EXECUTE FUNCTION update_my_companies_updated_at();

-- Las empresas por defecto se crearán desde la app Flutter
-- No se pueden insertar aquí porque auth.uid() requiere contexto de autenticación

-- Ahora actualizar la tabla projects para usar my_company_id en lugar de project_type
ALTER TABLE projects ADD COLUMN IF NOT EXISTS my_company_id UUID REFERENCES my_companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_my_company_id ON projects(my_company_id);

-- La columna company_id existente se mantiene para empresas cliente
-- Renombrar para claridad
ALTER TABLE projects RENAME COLUMN company_id TO client_company_id;

COMMENT ON COLUMN projects.my_company_id IS 'ID de la empresa propia del usuario (Verlyx, PulsarMoon, etc.)';
COMMENT ON COLUMN projects.client_company_id IS 'ID de la empresa cliente (de la tabla companies)';
COMMENT ON COLUMN projects.client_id IS 'ID del contacto cliente (de la tabla contacts)';
