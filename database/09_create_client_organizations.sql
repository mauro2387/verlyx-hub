-- =====================================================
-- FASE 2.1: Organizaciones de Clientes
-- Tabla: client_organizations
-- =====================================================

-- Verificar que las RLS policies de companies estén activas
-- Si falla este script, ejecuta primero 02_enable_rls_companies.sql

-- Crear enum de tipos de organización (si no existe)
DO $$ BEGIN
  CREATE TYPE organization_type AS ENUM (
    'HEADQUARTERS',      -- Sede principal
    'BRANCH',           -- Sucursal
    'OFFICE',           -- Oficina
    'STORE',            -- Tienda/Local
    'WAREHOUSE',        -- Almacén/Bodega
    'FACTORY',          -- Fábrica
    'DISTRIBUTION_CENTER', -- Centro de distribución
    'SALES_POINT',      -- Punto de venta
    'SERVICE_CENTER',   -- Centro de servicio
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Crear tabla de organizaciones de clientes
CREATE TABLE IF NOT EXISTS client_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_organization_id UUID REFERENCES client_organizations(id) ON DELETE SET NULL,
  
  -- Información básica
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50), -- Código interno (ej: "SUC-001")
  type organization_type DEFAULT 'BRANCH',
  
  -- Ubicación
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Argentina',
  postal_code VARCHAR(20),
  coordinates JSONB, -- { "lat": -34.6037, "lng": -58.3816 }
  
  -- Contacto
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  
  -- Información adicional
  description TEXT,
  employees_count INTEGER,
  size VARCHAR(50), -- 'small', 'medium', 'large'
  
  -- Horarios y operación
  business_hours JSONB, -- { "monday": { "open": "09:00", "close": "18:00" }, ... }
  timezone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',
  
  -- Responsables
  primary_contact_name VARCHAR(255),
  primary_contact_email VARCHAR(255),
  primary_contact_phone VARCHAR(50),
  
  -- Metadata
  tags VARCHAR(50)[],
  custom_fields JSONB DEFAULT '{}',
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX idx_client_orgs_my_company ON client_organizations(my_company_id);
CREATE INDEX idx_client_orgs_client ON client_organizations(client_id);
CREATE INDEX idx_client_orgs_parent ON client_organizations(parent_organization_id);
CREATE INDEX idx_client_orgs_type ON client_organizations(type);
CREATE INDEX idx_client_orgs_active ON client_organizations(is_active);
CREATE INDEX idx_client_orgs_code ON client_organizations(code);
CREATE INDEX idx_client_orgs_tags ON client_organizations USING GIN(tags);

-- Trigger para updated_at
CREATE TRIGGER update_client_organizations_updated_at
  BEFORE UPDATE ON client_organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE client_organizations ENABLE ROW LEVEL SECURITY;

-- Política: Ver organizaciones de clientes de sus empresas
CREATE POLICY "Users can view client organizations of their companies"
ON client_organizations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = client_organizations.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Crear organizaciones para sus clientes
CREATE POLICY "Users can create client organizations"
ON client_organizations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = client_organizations.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Actualizar organizaciones de sus clientes
CREATE POLICY "Users can update client organizations"
ON client_organizations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = client_organizations.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Eliminar organizaciones de sus clientes
CREATE POLICY "Users can delete client organizations"
ON client_organizations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = client_organizations.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Función para obtener jerarquía de organizaciones (árbol completo)
CREATE OR REPLACE FUNCTION get_organization_hierarchy(
  p_client_id UUID
)
RETURNS TABLE (
  id UUID,
  parent_organization_id UUID,
  name VARCHAR,
  type organization_type,
  code VARCHAR,
  level INTEGER,
  path TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE org_tree AS (
    -- Nivel 0: Organizaciones raíz (sin padre)
    SELECT 
      co.id,
      co.parent_organization_id,
      co.name,
      co.type,
      co.code,
      0 as level,
      ARRAY[co.id::TEXT] as path
    FROM client_organizations co
    WHERE co.client_id = p_client_id
    AND co.parent_organization_id IS NULL
    
    UNION ALL
    
    -- Niveles siguientes: hijos recursivos
    SELECT 
      co.id,
      co.parent_organization_id,
      co.name,
      co.type,
      co.code,
      ot.level + 1,
      ot.path || co.id::TEXT
    FROM client_organizations co
    INNER JOIN org_tree ot ON co.parent_organization_id = ot.id
    WHERE co.client_id = p_client_id
  )
  SELECT * FROM org_tree
  ORDER BY level, name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para validar que no haya ciclos en la jerarquía
CREATE OR REPLACE FUNCTION validate_organization_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  v_current_id UUID;
  v_depth INTEGER := 0;
  v_max_depth INTEGER := 10;
BEGIN
  -- Si no hay parent, no validar
  IF NEW.parent_organization_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- No puede ser su propio padre
  IF NEW.id = NEW.parent_organization_id THEN
    RAISE EXCEPTION 'Una organización no puede ser su propio padre';
  END IF;
  
  -- Verificar que el padre pertenezca al mismo cliente
  IF NOT EXISTS (
    SELECT 1 FROM client_organizations
    WHERE id = NEW.parent_organization_id
    AND client_id = NEW.client_id
  ) THEN
    RAISE EXCEPTION 'La organización padre debe pertenecer al mismo cliente';
  END IF;
  
  -- Buscar ciclos recorriendo hacia arriba
  v_current_id := NEW.parent_organization_id;
  
  WHILE v_current_id IS NOT NULL AND v_depth < v_max_depth LOOP
    -- Si encontramos el ID actual, hay un ciclo
    IF v_current_id = NEW.id THEN
      RAISE EXCEPTION 'Se detectó un ciclo en la jerarquía de organizaciones';
    END IF;
    
    -- Subir un nivel
    SELECT parent_organization_id INTO v_current_id
    FROM client_organizations
    WHERE id = v_current_id;
    
    v_depth := v_depth + 1;
  END LOOP;
  
  IF v_depth >= v_max_depth THEN
    RAISE EXCEPTION 'La jerarquía de organizaciones es demasiado profunda (máximo % niveles)', v_max_depth;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de validación
CREATE TRIGGER validate_organization_hierarchy_trigger
  BEFORE INSERT OR UPDATE ON client_organizations
  FOR EACH ROW
  EXECUTE FUNCTION validate_organization_hierarchy();

-- Trigger de auditoría para organizaciones
CREATE OR REPLACE FUNCTION audit_client_organizations_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Solo incluir campos específicos, no toda la tabla
    v_changes := jsonb_build_object(
      'name', NEW.name,
      'code', NEW.code,
      'type', NEW.type,
      'client_id', NEW.client_id
    );
    
    PERFORM log_audit(
      NEW.my_company_id,
      NEW.created_by,
      'client_organization',
      NEW.id,
      'CREATE'::audit_action,
      jsonb_build_object('after', v_changes)
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_changes := jsonb_build_object(
      'before', jsonb_build_object('name', OLD.name, 'code', OLD.code, 'type', OLD.type),
      'after', jsonb_build_object('name', NEW.name, 'code', NEW.code, 'type', NEW.type)
    );
    
    PERFORM log_audit(
      NEW.my_company_id,
      auth.uid(),
      'client_organization',
      NEW.id,
      'UPDATE'::audit_action,
      v_changes
    );
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'name', OLD.name,
      'code', OLD.code,
      'type', OLD.type
    );
    
    PERFORM log_audit(
      OLD.my_company_id,
      auth.uid(),
      'client_organization',
      OLD.id,
      'DELETE'::audit_action,
      jsonb_build_object('before', v_changes)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_audit_client_organizations
  AFTER INSERT OR UPDATE OR DELETE ON client_organizations
  FOR EACH ROW
  EXECUTE FUNCTION audit_client_organizations_changes();

-- Nota: Las funciones auxiliares que necesitan JOIN con companies 
-- deben ejecutarse desde el backend con privilegios de servicio
-- o crear una vista materializada separada
