-- ============================================================
-- PHASE 1: LEADS MODULE — Outbound Prospecting Entity
-- Verlyx Hub Enterprise Architecture Redesign
-- ============================================================
-- Leads are SEPARATE from Opportunities/Deals.
-- A Lead is a business we discovered or contacted.
-- It does NOT have amount, probability, close date, or revenue.
-- ============================================================

-- 1. Lead Status Enum
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'not_contacted',
    'contacted',
    'waiting_response',
    'responded',
    'not_interested'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Lead Source Enum
DO $$ BEGIN
  CREATE TYPE lead_source AS ENUM (
    'map',
    'manual',
    'referral',
    'social',
    'website',
    'campaign',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Contact Channel Enum
DO $$ BEGIN
  CREATE TYPE contact_channel AS ENUM (
    'email',
    'whatsapp',
    'call',
    'in_person',
    'instagram',
    'linkedin',
    'facebook',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Leads Table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,

  -- Business identity
  company_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100),
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Contact person
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_position VARCHAR(100),

  -- Prospecting metadata
  source lead_source NOT NULL DEFAULT 'manual',
  source_details TEXT,                            -- e.g. campaign name, referrer
  contact_channel contact_channel,
  
  -- OSM/Map metadata (from prospecting map)
  osm_id BIGINT,                                  -- OpenStreetMap node/way ID
  osm_tags JSONB,                                 -- Raw OSM tags for reference
  website VARCHAR(500),
  
  -- Status machine
  status lead_status NOT NULL DEFAULT 'not_contacted',
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- AI-computed prospect score (0-100)
  prospect_score INTEGER DEFAULT 0 CHECK (prospect_score >= 0 AND prospect_score <= 100),
  prospect_score_breakdown JSONB,                 -- { has_website, has_phone, website_modern, business_fit }
  
  -- Activity tracking
  notes TEXT,                                     -- Rich text activity log
  last_contact_date TIMESTAMPTZ,
  next_follow_up_date DATE,
  total_contact_attempts INTEGER DEFAULT 0,
  
  -- Campaign association
  campaign_id UUID,                               -- FK added after campaigns table
  
  -- Conversion tracking
  converted_to_opportunity_id UUID,               -- Set when lead → opportunity
  converted_at TIMESTAMPTZ,
  converted_by UUID REFERENCES auth.users(id),
  
  -- Ownership
  owner_user_id UUID REFERENCES auth.users(id),
  assigned_users UUID[],
  
  -- Tags
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  
  -- Lifecycle
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_leads_my_company_id ON leads(my_company_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON leads(company_name);
CREATE INDEX IF NOT EXISTS idx_leads_osm_id ON leads(osm_id) WHERE osm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_prospect_score ON leads(prospect_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_converted ON leads(converted_to_opportunity_id) WHERE converted_to_opportunity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON leads(next_follow_up_date) WHERE next_follow_up_date IS NOT NULL AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_leads_geo ON leads(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 6. Updated_at trigger
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_leads_updated_at ON leads;
CREATE TRIGGER trigger_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- 7. Status change tracking trigger
CREATE OR REPLACE FUNCTION update_lead_status_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at = NOW();
    
    -- Auto-increment contact attempts when moving to 'contacted'
    IF NEW.status = 'contacted' THEN
      NEW.total_contact_attempts = COALESCE(OLD.total_contact_attempts, 0) + 1;
      NEW.last_contact_date = NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lead_status_changed ON leads;
CREATE TRIGGER trigger_lead_status_changed
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_status_changed();

-- 8. Audit trigger for leads
CREATE OR REPLACE FUNCTION audit_leads_changes()
RETURNS TRIGGER AS $$
BEGIN
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
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_leads ON leads;
CREATE TRIGGER trigger_audit_leads
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION audit_leads_changes();

-- 9. RLS Policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY leads_select ON leads FOR SELECT
  USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY leads_insert ON leads FOR INSERT
  WITH CHECK (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY leads_update ON leads FOR UPDATE
  USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY leads_delete ON leads FOR DELETE
  USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- 10. Lead activity log table (separate from contact_activities to keep entities clean)
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  
  activity_type VARCHAR(50) NOT NULL,             -- 'email_sent', 'whatsapp_sent', 'call_made', 'note_added', 'status_changed', 'visit'
  channel contact_channel,
  
  subject VARCHAR(255),
  description TEXT,
  outcome VARCHAR(100),                           -- 'answered', 'no_answer', 'voicemail', 'bounced', etc.
  
  -- Auto-logged metadata
  old_status lead_status,
  new_status lead_status,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_activities_select ON lead_activities FOR SELECT
  USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY lead_activities_insert ON lead_activities FOR INSERT
  WITH CHECK (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- 11. Prospecting campaigns
CREATE TABLE IF NOT EXISTS prospecting_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Target criteria
  business_types TEXT[],
  search_query TEXT,                              -- Original natural language query
  search_radius_km INTEGER DEFAULT 5,
  search_center_lat DOUBLE PRECISION,
  search_center_lng DOUBLE PRECISION,
  
  -- Template
  email_template TEXT,
  whatsapp_template TEXT,
  
  -- Stats (denormalized for performance)
  total_leads INTEGER DEFAULT 0,
  contacted_count INTEGER DEFAULT 0,
  responded_count INTEGER DEFAULT 0,
  converted_count INTEGER DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_my_company ON prospecting_campaigns(my_company_id);

ALTER TABLE prospecting_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaigns_select ON prospecting_campaigns FOR SELECT
  USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY campaigns_insert ON prospecting_campaigns FOR INSERT
  WITH CHECK (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY campaigns_update ON prospecting_campaigns FOR UPDATE
  USING (
    my_company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- Add FK from leads to campaigns
ALTER TABLE leads
  ADD CONSTRAINT fk_leads_campaign
  FOREIGN KEY (campaign_id) REFERENCES prospecting_campaigns(id)
  ON DELETE SET NULL;

-- 12. Stats function
CREATE OR REPLACE FUNCTION get_lead_pipeline_stats(p_my_company_id UUID)
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  avg_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.status::TEXT,
    COUNT(*)::BIGINT,
    ROUND(AVG(l.prospect_score)::NUMERIC, 1)
  FROM leads l
  WHERE l.my_company_id = p_my_company_id
    AND l.is_active = TRUE
  GROUP BY l.status
  ORDER BY 
    CASE l.status
      WHEN 'not_contacted' THEN 1
      WHEN 'contacted' THEN 2
      WHEN 'waiting_response' THEN 3
      WHEN 'responded' THEN 4
      WHEN 'not_interested' THEN 5
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Idempotent conversion function
CREATE OR REPLACE FUNCTION convert_lead_to_opportunity(
  p_lead_id UUID,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_lead leads%ROWTYPE;
  v_opportunity_id UUID;
  v_client_id UUID;
BEGIN
  -- Fetch lead
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  
  IF v_lead IS NULL THEN
    RAISE EXCEPTION 'Lead not found: %', p_lead_id;
  END IF;
  
  -- Idempotent: if already converted, return existing opportunity
  IF v_lead.converted_to_opportunity_id IS NOT NULL THEN
    RETURN v_lead.converted_to_opportunity_id;
  END IF;
  
  -- Validate status: must be 'responded' to convert
  IF v_lead.status != 'responded' THEN
    RAISE EXCEPTION 'Lead must be in "responded" status to convert. Current: %', v_lead.status;
  END IF;
  
  -- Find or create contact/client
  SELECT id INTO v_client_id
  FROM contacts
  WHERE my_company_id = v_lead.my_company_id
    AND (email = v_lead.contact_email OR company = v_lead.company_name)
  LIMIT 1;
  
  IF v_client_id IS NULL THEN
    INSERT INTO contacts (
      my_company_id, name, email, phone, company, 
      type, status, notes
    ) VALUES (
      v_lead.my_company_id,
      COALESCE(v_lead.contact_name, v_lead.company_name),
      v_lead.contact_email,
      v_lead.contact_phone,
      v_lead.company_name,
      'lead',
      'new',
      'Auto-created from Lead conversion. Source: ' || v_lead.source::TEXT
    )
    RETURNING id INTO v_client_id;
  END IF;
  
  -- Create opportunity (deal) in 'qualified' stage — NOT 'lead'
  INSERT INTO deals (
    my_company_id,
    client_id,
    title,
    description,
    stage,
    priority,
    source,
    source_details,
    next_action,
    next_action_date,
    owner_user_id
  ) VALUES (
    v_lead.my_company_id,
    v_client_id,
    'Oportunidad: ' || v_lead.company_name,
    'Convertido desde Lead. Empresa: ' || v_lead.company_name || 
      COALESCE('. Contacto: ' || v_lead.contact_name, '') ||
      COALESCE('. Notas: ' || v_lead.notes, ''),
    'QUALIFIED',
    'MEDIUM',
    v_lead.source::TEXT,
    v_lead.source_details,
    'Agendar primera reunión de cualificación',
    CURRENT_DATE + INTERVAL '3 days',
    p_user_id
  )
  RETURNING id INTO v_opportunity_id;
  
  -- Mark lead as converted
  UPDATE leads SET
    converted_to_opportunity_id = v_opportunity_id,
    converted_at = NOW(),
    converted_by = p_user_id
  WHERE id = p_lead_id;
  
  -- Log the conversion event
  INSERT INTO lead_activities (
    my_company_id, lead_id, activity_type, 
    description, created_by
  ) VALUES (
    v_lead.my_company_id, p_lead_id, 'converted',
    'Lead convertido a Oportunidad ID: ' || v_opportunity_id::TEXT,
    p_user_id
  );
  
  -- Audit log
  INSERT INTO audit_logs (entity_type, entity_id, action, changes, user_id)
  VALUES (
    'leads', p_lead_id, 'OTHER'::audit_action,
    jsonb_build_object(
      'event', 'lead_converted',
      'lead_id', p_lead_id,
      'opportunity_id', v_opportunity_id,
      'client_id', v_client_id
    ),
    p_user_id
  );
  
  RETURN v_opportunity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
