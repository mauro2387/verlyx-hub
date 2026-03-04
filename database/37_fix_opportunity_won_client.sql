-- ============================================================
-- MIGRATION 37: FIX execute_opportunity_won – CREATE CLIENT IF MISSING
-- ============================================================
-- Problem: If an opportunity has no client_id, the function
-- silently skips client creation. The contact never appears
-- in the Clients page after winning.
--
-- Fix: When client_id IS NULL, auto-create a contact from
-- the opportunity title and link it back.
-- ============================================================

-- Drop existing function first (return type hasn't changed, but we replace fully)
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
  v_has_incomes BOOLEAN;
  v_payment_struct TEXT;
  v_dev_amount NUMERIC;
  v_recurring_amount NUMERIC;
  v_frequency TEXT;
  v_metadata JSONB;
  v_client_name TEXT;
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
  
  -- ============================================================
  -- 1. ENSURE CLIENT EXISTS
  -- ============================================================
  IF v_client_id IS NOT NULL THEN
    -- Update existing contact → client status
    UPDATE contacts SET 
      status = 'won',
      type = 'client',
      notes = COALESCE(notes, '') || E'\n[' || NOW()::TEXT || '] Convertido a cliente desde Oportunidad: ' || v_opp.title
    WHERE id = v_client_id;
  ELSE
    -- No client linked — create one from opportunity data
    v_client_name := v_opp.title;
    -- Strip common prefixes like "Oportunidad: "
    v_client_name := regexp_replace(v_client_name, '^Oportunidad:\s*', '', 'i');
    IF v_client_name = '' OR v_client_name IS NULL THEN
      v_client_name := 'Cliente - ' || v_opp.title;
    END IF;
    
    INSERT INTO contacts (
      my_company_id, user_id, first_name, company, type, status, notes
    ) VALUES (
      v_opp.my_company_id,
      p_user_id,
      v_client_name,
      v_client_name,
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
      -- === HYBRID: Dev fee (one-time) + Recurring maintenance ===
      
      -- 3a. One-time development income
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
      
      -- 3b. Recurring schedule
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
        
        -- 3c. First recurring income
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
  
  -- ============================================================
  -- 4. Create project
  -- ============================================================
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
  
  -- ============================================================
  -- 5. Onboarding task
  -- ============================================================
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
    'onboarding_items', 7,
    'status', 'success'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
