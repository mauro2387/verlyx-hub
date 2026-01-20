-- =====================================================
-- FASE 1.1: Multi-tenancy Real con RLS
-- Tabla: projects
-- =====================================================

-- Habilitar RLS en la tabla projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver proyectos de sus empresas
CREATE POLICY "Users can view projects of their companies"
ON projects
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = projects.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Los usuarios pueden insertar proyectos solo en sus empresas
CREATE POLICY "Users can insert projects in their companies"
ON projects
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = projects.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Los usuarios pueden actualizar proyectos de sus empresas
CREATE POLICY "Users can update projects of their companies"
ON projects
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = projects.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = projects.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Los usuarios pueden eliminar proyectos de sus empresas
CREATE POLICY "Users can delete projects of their companies"
ON projects
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = projects.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Crear índice para mejor performance
CREATE INDEX IF NOT EXISTS idx_projects_my_company_id ON projects(my_company_id);
