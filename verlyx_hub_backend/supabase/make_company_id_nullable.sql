-- Hacer company_id nullable en las tablas de CRM para permitir testing
-- IMPORTANTE: Esto es temporal para desarrollo

-- Hacer company_id nullable en clients
ALTER TABLE public.clients 
ALTER COLUMN company_id DROP NOT NULL;

-- Hacer company_id nullable en client_organizations
ALTER TABLE public.client_organizations 
ALTER COLUMN company_id DROP NOT NULL;

-- Verificar los cambios
SELECT 
    table_name, 
    column_name, 
    is_nullable, 
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'client_organizations')
AND column_name = 'company_id';
