-- Verificar si el my_company_id existe
SELECT id, name, type, is_active 
FROM my_companies 
WHERE id = '8650aa8a-8b2a-4ddd-959b-cd902c3d2e27';

-- Ver todas las my_companies disponibles
SELECT id, name, type, is_active, created_at
FROM my_companies
ORDER BY created_at DESC;

-- Verificar el constraint de audit_logs
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'audit_logs'
  AND kcu.column_name = 'company_id';
