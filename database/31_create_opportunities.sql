-- ============================================================
-- PHASE 1: OPPORTUNITY MODULE — Sales Engine
-- Verlyx Hub Enterprise Architecture Redesign
-- ============================================================
-- Opportunities are the sales pipeline entity.
-- They come from converted Leads or are created directly.
-- Each stage has mandatory fields enforced by triggers.
-- ============================================================

-- 1. Opportunity Stage Enum (replaces deal_stage for new logic)
-- Note: We keep the existing deals table but add stage validation
DO $$ BEGIN
  CREATE TYPE opportunity_stage AS ENUM (
    'qualified',
    'proposal',
    'negotiation',
    'won',
    'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Objection types for negotiation stage
DO $$ BEGIN
  CREATE TYPE objection_type AS ENUM (
    'price_too_high',
    'budget_not_approved',
    'timing_not_right',
    'competitor_preferred',
    'feature_missing',
    'decision_maker_unavailable',
    'internal_priority_change',
    'contract_terms',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Payment type for won stage
DO $$ BEGIN
  CREATE TYPE payment_type AS ENUM (
    'one_time',
    'monthly',
    'quarterly',
    'annual',
    'milestone',
    'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Opportunities table (new entity, separate from legacy deals)
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  
  -- Origin tracking
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_id UUID,                               -- FK to contacts
  organization_id UUID REFERENCES client_organizations(id) ON DELETE SET NULL,
  
  -- Core info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Stage machine
  stage opportunity_stage NOT NULL DEFAULT 'qualified',
  stage_changed_at TIMESTAMPTZ DEFAULT NOW(),
  days_in_stage INTEGER DEFAULT 0,
  
  -- Priority
  priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- QUALIFIED stage fields
  need_detected TEXT,
  next_action TEXT NOT NULL,
  next_action_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '3 days'),
  responsible_user_id UUID REFERENCES auth.users(id),
  
  -- PROPOSAL stage fields
  proposed_service TEXT,
  proposal_sent BOOLEAN DEFAULT FALSE,
  proposal_date DATE,
  estimated_amount_min DECIMAL(15,2),
  estimated_amount_max DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'UYU',
  
  -- NEGOTIATION stage fields
  objections objection_type[],
  last_interaction_at TIMESTAMPTZ,
  next_interaction_date DATE,
  tentative_amount DECIMAL(15,2),
  
  -- WON fields
  final_amount DECIMAL(15,2),
  final_currency VARCHAR(3),
  payment_type payment_type,
  start_date DATE,
  won_reason TEXT,
  won_at TIMESTAMPTZ,
  
  -- LOST fields
  lost_reason TEXT,
  lost_note TEXT,
  lost_at TIMESTAMPTZ,
  
  -- Computed / cached
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_revenue DECIMAL(15,2) GENERATED ALWAYS AS (
    COALESCE(tentative_amount, estimated_amount_max, 0) * probability / 100
  ) STORED,
  
  -- Ownership
  owner_user_id UUID REFERENCES auth.users(id),
  assigned_users UUID[],
  
  -- Metadata
  source VARCHAR(50),
  source_details TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  
  -- Lifecycle
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_company ON opportunities(my_company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_lead ON opportunities(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_client ON opportunities(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_priority ON opportunities(priority);
CREATE INDEX IF NOT EXISTS idx_opportunities_next_action ON opportunities(next_action_date) WHERE stage NOT IN ('won', 'lost');
CREATE INDEX IF NOT EXISTS idx_opportunities_probability ON opportunities(probability DESC) WHERE stage NOT IN ('won', 'lost');

-- 6. Updated_at trigger
CREATE OR REPLACE FUNCTION update_opportunities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_opportunities_updated_at ON opportunities;
CREATE TRIGGER trigger_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_opportunities_updated_at();

-- 7. Stage change tracking + validation trigger
CREATE OR REPLACE FUNCTION validate_opportunity_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Track stage change
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    NEW.stage_changed_at = NOW();
    NEW.days_in_stage = 0;
    
    -- Auto-set probability based on stage
    IF NEW.stage = 'qualified' AND (NEW.probability = OLD.probability OR NEW.probability = 0) THEN
      NEW.probability = 20;
    ELSIF NEW.stage = 'proposal' AND (NEW.probability = OLD.probability) THEN
      NEW.probability = 50;
    ELSIF NEW.stage = 'negotiation' AND (NEW.probability = OLD.probability) THEN
      NEW.probability = 75;
    ELSIF NEW.stage = 'won' THEN
      NEW.probability = 100;
    ELSIF NEW.stage = 'lost' THEN
      NEW.probability = 0;
    END IF;
    
    -- PROPOSAL stage validation
    IF NEW.stage = 'proposal' THEN
      IF NEW.proposed_service IS NULL OR NEW.proposed_service = '' THEN
        RAISE EXCEPTION 'PROPOSAL stage requires proposed_service';
      END IF;
    END IF;
    
    -- NEGOTIATION stage validation
    IF NEW.stage = 'negotiation' THEN
      IF NEW.next_interaction_date IS NULL THEN
        RAISE EXCEPTION 'NEGOTIATION stage requires next_interaction_date';
      END IF;
    END IF;
    
    -- WON stage validation
    IF NEW.stage = 'won' THEN
      IF NEW.final_amount IS NULL OR NEW.final_amount <= 0 THEN
        RAISE EXCEPTION 'WON stage requires final_amount > 0';
      END IF;
      IF NEW.final_currency IS NULL OR NEW.final_currency = '' THEN
        RAISE EXCEPTION 'WON stage requires final_currency';
      END IF;
      IF NEW.payment_type IS NULL THEN
        RAISE EXCEPTION 'WON stage requires payment_type';
      END IF;
      IF NEW.start_date IS NULL THEN
        RAISE EXCEPTION 'WON stage requires start_date';
      END IF;
      NEW.won_at = NOW();
    END IF;
    
    -- LOST stage validation
    IF NEW.stage = 'lost' THEN
      IF NEW.lost_reason IS NULL OR NEW.lost_reason = '' THEN
        RAISE EXCEPTION 'LOST stage requires lost_reason';
      END IF;
      NEW.lost_at = NOW();
    END IF;
    
    -- Log last interaction  
    NEW.last_interaction_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_opportunity_stage ON opportunities;
CREATE TRIGGER trigger_validate_opportunity_stage
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION validate_opportunity_stage_change();

-- 8. Opportunity activities (reuses contact_activities with opportunity_id)
ALTER TABLE contact_activities 
  ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contact_activities_opportunity 
  ON contact_activities(opportunity_id) WHERE opportunity_id IS NOT NULL;

-- 9. Audit trigger
CREATE OR REPLACE FUNCTION audit_opportunities_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_data, user_id)
    VALUES ('opportunities', NEW.id, 'INSERT', to_jsonb(NEW), NEW.owner_user_id);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Special audit for stage changes
    IF OLD.stage IS DISTINCT FROM NEW.stage THEN
      INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, user_id)
      VALUES (
        'opportunities', NEW.id, 'STAGE_CHANGE',
        jsonb_build_object('stage', OLD.stage::TEXT),
        jsonb_build_object('stage', NEW.stage::TEXT, 'reason', COALESCE(NEW.won_reason, NEW.lost_reason, '')),
        NEW.owner_user_id
      );
    ELSE
      INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, user_id)
      VALUES ('opportunities', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), NEW.owner_user_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, user_id)
    VALUES ('opportunities', OLD.id, 'DELETE', to_jsonb(OLD), OLD.owner_user_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_opportunities ON opportunities;
CREATE TRIGGER trigger_audit_opportunities
  AFTER INSERT OR UPDATE OR DELETE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION audit_opportunities_changes();

-- 10. RLS Policies
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY opportunities_select ON opportunities FOR SELECT
  USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY opportunities_insert ON opportunities FOR INSERT
  WITH CHECK (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY opportunities_update ON opportunities FOR UPDATE
  USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY opportunities_delete ON opportunities FOR DELETE
  USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- 11. Pipeline stats function
CREATE OR REPLACE FUNCTION get_opportunity_pipeline_stats(p_my_company_id UUID)
RETURNS TABLE (
  stage TEXT,
  count BIGINT,
  total_value NUMERIC,
  weighted_value NUMERIC,
  avg_days_in_stage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.stage::TEXT,
    COUNT(*)::BIGINT,
    COALESCE(SUM(COALESCE(o.final_amount, o.tentative_amount, o.estimated_amount_max, 0)), 0)::NUMERIC,
    COALESCE(SUM(o.expected_revenue), 0)::NUMERIC,
    ROUND(AVG(o.days_in_stage)::NUMERIC, 1)
  FROM opportunities o
  WHERE o.my_company_id = p_my_company_id
    AND o.is_active = TRUE
  GROUP BY o.stage
  ORDER BY 
    CASE o.stage
      WHEN 'qualified' THEN 1
      WHEN 'proposal' THEN 2
      WHEN 'negotiation' THEN 3
      WHEN 'won' THEN 4
      WHEN 'lost' THEN 5
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Opportunity won pipeline function (atomic)
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
BEGIN
  SELECT * INTO v_opp FROM opportunities WHERE id = p_opportunity_id;
  
  IF v_opp IS NULL THEN
    RAISE EXCEPTION 'Opportunity not found: %', p_opportunity_id;
  END IF;
  
  IF v_opp.stage != 'won' THEN
    RAISE EXCEPTION 'Opportunity must be in WON stage. Current: %', v_opp.stage;
  END IF;
  
  v_client_id := v_opp.client_id;
  
  -- Update client status to "Pending Onboarding" if exists
  IF v_client_id IS NOT NULL THEN
    UPDATE contacts SET 
      status = 'won',
      type = 'client',
      notes = COALESCE(notes, '') || E'\n[' || NOW()::TEXT || '] Converted to client from Opportunity: ' || v_opp.title
    WHERE id = v_client_id;
  END IF;
  
  -- Create Income record (atomic)
  INSERT INTO incomes (
    my_company_id, amount, currency, description, status,
    due_date, client_id
  ) VALUES (
    v_opp.my_company_id,
    v_opp.final_amount,
    COALESCE(v_opp.final_currency, 'UYU'),
    'Pago - ' || v_opp.title,
    'pending',
    COALESCE(v_opp.start_date, CURRENT_DATE) + INTERVAL '30 days',
    v_client_id
  )
  RETURNING id INTO v_income_id;
  
  -- Optionally create project
  INSERT INTO projects (
    my_company_id, client_id, name, description,
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
  
  -- Create onboarding task
  INSERT INTO tasks (
    my_company_id, project_id, title, description,
    status, priority, due_date
  ) VALUES (
    v_opp.my_company_id,
    v_project_id,
    'Onboarding: ' || v_opp.title,
    'Checklist de onboarding para nuevo cliente',
    'todo',
    'urgent',
    CURRENT_DATE + INTERVAL '7 days'
  );
  
  RETURN jsonb_build_object(
    'opportunity_id', p_opportunity_id,
    'client_id', v_client_id,
    'project_id', v_project_id,
    'income_id', v_income_id,
    'status', 'success'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Days in stage updater (for cron)
CREATE OR REPLACE FUNCTION update_opportunities_days_in_stage()
RETURNS void AS $$
BEGIN
  UPDATE opportunities
  SET days_in_stage = EXTRACT(DAY FROM NOW() - stage_changed_at)::INTEGER
  WHERE stage NOT IN ('won', 'lost')
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;
