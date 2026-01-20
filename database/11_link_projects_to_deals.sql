-- =====================================================
-- FASE 2.3: Vincular Projects con Deals
-- =====================================================

-- Agregar columna deal_id a la tabla projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(id) ON DELETE SET NULL;

-- Agregar comentario
COMMENT ON COLUMN projects.deal_id IS 'Deal/Oportunidad que originó este proyecto (opcional)';

-- Crear índice para búsquedas por deal
CREATE INDEX IF NOT EXISTS idx_projects_deal ON projects(deal_id);

-- Función helper para crear proyecto desde deal ganado
CREATE OR REPLACE FUNCTION create_project_from_deal(
  p_deal_id UUID,
  p_project_name VARCHAR DEFAULT NULL,
  p_project_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_deal RECORD;
  v_project_id UUID;
BEGIN
  -- Obtener información del deal
  SELECT 
    d.my_company_id,
    d.client_id,
    d.organization_id,
    d.title,
    d.description,
    d.amount,
    d.owner_user_id
  INTO v_deal
  FROM deals d
  WHERE d.id = p_deal_id
  AND d.stage = 'CLOSED_WON';
  
  -- Verificar que el deal existe y está ganado
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal no encontrado o no está en estado CLOSED_WON';
  END IF;
  
  -- Crear el proyecto
  INSERT INTO projects (
    my_company_id,
    company_id,
    deal_id,
    name,
    description,
    budget,
    status,
    created_by
  ) VALUES (
    v_deal.my_company_id,
    v_deal.client_id,
    p_deal_id,
    COALESCE(p_project_name, v_deal.title),
    COALESCE(p_project_description, v_deal.description),
    v_deal.amount,
    'active',
    v_deal.owner_user_id
  )
  RETURNING id INTO v_project_id;
  
  -- Log de auditoría
  PERFORM log_audit(
    v_deal.my_company_id,
    auth.uid(),
    'project',
    v_project_id,
    'CREATE'::audit_action,
    jsonb_build_object(
      'source', 'deal',
      'deal_id', p_deal_id,
      'deal_title', v_deal.title
    )
  );
  
  RETURN v_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener proyectos de un deal
CREATE OR REPLACE FUNCTION get_projects_by_deal(
  p_deal_id UUID
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  status VARCHAR,
  budget DECIMAL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.status,
    p.budget,
    p.start_date,
    p.end_date,
    p.created_at
  FROM projects p
  WHERE p.deal_id = p_deal_id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vista para deals con información de proyectos asociados
CREATE OR REPLACE VIEW deals_with_projects AS
SELECT 
  d.*,
  COUNT(p.id) as projects_count,
  COALESCE(SUM(CAST(p.budget AS DECIMAL(15,2))), 0) as total_projects_budget
FROM deals d
LEFT JOIN projects p ON p.deal_id = d.id
GROUP BY d.id;

-- Comentarios
COMMENT ON FUNCTION create_project_from_deal IS 'Crea un proyecto a partir de un deal ganado';
COMMENT ON FUNCTION get_projects_by_deal IS 'Obtiene todos los proyectos asociados a un deal';
COMMENT ON VIEW deals_with_projects IS 'Vista de deals con conteo y presupuesto de proyectos asociados';
