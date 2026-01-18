-- =====================================================
-- MIGRACIÓN: Asignar my_company_id a clientes existentes
-- =====================================================

-- Ver cuántos clientes NO tienen my_company_id asignado
SELECT 
  COUNT(*) as total_clients,
  COUNT(my_company_id) as with_company,
  COUNT(*) - COUNT(my_company_id) as without_company
FROM companies;

-- Ver clientes sin my_company_id
SELECT id, name, type, owner_user_id, my_company_id
FROM companies
WHERE my_company_id IS NULL;

-- Si tienes clientes sin my_company_id, necesitas asignarlos manualmente
-- o usar este script para asignarlos automáticamente a la primera empresa del usuario

-- OPCIÓN 1: Asignar cada cliente a la primera empresa de su owner_user_id
UPDATE companies
SET my_company_id = (
  SELECT id 
  FROM my_companies 
  WHERE my_companies.owner_user_id = companies.owner_user_id
  LIMIT 1
)
WHERE my_company_id IS NULL
AND owner_user_id IS NOT NULL;

-- OPCIÓN 2: Si NO tienes owner_user_id en companies, necesitas asignar manualmente
-- Reemplaza 'TU_COMPANY_UUID' con el UUID de tu empresa principal
-- UPDATE companies
-- SET my_company_id = 'TU_COMPANY_UUID'
-- WHERE my_company_id IS NULL;

-- Verificar resultado
SELECT 
  COUNT(*) as total_clients,
  COUNT(my_company_id) as with_company,
  COUNT(*) - COUNT(my_company_id) as without_company
FROM companies;
