-- =====================================================
-- FASE 2.2: CRM - Tabla de Deals (Oportunidades)
-- =====================================================

-- Crear enum de etapas del pipeline
DO $$ BEGIN
  CREATE TYPE deal_stage AS ENUM (
    'LEAD',           -- Lead inicial
    'QUALIFIED',      -- Lead calificado
    'PROPOSAL',       -- Propuesta enviada
    'NEGOTIATION',    -- En negociación
    'CLOSED_WON',     -- Ganado
    'CLOSED_LOST'     -- Perdido
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Crear enum de prioridad
DO $$ BEGIN
  CREATE TYPE deal_priority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Crear tabla de deals
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES client_organizations(id) ON DELETE SET NULL,
  
  -- Información básica
  title VARCHAR(255) NOT NULL,
  description TEXT,
  stage deal_stage DEFAULT 'LEAD',
  priority deal_priority DEFAULT 'MEDIUM',
  
  -- Valores
  amount DECIMAL(15, 2), -- Valor estimado del deal
  currency VARCHAR(3) DEFAULT 'ARS',
  probability INTEGER DEFAULT 50, -- Probabilidad de cierre (0-100)
  expected_revenue DECIMAL(15, 2) GENERATED ALWAYS AS (amount * probability / 100) STORED,
  
  -- Fechas importantes
  expected_close_date DATE,
  actual_close_date DATE,
  lost_date DATE,
  
  -- Razones de pérdida/ganancia
  lost_reason TEXT,
  won_reason TEXT,
  
  -- Responsable y equipo
  owner_user_id UUID REFERENCES auth.users(id),
  assigned_users UUID[], -- Array de user IDs del equipo
  
  -- Origen del lead
  source VARCHAR(100), -- 'website', 'referral', 'cold_call', 'social_media', etc
  source_details TEXT,
  
  -- Contacto principal
  primary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Metadata
  tags VARCHAR(50)[],
  custom_fields JSONB DEFAULT '{}',
  
  -- Pipeline tracking
  stage_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  days_in_stage INTEGER DEFAULT 0,
  
  -- Notas y actividad
  next_action TEXT,
  next_action_date DATE,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX idx_deals_my_company ON deals(my_company_id);
CREATE INDEX idx_deals_client ON deals(client_id);
CREATE INDEX idx_deals_organization ON deals(organization_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_priority ON deals(priority);
CREATE INDEX idx_deals_owner ON deals(owner_user_id);
CREATE INDEX idx_deals_expected_close ON deals(expected_close_date);
CREATE INDEX idx_deals_active ON deals(is_active);
CREATE INDEX idx_deals_tags ON deals USING GIN(tags);
CREATE INDEX idx_deals_amount ON deals(amount);

-- Trigger para updated_at
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar stage_changed_at cuando cambia la etapa
CREATE OR REPLACE FUNCTION update_deal_stage_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    NEW.stage_changed_at := NOW();
    NEW.days_in_stage := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deal_stage_changed
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_stage_changed();

-- Trigger para actualizar actual_close_date cuando se gana/pierde
CREATE OR REPLACE FUNCTION update_deal_close_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage = 'CLOSED_WON' AND OLD.stage != 'CLOSED_WON' THEN
    NEW.actual_close_date := CURRENT_DATE;
  ELSIF NEW.stage = 'CLOSED_LOST' AND OLD.stage != 'CLOSED_LOST' THEN
    NEW.lost_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deal_close_date
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_close_date();

-- Habilitar RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Política: Ver deals de sus empresas
CREATE POLICY "Users can view deals of their companies"
ON deals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = deals.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Crear deals
CREATE POLICY "Users can create deals"
ON deals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = deals.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Actualizar deals
CREATE POLICY "Users can update deals"
ON deals
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = deals.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Eliminar deals
CREATE POLICY "Users can delete deals"
ON deals
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = deals.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Función para obtener estadísticas del pipeline
CREATE OR REPLACE FUNCTION get_pipeline_stats(
  p_my_company_id UUID
)
RETURNS TABLE (
  stage deal_stage,
  count BIGINT,
  total_amount DECIMAL,
  avg_amount DECIMAL,
  total_weighted DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.stage,
    COUNT(*)::BIGINT,
    COALESCE(SUM(d.amount), 0) as total_amount,
    COALESCE(AVG(d.amount), 0) as avg_amount,
    COALESCE(SUM(d.expected_revenue), 0) as total_weighted
  FROM deals d
  WHERE d.my_company_id = p_my_company_id
  AND d.is_active = true
  GROUP BY d.stage
  ORDER BY 
    CASE d.stage
      WHEN 'LEAD' THEN 1
      WHEN 'QUALIFIED' THEN 2
      WHEN 'PROPOSAL' THEN 3
      WHEN 'NEGOTIATION' THEN 4
      WHEN 'CLOSED_WON' THEN 5
      WHEN 'CLOSED_LOST' THEN 6
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para mover deal a siguiente etapa
CREATE OR REPLACE FUNCTION move_deal_to_stage(
  p_deal_id UUID,
  p_new_stage deal_stage,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE deals
  SET 
    stage = p_new_stage,
    won_reason = CASE WHEN p_new_stage = 'CLOSED_WON' THEN p_reason ELSE won_reason END,
    lost_reason = CASE WHEN p_new_stage = 'CLOSED_LOST' THEN p_reason ELSE lost_reason END
  WHERE id = p_deal_id
  RETURNING true INTO v_updated;
  
  RETURN COALESCE(v_updated, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger de auditoría para deals
CREATE OR REPLACE FUNCTION audit_deals_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object(
      'title', NEW.title,
      'stage', NEW.stage,
      'amount', NEW.amount,
      'client_id', NEW.client_id
    );
    
    PERFORM log_audit(
      NEW.my_company_id,
      NEW.created_by,
      'deal',
      NEW.id,
      'CREATE'::audit_action,
      jsonb_build_object('after', v_changes)
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_changes := jsonb_build_object(
      'before', jsonb_build_object('title', OLD.title, 'stage', OLD.stage, 'amount', OLD.amount),
      'after', jsonb_build_object('title', NEW.title, 'stage', NEW.stage, 'amount', NEW.amount)
    );
    
    -- Log especial para cambio de etapa
    IF OLD.stage != NEW.stage THEN
      PERFORM log_audit(
        NEW.my_company_id,
        auth.uid(),
        'deal',
        NEW.id,
        'STATUS_CHANGE'::audit_action,
        jsonb_build_object(
          'field', 'stage',
          'from', OLD.stage,
          'to', NEW.stage
        )
      );
    END IF;
    
    PERFORM log_audit(
      NEW.my_company_id,
      auth.uid(),
      'deal',
      NEW.id,
      'UPDATE'::audit_action,
      v_changes
    );
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'title', OLD.title,
      'stage', OLD.stage,
      'amount', OLD.amount
    );
    
    PERFORM log_audit(
      OLD.my_company_id,
      auth.uid(),
      'deal',
      OLD.id,
      'DELETE'::audit_action,
      jsonb_build_object('before', v_changes)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_audit_deals
  AFTER INSERT OR UPDATE OR DELETE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION audit_deals_changes();

-- Función para actualizar days_in_stage (ejecutar con cron diario)
CREATE OR REPLACE FUNCTION update_deals_days_in_stage()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE deals
  SET days_in_stage = EXTRACT(DAY FROM NOW() - stage_changed_at)::INTEGER
  WHERE is_active = true
  AND stage NOT IN ('CLOSED_WON', 'CLOSED_LOST');
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
