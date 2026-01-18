-- =====================================================
-- Script de Verificación: Verificar estructura de tabla companies
-- =====================================================

-- Ver todas las columnas de la tabla companies
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'companies'
ORDER BY ordinal_position;
