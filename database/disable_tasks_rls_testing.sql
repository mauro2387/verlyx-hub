-- =====================================================
-- TESTING: Deshabilitar RLS temporalmente en tasks
-- =====================================================
-- Esto permite probar sin autenticación completa
-- RECUERDA HABILITAR DESPUÉS EN PRODUCCIÓN
-- =====================================================

-- Deshabilitar RLS en tasks
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en task_comments (por si acaso)
ALTER TABLE task_comments DISABLE ROW LEVEL SECURITY;

-- Verificar estado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('tasks', 'task_comments');
-- rowsecurity debería ser 'false'
