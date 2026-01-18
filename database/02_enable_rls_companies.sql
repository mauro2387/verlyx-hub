-- =====================================================
-- FASE 1.1: Multi-tenancy Real con RLS
-- Tabla: companies (clients)
-- =====================================================

-- Agregar columna my_company_id si no existe (para vincular cliente con empresa propia)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS my_company_id UUID REFERENCES my_companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_companies_my_company_id ON companies(my_company_id);

-- Habilitar RLS en la tabla companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view clients of their companies" ON companies;
DROP POLICY IF EXISTS "Users can insert clients in their companies" ON companies;
DROP POLICY IF EXISTS "Users can update clients of their companies" ON companies;
DROP POLICY IF EXISTS "Users can delete clients of their companies" ON companies;

-- Política: Los usuarios solo pueden ver clientes de sus empresas
-- Necesitamos verificar que el usuario sea dueño de alguna empresa
CREATE POLICY "Users can view clients of their companies"
ON companies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = companies.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Los usuarios pueden insertar clientes solo en sus empresas
CREATE POLICY "Users can insert clients in their companies"
ON companies
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = companies.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Los usuarios pueden actualizar clientes de sus empresas
CREATE POLICY "Users can update clients of their companies"
ON companies
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = companies.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = companies.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Los usuarios pueden eliminar clientes de sus empresas
CREATE POLICY "Users can delete clients of their companies"
ON companies
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = companies.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);
