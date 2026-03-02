-- ============================================================
-- MIGRATION 35: RECURRING PAYMENTS & RECEIPT SYSTEM
-- Verlyx Hub Enterprise Architecture
-- ============================================================
-- This migration adds:
-- 1. recurring_payment_schedules – tracks recurring payment plans
-- 2. payment_receipts – receipt/proof uploads for income payments
-- 3. Enhanced execute_opportunity_won() with hybrid payment support
-- 4. generate_recurring_incomes() – auto-creates monthly incomes
-- 5. get_overdue_payments() – returns overdue payment alerts
-- ============================================================

-- =============================================
-- 1. PAYMENT STRUCTURE ENUM
-- =============================================
DO $$ BEGIN
  CREATE TYPE payment_structure AS ENUM (
    'one_time',           -- Pago único
    'recurring',          -- Solo recurrente (mensual, trimestral, etc.)
    'dev_plus_maintenance' -- Desarrollo + Mensualidad/Mantenimiento
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- 2. RECURRING PAYMENT SCHEDULES
-- =============================================
CREATE TABLE IF NOT EXISTS recurring_payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  
  -- Links
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id UUID,
  
  -- Payment structure
  payment_structure payment_structure NOT NULL DEFAULT 'recurring',
  
  -- Development payment (one-time, for dev_plus_maintenance)
  dev_amount DECIMAL(15, 2) DEFAULT 0,
  dev_currency VARCHAR(3) DEFAULT 'UYU',
  dev_description TEXT,
  dev_income_id UUID, -- Link to the one-time income created
  dev_paid BOOLEAN DEFAULT FALSE,
  
  -- Recurring payment details
  recurring_amount DECIMAL(15, 2) NOT NULL CHECK (recurring_amount >= 0),
  recurring_currency VARCHAR(3) NOT NULL DEFAULT 'UYU',
  recurring_description TEXT,
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
  
  -- Schedule
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE, -- NULL = indefinite
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  total_invoiced DECIMAL(15, 2) DEFAULT 0,
  total_paid DECIMAL(15, 2) DEFAULT 0,
  invoices_generated INTEGER DEFAULT 0,
  invoices_paid INTEGER DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rps_company ON recurring_payment_schedules(my_company_id);
CREATE INDEX IF NOT EXISTS idx_rps_opportunity ON recurring_payment_schedules(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_rps_project ON recurring_payment_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_rps_client ON recurring_payment_schedules(client_id);
CREATE INDEX IF NOT EXISTS idx_rps_next_due ON recurring_payment_schedules(next_due_date) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_rps_active ON recurring_payment_schedules(is_active);

ALTER TABLE recurring_payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY rps_select ON recurring_payment_schedules FOR SELECT
  USING (my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

CREATE POLICY rps_insert ON recurring_payment_schedules FOR INSERT
  WITH CHECK (my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

CREATE POLICY rps_update ON recurring_payment_schedules FOR UPDATE
  USING (my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

CREATE POLICY rps_delete ON recurring_payment_schedules FOR DELETE
  USING (my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

-- =============================================
-- 3. ADD COLUMNS TO INCOMES TABLE
-- =============================================
-- Add recurring schedule link and receipt columns to existing incomes table
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS recurring_schedule_id UUID REFERENCES recurring_payment_schedules(id) ON DELETE SET NULL;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMPTZ;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS payment_structure payment_structure;
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS is_development_payment BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_incomes_recurring_schedule ON incomes(recurring_schedule_id) WHERE recurring_schedule_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incomes_overdue ON incomes(due_date, status) WHERE status = 'pending';

-- =============================================
-- 4. ENHANCED execute_opportunity_won() WITH HYBRID PAYMENT SUPPORT
-- =============================================
-- Now accepts payment structure parameters and creates appropriate incomes
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
  v_schedule_id UUID;
  v_dev_income_id UUID;
  v_has_incomes BOOLEAN;
  v_payment_struct TEXT;
  v_dev_amount NUMERIC;
  v_recurring_amount NUMERIC;
  v_frequency TEXT;
  v_metadata JSONB;
BEGIN
  SELECT * INTO v_opp FROM opportunities WHERE id = p_opportunity_id;
  
  IF v_opp IS NULL THEN
    RAISE EXCEPTION 'Opportunity not found: %', p_opportunity_id;
  END IF;
  
  IF v_opp.stage != 'won' THEN
    RAISE EXCEPTION 'Opportunity must be in WON stage. Current: %', v_opp.stage;
  END IF;
  
  v_client_id := v_opp.client_id;
  
  -- Extract payment structure from custom_fields (set by frontend)
  v_metadata := COALESCE(v_opp.custom_fields, '{}'::JSONB);
  v_payment_struct := COALESCE(v_metadata->>'payment_structure', 'one_time');
  v_dev_amount := COALESCE((v_metadata->>'dev_amount')::NUMERIC, 0);
  v_recurring_amount := COALESCE((v_metadata->>'recurring_amount')::NUMERIC, 0);
  v_frequency := COALESCE(v_metadata->>'recurring_frequency', 'monthly');
  
  -- 1. Update contact → client status
  IF v_client_id IS NOT NULL THEN
    UPDATE contacts SET 
      status = 'won',
      type = 'client',
      notes = COALESCE(notes, '') || E'\n[' || NOW()::TEXT || '] Convertido a cliente desde Oportunidad: ' || v_opp.title
    WHERE id = v_client_id;
  END IF;
  
  -- 2. Check if incomes table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'incomes'
  ) INTO v_has_incomes;
  
  -- 3. Create income(s) based on payment structure
  IF v_has_incomes AND v_opp.final_amount IS NOT NULL THEN
    
    IF v_payment_struct = 'dev_plus_maintenance' THEN
      -- === HYBRID: Dev fee (one-time) + Recurring maintenance ===
      
      -- 3a. Create one-time development income
      IF v_dev_amount > 0 THEN
        EXECUTE format(
          'INSERT INTO incomes (my_company_id, amount, currency, description, status, due_date, client_id, is_recurring, payment_structure, is_development_payment)
           VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, true) RETURNING id'
        ) INTO v_dev_income_id
        USING v_opp.my_company_id,
              v_dev_amount,
              COALESCE(v_opp.final_currency, 'UYU'),
              'Desarrollo - ' || v_opp.title,
              'pending',
              COALESCE(v_opp.start_date, CURRENT_DATE) + INTERVAL '30 days',
              v_client_id,
              'dev_plus_maintenance'::payment_structure;
      END IF;
      
      -- 3b. Create recurring payment schedule
      IF v_recurring_amount > 0 THEN
        INSERT INTO recurring_payment_schedules (
          my_company_id, opportunity_id, client_id,
          payment_structure,
          dev_amount, dev_currency, dev_description, dev_income_id, dev_paid,
          recurring_amount, recurring_currency, recurring_description, frequency,
          start_date, next_due_date,
          created_by
        ) VALUES (
          v_opp.my_company_id, p_opportunity_id, v_client_id,
          'dev_plus_maintenance',
          v_dev_amount, COALESCE(v_opp.final_currency, 'UYU'), 'Desarrollo - ' || v_opp.title, v_dev_income_id, FALSE,
          v_recurring_amount, COALESCE(v_opp.final_currency, 'UYU'), 'Mantenimiento - ' || v_opp.title, v_frequency,
          COALESCE(v_opp.start_date, CURRENT_DATE),
          COALESCE(v_opp.start_date, CURRENT_DATE) + INTERVAL '1 month',
          p_user_id
        ) RETURNING id INTO v_schedule_id;
        
        -- 3c. Create first recurring income
        EXECUTE format(
          'INSERT INTO incomes (my_company_id, amount, currency, description, status, due_date, client_id, is_recurring, recurring_frequency, recurring_schedule_id, payment_structure)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10) RETURNING id'
        ) INTO v_income_id
        USING v_opp.my_company_id,
              v_recurring_amount,
              COALESCE(v_opp.final_currency, 'UYU'),
              'Mantenimiento - ' || v_opp.title || ' (Mes 1)',
              'pending',
              COALESCE(v_opp.start_date, CURRENT_DATE) + INTERVAL '1 month',
              v_client_id,
              v_frequency,
              v_schedule_id,
              'dev_plus_maintenance'::payment_structure;
      END IF;
      
    ELSIF v_payment_struct = 'recurring' THEN
      -- === RECURRING ONLY ===
      INSERT INTO recurring_payment_schedules (
        my_company_id, opportunity_id, client_id,
        payment_structure,
        recurring_amount, recurring_currency, recurring_description, frequency,
        start_date, next_due_date,
        created_by
      ) VALUES (
        v_opp.my_company_id, p_opportunity_id, v_client_id,
        'recurring',
        v_opp.final_amount, COALESCE(v_opp.final_currency, 'UYU'), 'Pago recurrente - ' || v_opp.title, v_frequency,
        COALESCE(v_opp.start_date, CURRENT_DATE),
        COALESCE(v_opp.start_date, CURRENT_DATE) + INTERVAL '1 month',
        p_user_id
      ) RETURNING id INTO v_schedule_id;
      
      -- Create first income
      EXECUTE format(
        'INSERT INTO incomes (my_company_id, amount, currency, description, status, due_date, client_id, is_recurring, recurring_frequency, recurring_schedule_id, payment_structure)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10) RETURNING id'
      ) INTO v_income_id
      USING v_opp.my_company_id,
            v_opp.final_amount,
            COALESCE(v_opp.final_currency, 'UYU'),
            'Pago recurrente - ' || v_opp.title || ' (Mes 1)',
            'pending',
            COALESCE(v_opp.start_date, CURRENT_DATE) + INTERVAL '1 month',
            v_client_id,
            v_frequency,
            v_schedule_id,
            'recurring'::payment_structure;
            
    ELSE
      -- === ONE-TIME PAYMENT ===
      EXECUTE format(
        'INSERT INTO incomes (my_company_id, amount, currency, description, status, due_date, client_id, payment_structure)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id'
      ) INTO v_income_id
      USING v_opp.my_company_id,
            v_opp.final_amount,
            COALESCE(v_opp.final_currency, 'UYU'),
            'Pago - ' || v_opp.title,
            'pending',
            COALESCE(v_opp.start_date, CURRENT_DATE) + INTERVAL '30 days',
            v_client_id,
            'one_time'::payment_structure;
    END IF;
  END IF;
  
  -- 4. Create project
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
  
  -- Link schedule to project
  IF v_schedule_id IS NOT NULL THEN
    UPDATE recurring_payment_schedules SET project_id = v_project_id WHERE id = v_schedule_id;
  END IF;
  
  -- 5. Create onboarding task
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
  
  -- 6. Create onboarding checklist items
  INSERT INTO onboarding_items (my_company_id, opportunity_id, project_id, client_id, title, category, sort_order, due_date, assigned_to) VALUES
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Enviar email de bienvenida', 'kickoff', 1, CURRENT_DATE + INTERVAL '1 day', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Agendar reunión de kick-off', 'kickoff', 2, CURRENT_DATE + INTERVAL '3 days', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Recopilar documentación del cliente', 'documentation', 3, CURRENT_DATE + INTERVAL '5 days', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Configurar accesos y permisos', 'access', 4, CURRENT_DATE + INTERVAL '5 days', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Definir plan de implementación', 'kickoff', 5, CURRENT_DATE + INTERVAL '7 days', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Configurar facturación', 'billing', 6, CURRENT_DATE + INTERVAL '7 days', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Capacitación inicial', 'training', 7, CURRENT_DATE + INTERVAL '14 days', p_user_id);
  
  -- 7. Log the conversion activity
  INSERT INTO opportunity_activities (
    my_company_id, opportunity_id, activity_type,
    subject, description,
    performed_by, project_id, contact_id,
    metadata
  ) VALUES (
    v_opp.my_company_id, p_opportunity_id, 'won',
    'Oportunidad ganada — ciclo de vida ejecutado',
    'Cliente actualizado, proyecto creado, onboarding generado. Estructura de pago: ' || v_payment_struct,
    p_user_id, v_project_id, v_client_id,
    jsonb_build_object(
      'final_amount', v_opp.final_amount,
      'currency', COALESCE(v_opp.final_currency, 'UYU'),
      'payment_structure', v_payment_struct,
      'dev_amount', v_dev_amount,
      'recurring_amount', v_recurring_amount,
      'frequency', v_frequency,
      'project_id', v_project_id,
      'income_id', COALESCE(v_income_id, v_dev_income_id),
      'schedule_id', v_schedule_id,
      'client_id', v_client_id,
      'onboarding_items', 7
    )
  );
  
  -- 8. Audit log
  INSERT INTO audit_logs (entity_type, entity_id, action, changes, user_id)
  VALUES (
    'opportunity', p_opportunity_id, 'STATUS_CHANGE'::audit_action,
    jsonb_build_object(
      'event', 'opportunity_won_lifecycle',
      'payment_structure', v_payment_struct,
      'project_id', v_project_id,
      'income_id', COALESCE(v_income_id, v_dev_income_id),
      'schedule_id', v_schedule_id,
      'client_id', v_client_id,
      'final_amount', v_opp.final_amount
    ),
    p_user_id
  );
  
  RETURN jsonb_build_object(
    'opportunity_id', p_opportunity_id,
    'client_id', v_client_id,
    'project_id', v_project_id,
    'income_id', COALESCE(v_income_id, v_dev_income_id),
    'dev_income_id', v_dev_income_id,
    'schedule_id', v_schedule_id,
    'payment_structure', v_payment_struct,
    'onboarding_items', 7,
    'status', 'success'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. GENERATE RECURRING INCOMES
-- =============================================
-- Call this periodically (e.g., daily via cron or on page load)
-- to auto-create income records for recurring schedules
CREATE OR REPLACE FUNCTION generate_recurring_incomes()
RETURNS TABLE (
  schedule_id UUID,
  income_id UUID,
  amount NUMERIC,
  due_date DATE,
  description TEXT
) AS $$
DECLARE
  v_schedule RECORD;
  v_new_income_id UUID;
  v_new_due_date DATE;
  v_month_number INTEGER;
BEGIN
  FOR v_schedule IN
    SELECT * FROM recurring_payment_schedules
    WHERE is_active = TRUE
      AND next_due_date <= CURRENT_DATE
      AND (end_date IS NULL OR next_due_date <= end_date)
  LOOP
    v_month_number := v_schedule.invoices_generated + 1;
    
    -- Create new income
    INSERT INTO incomes (
      my_company_id, amount, currency, description, status, due_date,
      client_id, is_recurring, recurring_frequency, recurring_schedule_id, payment_structure
    ) VALUES (
      v_schedule.my_company_id,
      v_schedule.recurring_amount,
      v_schedule.recurring_currency,
      v_schedule.recurring_description || ' (Mes ' || v_month_number || ')',
      'pending',
      v_schedule.next_due_date,
      v_schedule.client_id,
      TRUE,
      v_schedule.frequency,
      v_schedule.id,
      v_schedule.payment_structure
    ) RETURNING id INTO v_new_income_id;
    
    -- Calculate next due date based on frequency
    v_new_due_date := CASE v_schedule.frequency
      WHEN 'monthly' THEN v_schedule.next_due_date + INTERVAL '1 month'
      WHEN 'quarterly' THEN v_schedule.next_due_date + INTERVAL '3 months'
      WHEN 'semi_annual' THEN v_schedule.next_due_date + INTERVAL '6 months'
      WHEN 'annual' THEN v_schedule.next_due_date + INTERVAL '1 year'
      ELSE v_schedule.next_due_date + INTERVAL '1 month'
    END;
    
    -- Update schedule
    UPDATE recurring_payment_schedules SET
      next_due_date = v_new_due_date,
      total_invoiced = total_invoiced + v_schedule.recurring_amount,
      invoices_generated = invoices_generated + 1,
      updated_at = NOW()
    WHERE id = v_schedule.id;
    
    schedule_id := v_schedule.id;
    income_id := v_new_income_id;
    amount := v_schedule.recurring_amount;
    due_date := v_schedule.next_due_date;
    description := v_schedule.recurring_description || ' (Mes ' || v_month_number || ')';
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. GET OVERDUE PAYMENTS
-- =============================================
CREATE OR REPLACE FUNCTION get_overdue_payments(p_company_id UUID)
RETURNS TABLE (
  income_id UUID,
  description TEXT,
  amount NUMERIC,
  currency VARCHAR,
  due_date DATE,
  days_overdue INTEGER,
  client_id UUID,
  client_name VARCHAR,
  is_recurring BOOLEAN,
  schedule_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.description,
    i.amount,
    i.currency,
    i.due_date,
    (CURRENT_DATE - i.due_date)::INTEGER AS days_overdue,
    i.client_id,
    i.client_name,
    i.is_recurring,
    i.recurring_schedule_id
  FROM incomes i
  WHERE i.my_company_id = p_company_id
    AND i.status = 'pending'
    AND i.due_date < CURRENT_DATE
  ORDER BY i.due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. MARK INCOME AS PAID (with receipt support)
-- =============================================
CREATE OR REPLACE FUNCTION mark_income_paid(
  p_income_id UUID,
  p_receipt_url TEXT DEFAULT NULL,
  p_payment_date DATE DEFAULT CURRENT_DATE,
  p_payment_method VARCHAR DEFAULT 'transfer'
)
RETURNS JSONB AS $$
DECLARE
  v_income RECORD;
  v_schedule_id UUID;
BEGIN
  SELECT * INTO v_income FROM incomes WHERE id = p_income_id;
  
  IF v_income IS NULL THEN
    RAISE EXCEPTION 'Income not found: %', p_income_id;
  END IF;
  
  -- Update income
  UPDATE incomes SET
    status = 'received',
    payment_date = p_payment_date,
    payment_method = p_payment_method,
    receipt_url = p_receipt_url,
    receipt_uploaded_at = CASE WHEN p_receipt_url IS NOT NULL THEN NOW() ELSE NULL END,
    paid_at = NOW(),
    updated_at = NOW()
  WHERE id = p_income_id;
  
  -- Update recurring schedule totals if applicable
  IF v_income.recurring_schedule_id IS NOT NULL THEN
    UPDATE recurring_payment_schedules SET
      total_paid = total_paid + v_income.amount,
      invoices_paid = invoices_paid + 1,
      updated_at = NOW()
    WHERE id = v_income.recurring_schedule_id;
  END IF;
  
  -- If this is a development payment, mark dev as paid in schedule
  IF v_income.is_development_payment = TRUE THEN
    UPDATE recurring_payment_schedules SET
      dev_paid = TRUE,
      updated_at = NOW()
    WHERE dev_income_id = p_income_id;
  END IF;
  
  RETURN jsonb_build_object(
    'income_id', p_income_id,
    'status', 'received',
    'payment_date', p_payment_date,
    'has_receipt', p_receipt_url IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. UPDATED_AT TRIGGER FOR SCHEDULES
-- =============================================
CREATE OR REPLACE FUNCTION update_rps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_rps_updated_at ON recurring_payment_schedules;
CREATE TRIGGER trigger_rps_updated_at
  BEFORE UPDATE ON recurring_payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_rps_updated_at();
