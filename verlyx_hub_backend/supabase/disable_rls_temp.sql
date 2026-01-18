-- Temporalmente deshabilitar RLS en tablas de CRM para testing
-- IMPORTANTE: Esto es solo para desarrollo, reactivar en producción

-- Verificar estado actual
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('clients', 'client_organizations');

-- Deshabilitar RLS en clients
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en client_organizations
ALTER TABLE public.client_organizations DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las policies de clients
DROP POLICY IF EXISTS "Users can view clients from their companies" ON clients;
DROP POLICY IF EXISTS "Users can insert clients" ON clients;
DROP POLICY IF EXISTS "Users can update clients" ON clients;
DROP POLICY IF EXISTS "Users can delete clients" ON clients;

-- Eliminar todas las policies de client_organizations
DROP POLICY IF EXISTS "Users can view client_organizations from their companies" ON client_organizations;
DROP POLICY IF EXISTS "Users can insert client_organizations" ON client_organizations;
DROP POLICY IF EXISTS "Users can update client_organizations" ON client_organizations;
DROP POLICY IF EXISTS "Users can delete client_organizations" ON client_organizations;

-- Verificar de nuevo que RLS esté deshabilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('clients', 'client_organizations');

-- NOTA: Para reactivar más tarde usar:
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE client_organizations ENABLE ROW LEVEL SECURITY;
