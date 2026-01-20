-- =====================================================
-- FASE 1.1: Multi-tenancy Real con RLS
-- Script de verificación y testing
-- =====================================================

-- Verificar que RLS está habilitado en todas las tablas
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('my_companies', 'companies', 'projects');

-- Verificar políticas creadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('my_companies', 'companies', 'projects')
ORDER BY tablename, policyname;

-- Test: Intentar ver empresas (debe devolver solo las del usuario actual)
-- SELECT * FROM my_companies;

-- Test: Intentar ver clientes (debe devolver solo los de empresas propias)
-- SELECT * FROM companies;

-- Test: Intentar ver proyectos (debe devolver solo los de empresas propias)
-- SELECT * FROM projects;
