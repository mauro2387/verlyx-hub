-- =====================================================
-- PASO 1: Solo crear el enum
-- =====================================================
DO $$ BEGIN
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
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Si esto funciona, ejecuta PASO 2
