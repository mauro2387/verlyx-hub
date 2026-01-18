-- =====================================================
-- FIX: Corregir foreign key de audit_logs.company_id
-- =====================================================
-- El constraint apunta a 'companies' pero debería 
-- apuntar a 'my_companies'
-- =====================================================

-- 1. Eliminar el constraint incorrecto
ALTER TABLE audit_logs 
DROP CONSTRAINT IF EXISTS audit_logs_company_id_fkey;

-- 2. Crear el constraint correcto apuntando a my_companies
ALTER TABLE audit_logs 
ADD CONSTRAINT audit_logs_company_id_fkey 
FOREIGN KEY (company_id) 
REFERENCES my_companies(id) 
ON DELETE CASCADE;

-- 3. Verificar que el constraint fue creado correctamente
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
-- Debería mostrar: foreign_table_name = 'my_companies'
