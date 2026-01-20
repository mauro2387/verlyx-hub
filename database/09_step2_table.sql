-- =====================================================
-- PASO 2: Solo crear la tabla SIN triggers ni RLS
-- =====================================================
CREATE TABLE IF NOT EXISTS client_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_organization_id UUID REFERENCES client_organizations(id) ON DELETE SET NULL,
  
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  type organization_type DEFAULT 'BRANCH',
  
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Argentina',
  postal_code VARCHAR(20),
  coordinates JSONB,
  
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  
  description TEXT,
  employees_count INTEGER,
  size VARCHAR(50),
  
  business_hours JSONB,
  timezone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',
  
  primary_contact_name VARCHAR(255),
  primary_contact_email VARCHAR(255),
  primary_contact_phone VARCHAR(50),
  
  tags VARCHAR(50)[],
  custom_fields JSONB DEFAULT '{}',
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Si esto funciona, el problema está en triggers/RLS de otras tablas
-- Si falla, copia el error COMPLETO
