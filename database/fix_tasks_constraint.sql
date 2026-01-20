-- =====================================================
-- FIX: Eliminar constraint at_least_one_relation
-- =====================================================
-- Permite crear tareas sin necesidad de vincularlas
-- a project/deal/client/organization
-- =====================================================

ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS at_least_one_relation;

-- Verificar que el constraint fue eliminado
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'tasks'::regclass
  AND conname = 'at_least_one_relation';
-- Esto debería devolver 0 filas si se eliminó correctamente
