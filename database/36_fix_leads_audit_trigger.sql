-- ============================================================
-- MIGRATION 36: FIX LEADS AUDIT TRIGGER
-- ============================================================
-- The leads audit trigger (from migration 30) tries to INSERT into
-- audit_logs, which may not exist if migration 08 hasn't been run.
-- This replaces it with a safe version that silently skips if
-- audit_logs doesn't exist.
-- ============================================================

-- Option A: Simply drop the trigger so leads work without audit_logs
DROP TRIGGER IF EXISTS trigger_audit_leads ON leads;

-- Replace the function with a safe version that won't crash
CREATE OR REPLACE FUNCTION audit_leads_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if audit_logs table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO audit_logs (entity_type, entity_id, action, changes, user_id)
      VALUES ('leads', NEW.id, 'CREATE'::audit_action, to_jsonb(NEW), NEW.owner_user_id);
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO audit_logs (entity_type, entity_id, action, changes, user_id)
      VALUES ('leads', NEW.id, 'UPDATE'::audit_action, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)), NEW.owner_user_id);
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO audit_logs (entity_type, entity_id, action, changes, user_id)
      VALUES ('leads', OLD.id, 'DELETE'::audit_action, to_jsonb(OLD), OLD.owner_user_id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- If audit_logs doesn't exist or any other error, silently continue
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Re-create the trigger with the safe function
CREATE TRIGGER trigger_audit_leads
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION audit_leads_changes();

-- Also fix the convert_lead_to_opportunity function which has the same issue
CREATE OR REPLACE FUNCTION convert_lead_to_opportunity(
  p_lead_id UUID,
  p_converted_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_lead leads%ROWTYPE;
  v_opportunity_id UUID;
  v_client_id UUID;
BEGIN
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  
  IF v_lead IS NULL THEN
    RAISE EXCEPTION 'Lead not found: %', p_lead_id;
  END IF;
  
  IF v_lead.converted_to_opportunity_id IS NOT NULL THEN
    RETURN jsonb_build_object('opportunity_id', v_lead.converted_to_opportunity_id, 'already_converted', true);
  END IF;
  
  -- Find or create contact
  SELECT id INTO v_client_id
  FROM contacts
  WHERE my_company_id = v_lead.my_company_id
    AND (email = v_lead.contact_email OR company = v_lead.company_name)
  LIMIT 1;
  
  IF v_client_id IS NULL THEN
    INSERT INTO contacts (
      my_company_id, name, email, phone, company, type, status, notes
    ) VALUES (
      v_lead.my_company_id,
      COALESCE(v_lead.contact_name, v_lead.company_name),
      v_lead.contact_email,
      v_lead.contact_phone,
      v_lead.company_name,
      'lead', 'new',
      'Auto-creado desde conversión de Lead. Fuente: ' || v_lead.source::TEXT
    )
    RETURNING id INTO v_client_id;
  END IF;
  
  -- Create opportunity
  INSERT INTO opportunities (
    my_company_id, client_id, title, description,
    stage, priority, source, owner_user_id
  ) VALUES (
    v_lead.my_company_id, v_client_id,
    'Oportunidad: ' || v_lead.company_name,
    'Convertido desde Lead. ' || COALESCE('Contacto: ' || v_lead.contact_name || '. ', '') || COALESCE('Notas: ' || v_lead.notes, ''),
    'qualified', 'medium',
    v_lead.source::TEXT,
    p_converted_by
  )
  RETURNING id INTO v_opportunity_id;
  
  -- Mark lead as converted
  UPDATE leads SET
    converted_to_opportunity_id = v_opportunity_id,
    converted_at = NOW(),
    converted_by = p_converted_by
  WHERE id = p_lead_id;
  
  -- Log activity
  BEGIN
    INSERT INTO lead_activities (
      my_company_id, lead_id, activity_type, description, created_by
    ) VALUES (
      v_lead.my_company_id, p_lead_id, 'converted',
      'Lead convertido a Oportunidad ID: ' || v_opportunity_id::TEXT,
      p_converted_by
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  RETURN jsonb_build_object('opportunity_id', v_opportunity_id, 'client_id', v_client_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
