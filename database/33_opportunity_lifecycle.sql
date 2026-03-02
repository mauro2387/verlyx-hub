-- ============================================================
-- PHASE 2: OPPORTUNITY LIFECYCLE — Activities, Onboarding, Won Automation
-- Verlyx Hub Enterprise Architecture
-- ============================================================
-- This migration adds:
-- 1. opportunity_activities (unified activity log for pipeline)
-- 2. onboarding_items (checklist for new clients)
-- 3. Safer execute_opportunity_won() that handles missing tables
-- ============================================================

-- =============================================
-- 1. OPPORTUNITY ACTIVITIES (Pipeline Activity Log)
-- =============================================
CREATE TABLE IF NOT EXISTS opportunity_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  
  -- Activity info
  activity_type VARCHAR(50) NOT NULL,
  -- Types: 'stage_change', 'note', 'email_sent', 'whatsapp_sent', 'call',
  --        'meeting', 'proposal_sent', 'follow_up', 'conversion', 'won', 'lost'
  
  subject VARCHAR(255),
  description TEXT,
  
  -- Stage change tracking
  old_stage VARCHAR(20),
  new_stage VARCHAR(20),
  
  -- Interaction metadata
  outcome VARCHAR(100),
  -- Outcomes: 'positive', 'neutral', 'negative', 'no_answer', 'rescheduled'
  
  -- Who & when
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Linked entities
  contact_id UUID,
  project_id UUID,
  
  -- Extra data
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opp_activities_opportunity ON opportunity_activities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_activities_company ON opportunity_activities(my_company_id);
CREATE INDEX IF NOT EXISTS idx_opp_activities_type ON opportunity_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_opp_activities_date ON opportunity_activities(performed_at DESC);

ALTER TABLE opportunity_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY opp_activities_select ON opportunity_activities FOR SELECT
  USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY opp_activities_insert ON opportunity_activities FOR INSERT
  WITH CHECK (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- 2. ONBOARDING ITEMS (Client Onboarding Checklist)
-- =============================================
CREATE TABLE IF NOT EXISTS onboarding_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  
  -- Links
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  project_id UUID,
  client_id UUID,
  
  -- Checklist item
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  -- Categories: 'documentation', 'access', 'kickoff', 'training', 'billing', 'general'
  
  sort_order INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  
  due_date DATE,
  assigned_to UUID REFERENCES auth.users(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_company ON onboarding_items(my_company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_opportunity ON onboarding_items(opportunity_id) WHERE opportunity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_project ON onboarding_items(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_pending ON onboarding_items(is_completed, due_date) WHERE is_completed = FALSE;

ALTER TABLE onboarding_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY onboarding_select ON onboarding_items FOR SELECT
  USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY onboarding_insert ON onboarding_items FOR INSERT
  WITH CHECK (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY onboarding_update ON onboarding_items FOR UPDATE
  USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY onboarding_delete ON onboarding_items FOR DELETE
  USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_onboarding_updated_at ON onboarding_items;
CREATE TRIGGER trigger_onboarding_updated_at
  BEFORE UPDATE ON onboarding_items
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();

-- =============================================
-- 3. AUTO-LOG STAGE CHANGES AS ACTIVITIES
-- =============================================
CREATE OR REPLACE FUNCTION log_opportunity_stage_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO opportunity_activities (
      my_company_id, opportunity_id, activity_type,
      subject, description,
      old_stage, new_stage,
      performed_by, metadata
    ) VALUES (
      NEW.my_company_id, NEW.id, 'stage_change',
      'Cambio de etapa: ' || OLD.stage || ' → ' || NEW.stage,
      CASE NEW.stage
        WHEN 'won' THEN 'Oportunidad ganada. ' || COALESCE('Razón: ' || NEW.won_reason, '')
        WHEN 'lost' THEN 'Oportunidad perdida. ' || COALESCE('Razón: ' || NEW.lost_reason, '')
        ELSE 'Avance en pipeline'
      END,
      OLD.stage::TEXT, NEW.stage::TEXT,
      NEW.owner_user_id,
      jsonb_build_object(
        'probability_before', OLD.probability,
        'probability_after', NEW.probability,
        'days_in_previous_stage', OLD.days_in_stage
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_opp_stage_activity ON opportunities;
CREATE TRIGGER trigger_log_opp_stage_activity
  AFTER UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION log_opportunity_stage_activity();

-- =============================================
-- 4. SAFER execute_opportunity_won()
-- =============================================
-- Replaces the version from migration 31.
-- Handles missing tables gracefully (incomes, contact_activities).
-- Creates onboarding checklist items.
CREATE OR REPLACE FUNCTION execute_opportunity_won(
  p_opportunity_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_opp opportunities%ROWTYPE;
  v_client_id UUID;
  v_project_id UUID;
  v_income_id UUID;
  v_has_incomes BOOLEAN;
BEGIN
  SELECT * INTO v_opp FROM opportunities WHERE id = p_opportunity_id;
  
  IF v_opp IS NULL THEN
    RAISE EXCEPTION 'Opportunity not found: %', p_opportunity_id;
  END IF;
  
  IF v_opp.stage != 'won' THEN
    RAISE EXCEPTION 'Opportunity must be in WON stage. Current: %', v_opp.stage;
  END IF;
  
  v_client_id := v_opp.client_id;
  
  -- 1. Update contact → client status (if contact linked)
  IF v_client_id IS NOT NULL THEN
    UPDATE contacts SET 
      status = 'won',
      type = 'client',
      notes = COALESCE(notes, '') || E'\n[' || NOW()::TEXT || '] Convertido a cliente desde Oportunidad: ' || v_opp.title
    WHERE id = v_client_id;
  END IF;
  
  -- 2. Create income record (only if incomes table exists)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'incomes'
  ) INTO v_has_incomes;
  
  IF v_has_incomes AND v_opp.final_amount IS NOT NULL THEN
    EXECUTE format(
      'INSERT INTO incomes (my_company_id, amount, currency, description, status, due_date, client_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id'
    ) INTO v_income_id
    USING v_opp.my_company_id,
          v_opp.final_amount,
          COALESCE(v_opp.final_currency, 'UYU'),
          'Pago - ' || v_opp.title,
          'pending',
          COALESCE(v_opp.start_date, CURRENT_DATE) + INTERVAL '30 days',
          v_client_id;
  END IF;
  
  -- 3. Create project
  INSERT INTO projects (
    my_company_id, contact_id, name, description,
    status, priority, start_date, budget, currency
  ) VALUES (
    v_opp.my_company_id,
    v_client_id,
    v_opp.title,
    COALESCE(v_opp.description, 'Proyecto generado desde oportunidad ganada'),
    'planning',
    'high',
    COALESCE(v_opp.start_date, CURRENT_DATE),
    v_opp.final_amount,
    COALESCE(v_opp.final_currency, 'UYU')
  )
  RETURNING id INTO v_project_id;
  
  -- 4. Create onboarding task
  INSERT INTO tasks (
    project_id, title, description,
    status, priority, due_date
  ) VALUES (
    v_project_id,
    'Onboarding: ' || v_opp.title,
    'Checklist de onboarding para nuevo cliente',
    'todo',
    'urgent',
    CURRENT_DATE + INTERVAL '7 days'
  );
  
  -- 5. Create onboarding checklist items
  INSERT INTO onboarding_items (my_company_id, opportunity_id, project_id, client_id, title, category, sort_order, due_date, assigned_to) VALUES
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Enviar email de bienvenida', 'kickoff', 1, CURRENT_DATE + INTERVAL '1 day', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Agendar reunión de kick-off', 'kickoff', 2, CURRENT_DATE + INTERVAL '3 days', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Recopilar documentación del cliente', 'documentation', 3, CURRENT_DATE + INTERVAL '5 days', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Configurar accesos y permisos', 'access', 4, CURRENT_DATE + INTERVAL '5 days', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Definir plan de implementación', 'kickoff', 5, CURRENT_DATE + INTERVAL '7 days', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Configurar facturación', 'billing', 6, CURRENT_DATE + INTERVAL '7 days', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Capacitación inicial', 'training', 7, CURRENT_DATE + INTERVAL '14 days', p_user_id);
  
  -- 6. Log the conversion activity
  INSERT INTO opportunity_activities (
    my_company_id, opportunity_id, activity_type,
    subject, description,
    performed_by, project_id, contact_id,
    metadata
  ) VALUES (
    v_opp.my_company_id, p_opportunity_id, 'won',
    'Oportunidad ganada — ciclo de vida ejecutado',
    'Cliente actualizado, proyecto creado, onboarding generado.',
    p_user_id, v_project_id, v_client_id,
    jsonb_build_object(
      'final_amount', v_opp.final_amount,
      'currency', COALESCE(v_opp.final_currency, 'UYU'),
      'project_id', v_project_id,
      'income_id', v_income_id,
      'client_id', v_client_id,
      'onboarding_items', 7
    )
  );
  
  -- 7. Audit log
  INSERT INTO audit_logs (entity_type, entity_id, action, changes, user_id)
  VALUES (
    'opportunity', p_opportunity_id, 'STATUS_CHANGE'::audit_action,
    jsonb_build_object(
      'event', 'opportunity_won_lifecycle',
      'project_id', v_project_id,
      'income_id', v_income_id,
      'client_id', v_client_id,
      'final_amount', v_opp.final_amount
    ),
    p_user_id
  );
  
  RETURN jsonb_build_object(
    'opportunity_id', p_opportunity_id,
    'client_id', v_client_id,
    'project_id', v_project_id,
    'income_id', v_income_id,
    'onboarding_items', 7,
    'status', 'success'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. HELPER: Get opportunity activity timeline
-- =============================================
CREATE OR REPLACE FUNCTION get_opportunity_timeline(p_opportunity_id UUID)
RETURNS TABLE (
  id UUID,
  activity_type VARCHAR,
  subject VARCHAR,
  description TEXT,
  old_stage VARCHAR,
  new_stage VARCHAR,
  outcome VARCHAR,
  performed_by UUID,
  performed_at TIMESTAMPTZ,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oa.id,
    oa.activity_type,
    oa.subject,
    oa.description,
    oa.old_stage,
    oa.new_stage,
    oa.outcome,
    oa.performed_by,
    oa.performed_at,
    oa.metadata
  FROM opportunity_activities oa
  WHERE oa.opportunity_id = p_opportunity_id
  ORDER BY oa.performed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. HELPER: Get onboarding progress
-- =============================================
CREATE OR REPLACE FUNCTION get_onboarding_progress(p_opportunity_id UUID)
RETURNS TABLE (
  total_items BIGINT,
  completed_items BIGINT,
  progress_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE oi.is_completed = TRUE)::BIGINT,
    ROUND(
      (COUNT(*) FILTER (WHERE oi.is_completed = TRUE)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC) * 100, 
      1
    )
  FROM onboarding_items oi
  WHERE oi.opportunity_id = p_opportunity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
