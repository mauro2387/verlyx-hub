-- =====================================================
-- DEBUG: Ejecutar paso por paso para encontrar el error
-- =====================================================

-- PASO 1: Crear enum (ejecuta solo esta línea primero)
CREATE TYPE organization_type AS ENUM (
  'HEADQUARTERS',
  'BRANCH',
  'OFFICE',
  'STORE',
  'WAREHOUSE',
  'FACTORY',
  'DISTRIBUTION_CENTER',
  'SALES_POINT',
  'SERVICE_CENTER',
  'OTHER'
);

-- Si PASO 1 funciona, ejecuta PASO 2
