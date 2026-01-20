-- =====================================================
-- FASE 1.1: Multi-tenancy Real con RLS
-- Tabla: my_companies
-- =====================================================

-- Habilitar RLS en la tabla my_companies
ALTER TABLE my_companies ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view their own companies" ON my_companies;
DROP POLICY IF EXISTS "Users can insert their own companies" ON my_companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON my_companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON my_companies;

-- Política: Los usuarios solo pueden ver sus propias empresas
CREATE POLICY "Users can view their own companies"
ON my_companies
FOR SELECT
USING (owner_user_id = auth.uid());

-- Política: Los usuarios solo pueden insertar empresas para sí mismos
CREATE POLICY "Users can insert their own companies"
ON my_companies
FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

-- Política: Los usuarios solo pueden actualizar sus propias empresas
CREATE POLICY "Users can update their own companies"
ON my_companies
FOR UPDATE
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

-- Política: Los usuarios solo pueden eliminar sus propias empresas
CREATE POLICY "Users can delete their own companies"
ON my_companies
FOR DELETE
USING (owner_user_id = auth.uid());
