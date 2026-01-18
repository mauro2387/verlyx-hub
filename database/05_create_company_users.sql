-- =====================================================
-- FASE 1.2: Sistema de Roles y Permisos
-- Tabla: company_users (relación usuario-empresa-rol)
-- =====================================================

-- Crear enum de roles
CREATE TYPE user_role AS ENUM (
  'OWNER',
  'ADMIN',
  'MANAGER',
  'OPERATIVE',
  'FINANCE',
  'MARKETING',
  'GUEST'
);

-- Crear tabla company_users
CREATE TABLE IF NOT EXISTS company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'GUEST',
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- Índices para mejor performance
CREATE INDEX idx_company_users_company_id ON company_users(company_id);
CREATE INDEX idx_company_users_user_id ON company_users(user_id);
CREATE INDEX idx_company_users_role ON company_users(role);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_company_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_company_users_updated_at
  BEFORE UPDATE ON company_users
  FOR EACH ROW
  EXECUTE FUNCTION update_company_users_updated_at();

-- Habilitar RLS
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;

-- Políticas: Los usuarios pueden ver miembros de sus empresas
CREATE POLICY "Users can view members of their companies"
ON company_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = company_users.company_id
    AND my_companies.owner_user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Políticas: Solo el dueño puede insertar nuevos miembros
CREATE POLICY "Owners can add members to their companies"
ON company_users
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = company_users.company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Políticas: Solo el dueño puede actualizar roles
CREATE POLICY "Owners can update member roles"
ON company_users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = company_users.company_id
    AND my_companies.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = company_users.company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Políticas: Solo el dueño puede eliminar miembros
CREATE POLICY "Owners can remove members from their companies"
ON company_users
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = company_users.company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Función para obtener el rol de un usuario en una empresa
CREATE OR REPLACE FUNCTION get_user_role_in_company(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  -- Si es el dueño, devolver OWNER
  SELECT 'OWNER'::user_role INTO v_role
  FROM my_companies
  WHERE id = p_company_id
  AND owner_user_id = p_user_id;
  
  IF FOUND THEN
    RETURN v_role;
  END IF;
  
  -- Si no es dueño, buscar en company_users
  SELECT role INTO v_role
  FROM company_users
  WHERE company_id = p_company_id
  AND user_id = p_user_id
  AND is_active = true;
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario tiene un rol específico o superior
CREATE OR REPLACE FUNCTION user_has_role_or_higher(
  p_user_id UUID,
  p_company_id UUID,
  p_required_role user_role
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_role_hierarchy INTEGER;
  v_required_hierarchy INTEGER;
BEGIN
  v_user_role := get_user_role_in_company(p_user_id, p_company_id);
  
  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Jerarquía de roles (menor = más poder)
  v_role_hierarchy := CASE v_user_role
    WHEN 'OWNER' THEN 1
    WHEN 'ADMIN' THEN 2
    WHEN 'MANAGER' THEN 3
    WHEN 'OPERATIVE' THEN 4
    WHEN 'FINANCE' THEN 4
    WHEN 'MARKETING' THEN 4
    WHEN 'GUEST' THEN 5
  END;
  
  v_required_hierarchy := CASE p_required_role
    WHEN 'OWNER' THEN 1
    WHEN 'ADMIN' THEN 2
    WHEN 'MANAGER' THEN 3
    WHEN 'OPERATIVE' THEN 4
    WHEN 'FINANCE' THEN 4
    WHEN 'MARKETING' THEN 4
    WHEN 'GUEST' THEN 5
  END;
  
  RETURN v_role_hierarchy <= v_required_hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
