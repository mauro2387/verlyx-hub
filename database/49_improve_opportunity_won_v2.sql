-- ============================================================
-- MIGRATION 49: IMPROVE execute_opportunity_won
-- ============================================================
-- Enhancements:
-- 1. Read client_data from custom_fields → enrich client with
--    email, phone, company, position, address
-- 2. Read project_data from custom_fields → enrich project with
--    name, description, type, tech_stack, due_date
-- 3. Handle new payment structures: split_40_60, split_50_50,
--    milestone_custom
-- 4. Add split_40_60, split_50_50, milestone_custom to enum
-- ============================================================

-- First, safely add new enum values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'split_40_60' AND enumtypid = 'payment_structure'::regtype) THEN
    ALTER TYPE payment_structure ADD VALUE 'split_40_60';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'split_50_50' AND enumtypid = 'payment_structure'::regtype) THEN
    ALTER TYPE payment_structure ADD VALUE 'split_50_50';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'milestone_custom' AND enumtypid = 'payment_structure'::regtype) THEN
    ALTER TYPE payment_structure ADD VALUE 'milestone_custom';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop existing function
DROP FUNCTION IF EXISTS execute_opportunity_won(UUID, UUID);

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
  v_dev_income_2 UUID;
  v_has_incomes BOOLEAN;
  v_payment_struct TEXT;
  v_dev_amount NUMERIC;
  v_dev_split_mode TEXT;
  v_recurring_amount NUMERIC;
  v_frequency TEXT;
  v_metadata JSONB;
  v_client_data JSONB;
  v_project_data JSONB;
  v_client_name TEXT;
  v_client_email TEXT;
  v_client_phone TEXT;
  v_client_company TEXT;
  v_client_position TEXT;
  v_client_address TEXT;
  v_project_name TEXT;
  v_project_desc TEXT;
  v_project_type TEXT;
  v_project_due DATE;
  v_split_total NUMERIC;
  v_split_first NUMERIC;
  v_split_second NUMERIC;
  v_milestones JSONB;
  v_milestone JSONB;
  v_milestone_amount NUMERIC;
  v_i INTEGER;
BEGIN
  SELECT * INTO v_opp FROM opportunities WHERE id = p_opportunity_id;
  
  IF v_opp IS NULL THEN
    RAISE EXCEPTION 'Opportunity not found: %', p_opportunity_id;
  END IF;
  
  IF v_opp.stage != 'won' THEN
    RAISE EXCEPTION 'Opportunity must be in WON stage. Current: %', v_opp.stage;
  END IF;
  
  v_client_id := v_opp.client_id;
  
  -- Extract all data from custom_fields
  v_metadata := COALESCE(v_opp.custom_fields, '{}'::JSONB);
  v_payment_struct := COALESCE(v_metadata->>'payment_structure', 'one_time');
  v_dev_amount := COALESCE((v_metadata->>'dev_amount')::NUMERIC, 0);
  v_dev_split_mode := NULLIF(TRIM(v_metadata->>'dev_split_mode'), '');
  v_recurring_amount := COALESCE((v_metadata->>'recurring_amount')::NUMERIC, 0);
  v_frequency := COALESCE(v_metadata->>'recurring_frequency', 'monthly');
  v_split_total := COALESCE((v_metadata->>'split_total')::NUMERIC, v_opp.final_amount);
  v_milestones := v_metadata->'milestones_data';
  
  -- Extract client enrichment data
  v_client_data := v_metadata->'client_data';
  IF v_client_data IS NOT NULL THEN
    v_client_name := NULLIF(TRIM(v_client_data->>'name'), '');
    v_client_email := NULLIF(TRIM(v_client_data->>'email'), '');
    v_client_phone := NULLIF(TRIM(v_client_data->>'phone'), '');
    v_client_company := NULLIF(TRIM(v_client_data->>'company'), '');
    v_client_position := NULLIF(TRIM(v_client_data->>'position'), '');
    v_client_address := NULLIF(TRIM(v_client_data->>'address'), '');
  END IF;
  
  -- Extract project enrichment data
  v_project_data := v_metadata->'project_data';
  IF v_project_data IS NOT NULL THEN
    v_project_name := NULLIF(TRIM(v_project_data->>'name'), '');
    v_project_desc := NULLIF(TRIM(v_project_data->>'description'), '');
    v_project_type := NULLIF(TRIM(v_project_data->>'type'), '');
    BEGIN
      v_project_due := (v_project_data->>'due_date')::DATE;
    EXCEPTION WHEN OTHERS THEN
      v_project_due := NULL;
    END;
  END IF;
  
  -- Fallback names
  IF v_client_name IS NULL THEN
    v_client_name := regexp_replace(v_opp.title, '^Oportunidad:\s*', '', 'i');
    IF v_client_name = '' OR v_client_name IS NULL THEN
      v_client_name := 'Cliente - ' || v_opp.title;
    END IF;
  END IF;
  
  IF v_project_name IS NULL THEN
    v_project_name := v_opp.title;
  END IF;
  
  IF v_project_desc IS NULL THEN
    v_project_desc := COALESCE(v_opp.description, 'Proyecto generado desde oportunidad ganada');
  END IF;
  
  -- ============================================================
  -- 1. ENSURE CLIENT EXISTS (enriched with wizard data)
  -- ============================================================
  IF v_client_id IS NOT NULL THEN
    -- Update existing contact → client status + enrich data
    UPDATE contacts SET 
      status = 'won',
      type = 'client',
      email = COALESCE(v_client_email, email),
      phone = COALESCE(v_client_phone, phone),
      company = COALESCE(v_client_company, company),
      position = COALESCE(v_client_position, position),
      address = COALESCE(v_client_address, address),
      notes = COALESCE(notes, '') || E'\n[' || NOW()::TEXT || '] Convertido a cliente desde Oportunidad: ' || v_opp.title
    WHERE id = v_client_id;
  ELSE
    -- No client linked — create one with full data from wizard
    INSERT INTO contacts (
      my_company_id, user_id, first_name, email, phone, company, position, address, type, status, notes
    ) VALUES (
      v_opp.my_company_id,
      p_user_id,
      v_client_name,
      v_client_email,
      v_client_phone,
      COALESCE(v_client_company, v_client_name),
      v_client_position,
      v_client_address,
      'client',
      'won',
      '[' || NOW()::TEXT || '] Auto-creado desde Oportunidad Ganada: ' || v_opp.title
    )
    RETURNING id INTO v_client_id;
    
    -- Link the new contact back to the opportunity
    UPDATE opportunities SET client_id = v_client_id WHERE id = p_opportunity_id;
  END IF;
  
  -- ============================================================
  -- 2. Check if incomes table exists
  -- ============================================================
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'incomes'
  ) INTO v_has_incomes;
  
  -- ============================================================
  -- 3. Create income(s) based on payment structure
  -- ============================================================
  IF v_has_incomes AND v_opp.final_amount IS NOT NULL THEN
    
    IF v_payment_struct = 'dev_plus_maintenance' THEN
      -- === HYBRID: Dev fee + Recurring maintenance ===
      
      IF v_dev_amount > 0 THEN
        IF v_dev_split_mode = '40_60' OR v_dev_split_mode = '50_50' THEN
          -- Split the dev amount into two payments
          IF v_dev_split_mode = '40_60' THEN
            v_split_first := ROUND(v_dev_amount * 0.4);
            v_split_second := v_dev_amount - v_split_first;
          ELSE
            v_split_first := ROUND(v_dev_amount * 0.5);
            v_split_second := v_dev_amount - v_split_first;
          END IF;
          
          -- First dev payment (upfront)
          EXECUTE format(
            'INSERT INTO incomes (my_company_id, amount, currency, description, status, due_date, client_id, is_recurring, payment_structure, is_development_payment)
             VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, true) RETURNING id'
          ) INTO v_dev_income_id
          USING v_opp.my_company_id,
                v_split_first,
                COALESCE(v_opp.final_currency, 'UYU'),
                CASE WHEN v_dev_split_mode = '40_60' THEN '40% Desarrollo' ELSE '50% Desarrollo' END || ' - ' || v_project_name,
                'pending',
                COALESCE(v_opp.start_date, CURRENT_DATE),
                v_client_id,
                'dev_plus_maintenance'::payment_structure;
          
          -- Second dev payment (on delivery)
          EXECUTE format(
            'INSERT INTO incomes (my_company_id, amount, currency, description, status, due_date, client_id, is_recurring, payment_structure, is_development_payment)
             VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, true) RETURNING id'
          ) INTO v_dev_income_2
          USING v_opp.my_company_id,
                v_split_second,
                COALESCE(v_opp.final_currency, 'UYU'),
                CASE WHEN v_dev_split_mode = '40_60' THEN '60% Desarrollo' ELSE '50% Desarrollo' END || ' - ' || v_project_name,
                'pending',
                COALESCE(v_project_due, COALESCE(v_opp.start_date, CURRENT_DATE) + INTERVAL '60 days'),
                v_client_id,
                'dev_plus_maintenance'::payment_structure;
        ELSE
          -- Single dev payment (original behavior)
          EXECUTE format(
            'INSERT INTO incomes (my_company_id, amount, currency, description, status, due_date, client_id, is_recurring, payment_structure, is_development_payment)
             VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, true) RETURNING id'
          ) INTO v_dev_income_id
          USING v_opp.my_company_id,
                v_dev_amount,
                COALESCE(v_opp.final_currency, 'UYU'),
                'Desarrollo - ' || v_project_name,
                'pending',
                COALESCE(v_opp.start_date, CURRENT_DATE) + INTERVAL '30 days',
                v_client_id,
                'dev_plus_maintenance'::payment_structure;
        END IF;
      END IF;
      
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
          v_dev_amount, COALESCE(v_opp.final_currency, 'UYU'), 'Desarrollo - ' || v_project_name, v_dev_income_id, FALSE,
          v_recurring_amount, COALESCE(v_opp.final_currency, 'UYU'), 'Mantenimiento - ' || v_project_name, v_frequency,
          COALESCE(v_opp.start_date, CURRENT_DATE),
          COALESCE(v_opp.start_date, CURRENT_DATE) + INTERVAL '1 month',
          p_user_id
        ) RETURNING id INTO v_schedule_id;
        
        EXECUTE format(
          'INSERT INTO incomes (my_company_id, amount, currency, description, status, due_date, client_id, is_recurring, recurring_frequency, recurring_schedule_id, payment_structure)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10) RETURNING id'
        ) INTO v_income_id
        USING v_opp.my_company_id,
              v_recurring_amount,
              COALESCE(v_opp.final_currency, 'UYU'),
              'Mantenimiento - ' || v_project_name || ' (Mes 1)',
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
        v_opp.final_amount, COALESCE(v_opp.final_currency, 'UYU'), 'Pago recurrente - ' || v_project_name, v_frequency,
        COALESCE(v_opp.start_date, CURRENT_DATE),
        COALESCE(v_opp.start_date, CURRENT_DATE) + INTERVAL '1 month',
        p_user_id
      ) RETURNING id INTO v_schedule_id;
      
      EXECUTE format(
        'INSERT INTO incomes (my_company_id, amount, currency, description, status, due_date, client_id, is_recurring, recurring_frequency, recurring_schedule_id, payment_structure)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10) RETURNING id'
      ) INTO v_income_id
      USING v_opp.my_company_id,
            v_opp.final_amount,
            COALESCE(v_opp.final_currency, 'UYU'),
            'Pago recurrente - ' || v_project_name || ' (Mes 1)',
            'pending',
            COALESCE(v_opp.start_date, CURRENT_DATE) + INTERVAL '1 month',
            v_client_id,
            v_frequency,
            v_schedule_id,
            'recurring'::payment_structure;
    
    ELSIF v_payment_struct = 'split_40_60' THEN
      -- === 40/60 SPLIT ===
      v_split_first := ROUND(COALESCE(v_split_total, v_opp.final_amount) * 0.4);
      v_split_second := ROUND(COALESCE(v_split_total, v_opp.final_amount) * 0.6);
      
      -- First payment: 40% upfront
      EXECUTE format(
        'INSERT INTO incomes (my_company_id, amount, currency, description, status, due_date, client_id, payment_structure)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id'
      ) INTO v_income_id
      USING v_opp.my_company_id,
            v_split_first,
            COALESCE(v_opp.final_currency, 'UYU'),
            '40% Anticipo - ' || v_project_name,
            'pending',
            COALESCE(v_opp.start_date, CURRENT_DATE),
            v_client_id,
            'one_time'::payment_structure;
      
      -- Second payment: 60% on delivery  
      EXECUTE format(
        'INSERT INTO incomes (my_company_id, amount, currency, description, status, due_date, client_id, payment_structure)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id'
      ) INTO v_dev_income_id
      USING v_opp.my_company_id,
            v_split_second,
            COALESCE(v_opp.final_currency, 'UYU'),
            '60% Entrega - ' || v_project_name,
            'pending',
            COALESCE(v_project_due, COALESCE(v_opp.start_date, CURRENT_DATE) + INTERVAL '60 days'),
            v_client_id,
            'one_time'::payment_structure;
    
    ELSIF v_payment_struct = 'split_50_50' THEN
      -- === 50/50 SPLIT ===
      v_split_first := ROUND(COALESCE(v_split_total, v_opp.final_amount) * 0.5);
      v_split_second := COALESCE(v_split_total, v_opp.final_amount) - v_split_first;
      
      EXECUTE format(
        'INSERT INTO incomes (my_company_id, amount, currency, description, status, due_date, client_id, payment_structure)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id'
      ) INTO v_income_id
      USING v_opp.my_company_id,
            v_split_first,
            COALESCE(v_opp.final_currency, 'UYU'),
            '50% Anticipo - ' || v_project_name,
            'pending',
            COALESCE(v_opp.start_date, CURRENT_DATE),
            v_client_id,
            'one_time'::payment_structure;
      
      EXECUTE format(
        'INSERT INTO incomes (my_company_id, amount, currency, description, status, due_date, client_id, payment_structure)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id'
      ) INTO v_dev_income_id
      USING v_opp.my_company_id,
            v_split_second,
            COALESCE(v_opp.final_currency, 'UYU'),
            '50% Entrega - ' || v_project_name,
            'pending',
            COALESCE(v_project_due, COALESCE(v_opp.start_date, CURRENT_DATE) + INTERVAL '60 days'),
            v_client_id,
            'one_time'::payment_structure;
    
    ELSIF v_payment_struct = 'milestone_custom' THEN
      -- === CUSTOM MILESTONES ===
      IF v_milestones IS NOT NULL AND jsonb_array_length(v_milestones) > 0 THEN
        FOR v_i IN 0..jsonb_array_length(v_milestones) - 1 LOOP
          v_milestone := v_milestones->v_i;
          v_milestone_amount := COALESCE((v_milestone->>'amount')::NUMERIC, 0);
          IF v_milestone_amount > 0 THEN
            EXECUTE format(
              'INSERT INTO incomes (my_company_id, amount, currency, description, status, due_date, client_id, payment_structure)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id'
            ) INTO v_income_id
            USING v_opp.my_company_id,
                  v_milestone_amount,
                  COALESCE(v_opp.final_currency, 'UYU'),
                  COALESCE(v_milestone->>'name', 'Hito ' || (v_i + 1)) || ' - ' || v_project_name,
                  'pending',
                  COALESCE(v_opp.start_date, CURRENT_DATE) + (v_i * INTERVAL '30 days'),
                  v_client_id,
                  'one_time'::payment_structure;
          END IF;
        END LOOP;
      ELSE
        -- Fallback: single income
        EXECUTE format(
          'INSERT INTO incomes (my_company_id, amount, currency, description, status, due_date, client_id, payment_structure)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id'
        ) INTO v_income_id
        USING v_opp.my_company_id,
              v_opp.final_amount,
              COALESCE(v_opp.final_currency, 'UYU'),
              'Pago - ' || v_project_name,
              'pending',
              COALESCE(v_opp.start_date, CURRENT_DATE) + INTERVAL '30 days',
              v_client_id,
              'one_time'::payment_structure;
      END IF;

    ELSE
      -- === ONE-TIME PAYMENT (default) ===
      EXECUTE format(
        'INSERT INTO incomes (my_company_id, amount, currency, description, status, due_date, client_id, payment_structure)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id'
      ) INTO v_income_id
      USING v_opp.my_company_id,
            v_opp.final_amount,
            COALESCE(v_opp.final_currency, 'UYU'),
            'Pago - ' || v_project_name,
            'pending',
            COALESCE(v_opp.start_date, CURRENT_DATE) + INTERVAL '30 days',
            v_client_id,
            'one_time'::payment_structure;
    END IF;
  END IF;
  
  -- ============================================================
  -- 4. Create project (enriched with wizard data)
  -- ============================================================
  INSERT INTO projects (
    my_company_id, contact_id, name, description,
    status, priority, start_date, end_date,
    budget, currency
  ) VALUES (
    v_opp.my_company_id,
    v_client_id,
    v_project_name,
    v_project_desc,
    'planning',
    'high',
    COALESCE(v_opp.start_date, CURRENT_DATE),
    v_project_due,
    v_opp.final_amount,
    COALESCE(v_opp.final_currency, 'UYU')
  )
  RETURNING id INTO v_project_id;
  
  -- Link schedule to project
  IF v_schedule_id IS NOT NULL THEN
    UPDATE recurring_payment_schedules SET project_id = v_project_id WHERE id = v_schedule_id;
  END IF;
  
  -- ============================================================
  -- 5. Onboarding task
  -- ============================================================
  INSERT INTO tasks (
    project_id, title, description,
    status, priority, due_date
  ) VALUES (
    v_project_id,
    'Onboarding: ' || v_project_name,
    'Checklist de onboarding para nuevo cliente: ' || v_client_name,
    'todo',
    'urgent',
    CURRENT_DATE + INTERVAL '7 days'
  );
  
  -- ============================================================
  -- 6. Onboarding checklist items
  -- ============================================================
  INSERT INTO onboarding_items (my_company_id, opportunity_id, project_id, client_id, title, category, sort_order, due_date, assigned_to) VALUES
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Enviar email de bienvenida', 'kickoff', 1, CURRENT_DATE + INTERVAL '1 day', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Agendar reunión de kick-off', 'kickoff', 2, CURRENT_DATE + INTERVAL '3 days', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Recopilar documentación del cliente', 'documentation', 3, CURRENT_DATE + INTERVAL '5 days', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Configurar accesos y permisos', 'access', 4, CURRENT_DATE + INTERVAL '5 days', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Definir plan de implementación', 'kickoff', 5, CURRENT_DATE + INTERVAL '7 days', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Configurar facturación', 'billing', 6, CURRENT_DATE + INTERVAL '7 days', p_user_id),
    (v_opp.my_company_id, p_opportunity_id, v_project_id, v_client_id, 'Capacitación inicial', 'training', 7, CURRENT_DATE + INTERVAL '14 days', p_user_id);
  
  -- ============================================================
  -- 7. Activity log
  -- ============================================================
  INSERT INTO opportunity_activities (
    my_company_id, opportunity_id, activity_type,
    subject, description,
    performed_by, project_id, contact_id,
    metadata
  ) VALUES (
    v_opp.my_company_id, p_opportunity_id, 'won',
    'Oportunidad ganada — ciclo de vida ejecutado',
    'Cliente: ' || v_client_name || '. Proyecto: ' || v_project_name || '. Estructura de pago: ' || v_payment_struct,
    p_user_id, v_project_id, v_client_id,
    jsonb_build_object(
      'final_amount', v_opp.final_amount,
      'currency', COALESCE(v_opp.final_currency, 'UYU'),
      'payment_structure', v_payment_struct,
      'dev_split_mode', v_dev_split_mode,
      'dev_amount', v_dev_amount,
      'recurring_amount', v_recurring_amount,
      'frequency', v_frequency,
      'project_id', v_project_id,
      'project_name', v_project_name,
      'income_id', COALESCE(v_income_id, v_dev_income_id),
      'schedule_id', v_schedule_id,
      'client_id', v_client_id,
      'client_name', v_client_name,
      'onboarding_items', 7
    )
  );
  
  -- ============================================================
  -- 8. Audit log (safe)
  -- ============================================================
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  RETURN jsonb_build_object(
    'opportunity_id', p_opportunity_id,
    'client_id', v_client_id,
    'project_id', v_project_id,
    'income_id', COALESCE(v_income_id, v_dev_income_id),
    'dev_income_id', v_dev_income_id,
    'schedule_id', v_schedule_id,
    'payment_structure', v_payment_struct,
    'project_name', v_project_name,
    'client_name', v_client_name,
    'onboarding_items', 7,
    'status', 'success'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
