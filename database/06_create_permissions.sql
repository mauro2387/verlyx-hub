-- =====================================================
-- FASE 1.2: Sistema de Roles y Permisos
-- Tabla: permissions (permisos granulares opcionales)
-- =====================================================

-- Crear tabla de permisos predefinidos
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  module VARCHAR(100) NOT NULL, -- 'projects', 'clients', 'deals', 'tasks', 'documents', 'finance', etc
  action VARCHAR(50) NOT NULL, -- 'view', 'create', 'update', 'delete', 'export', 'manage'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar permisos base para cada módulo
INSERT INTO permissions (code, name, description, module, action) VALUES
  -- Proyectos
  ('projects.view', 'Ver Proyectos', 'Permite ver la lista y detalles de proyectos', 'projects', 'view'),
  ('projects.create', 'Crear Proyectos', 'Permite crear nuevos proyectos', 'projects', 'create'),
  ('projects.update', 'Actualizar Proyectos', 'Permite editar proyectos existentes', 'projects', 'update'),
  ('projects.delete', 'Eliminar Proyectos', 'Permite eliminar proyectos', 'projects', 'delete'),
  ('projects.manage', 'Gestionar Proyectos', 'Acceso completo a proyectos', 'projects', 'manage'),
  
  -- Clientes
  ('clients.view', 'Ver Clientes', 'Permite ver la lista y detalles de clientes', 'clients', 'view'),
  ('clients.create', 'Crear Clientes', 'Permite crear nuevos clientes', 'clients', 'create'),
  ('clients.update', 'Actualizar Clientes', 'Permite editar clientes existentes', 'clients', 'update'),
  ('clients.delete', 'Eliminar Clientes', 'Permite eliminar clientes', 'clients', 'delete'),
  ('clients.manage', 'Gestionar Clientes', 'Acceso completo a clientes', 'clients', 'manage'),
  
  -- Tareas
  ('tasks.view', 'Ver Tareas', 'Permite ver tareas', 'tasks', 'view'),
  ('tasks.create', 'Crear Tareas', 'Permite crear nuevas tareas', 'tasks', 'create'),
  ('tasks.update', 'Actualizar Tareas', 'Permite editar tareas', 'tasks', 'update'),
  ('tasks.delete', 'Eliminar Tareas', 'Permite eliminar tareas', 'tasks', 'delete'),
  ('tasks.manage', 'Gestionar Tareas', 'Acceso completo a tareas', 'tasks', 'manage'),
  
  -- Documentos
  ('documents.view', 'Ver Documentos', 'Permite ver y descargar documentos', 'documents', 'view'),
  ('documents.upload', 'Subir Documentos', 'Permite subir nuevos documentos', 'documents', 'create'),
  ('documents.update', 'Actualizar Documentos', 'Permite editar metadatos de documentos', 'documents', 'update'),
  ('documents.delete', 'Eliminar Documentos', 'Permite eliminar documentos', 'documents', 'delete'),
  ('documents.manage', 'Gestionar Documentos', 'Acceso completo a documentos', 'documents', 'manage'),
  
  -- Finanzas
  ('finance.view', 'Ver Finanzas', 'Permite ver información financiera', 'finance', 'view'),
  ('finance.create', 'Crear Facturas', 'Permite crear facturas y pagos', 'finance', 'create'),
  ('finance.update', 'Actualizar Finanzas', 'Permite editar datos financieros', 'finance', 'update'),
  ('finance.delete', 'Eliminar Datos Financieros', 'Permite eliminar facturas y pagos', 'finance', 'delete'),
  ('finance.manage', 'Gestionar Finanzas', 'Acceso completo a módulo financiero', 'finance', 'manage'),
  
  -- Workspace
  ('workspace.view', 'Ver Workspace', 'Permite ver páginas del workspace', 'workspace', 'view'),
  ('workspace.create', 'Crear Páginas', 'Permite crear páginas en workspace', 'workspace', 'create'),
  ('workspace.update', 'Editar Workspace', 'Permite editar páginas', 'workspace', 'update'),
  ('workspace.delete', 'Eliminar Páginas', 'Permite eliminar páginas', 'workspace', 'delete'),
  ('workspace.manage', 'Gestionar Workspace', 'Acceso completo a workspace', 'workspace', 'manage'),
  
  -- Configuración
  ('settings.view', 'Ver Configuración', 'Permite ver configuración de empresa', 'settings', 'view'),
  ('settings.update', 'Actualizar Configuración', 'Permite cambiar configuración', 'settings', 'update'),
  ('settings.manage', 'Gestionar Empresa', 'Acceso completo a configuración', 'settings', 'manage'),
  
  -- Equipo
  ('team.view', 'Ver Equipo', 'Permite ver miembros del equipo', 'team', 'view'),
  ('team.invite', 'Invitar Miembros', 'Permite invitar nuevos miembros', 'team', 'create'),
  ('team.update', 'Actualizar Miembros', 'Permite cambiar roles', 'team', 'update'),
  ('team.remove', 'Eliminar Miembros', 'Permite remover miembros', 'team', 'delete'),
  ('team.manage', 'Gestionar Equipo', 'Acceso completo a gestión de equipo', 'team', 'manage')
ON CONFLICT (code) DO NOTHING;

-- Crear tabla de permisos por rol (configuración predeterminada)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  permission_code VARCHAR(100) NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission_code)
);

-- Asignar permisos por rol
-- OWNER: todos los permisos
INSERT INTO role_permissions (role, permission_code)
SELECT 'OWNER'::user_role, code FROM permissions
ON CONFLICT DO NOTHING;

-- ADMIN: casi todos excepto eliminar empresa
INSERT INTO role_permissions (role, permission_code)
SELECT 'ADMIN'::user_role, code FROM permissions
WHERE code != 'settings.manage'
ON CONFLICT DO NOTHING;

-- MANAGER: proyectos, clientes, tareas, documentos
INSERT INTO role_permissions (role, permission_code)
SELECT 'MANAGER'::user_role, code FROM permissions
WHERE module IN ('projects', 'clients', 'tasks', 'documents', 'workspace')
AND action IN ('view', 'create', 'update')
ON CONFLICT DO NOTHING;

-- OPERATIVE: ver y actualizar proyectos y tareas
INSERT INTO role_permissions (role, permission_code)
SELECT 'OPERATIVE'::user_role, code FROM permissions
WHERE module IN ('projects', 'tasks', 'documents')
AND action IN ('view', 'update')
ON CONFLICT DO NOTHING;

-- FINANCE: solo módulo financiero
INSERT INTO role_permissions (role, permission_code)
SELECT 'FINANCE'::user_role, code FROM permissions
WHERE module IN ('finance', 'clients')
ON CONFLICT DO NOTHING;

-- MARKETING: clientes y documentos
INSERT INTO role_permissions (role, permission_code)
SELECT 'MARKETING'::user_role, code FROM permissions
WHERE module IN ('clients', 'documents', 'workspace')
AND action IN ('view', 'create', 'update')
ON CONFLICT DO NOTHING;

-- GUEST: solo lectura
INSERT INTO role_permissions (role, permission_code)
SELECT 'GUEST'::user_role, code FROM permissions
WHERE action = 'view'
ON CONFLICT DO NOTHING;

-- Función para verificar si un usuario tiene un permiso específico
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_company_id UUID,
  p_permission_code VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_has_permission BOOLEAN;
BEGIN
  -- Obtener rol del usuario
  v_user_role := get_user_role_in_company(p_user_id, p_company_id);
  
  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar si el rol tiene el permiso
  SELECT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role = v_user_role
    AND permission_code = p_permission_code
  ) INTO v_has_permission;
  
  -- También verificar permisos custom del usuario
  IF NOT v_has_permission THEN
    SELECT EXISTS (
      SELECT 1 FROM company_users
      WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND permissions ? p_permission_code
      AND (permissions->p_permission_code)::boolean = true
    ) INTO v_has_permission;
  END IF;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
