-- =====================================================
-- VERLYX HUB - SISTEMA CRM AVANZADO
-- Historial de contactos, Lead Scoring, Segmentación
-- =====================================================

-- =====================================================
-- 1. TABLA DE ACTIVIDADES DE CONTACTO
-- Registra todas las interacciones con clientes
-- =====================================================

-- Enum para tipos de actividad
DO $$ BEGIN
    CREATE TYPE contact_activity_type AS ENUM (
        'call',           -- Llamada telefónica
        'email',          -- Email enviado/recibido
        'meeting',        -- Reunión presencial o virtual
        'note',           -- Nota interna
        'whatsapp',       -- Mensaje de WhatsApp
        'task',           -- Tarea relacionada
        'deal_created',   -- Deal creado
        'deal_won',       -- Deal ganado
        'deal_lost',      -- Deal perdido
        'project_started',-- Proyecto iniciado
        'payment_received',-- Pago recibido
        'document_sent',  -- Documento enviado
        'proposal_sent',  -- Propuesta enviada
        'follow_up',      -- Seguimiento
        'other'           -- Otro
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Enum para dirección de la comunicación
DO $$ BEGIN
    CREATE TYPE communication_direction AS ENUM (
        'inbound',   -- Cliente contactó a la empresa
        'outbound',  -- Empresa contactó al cliente
        'internal'   -- Nota interna, sin comunicación directa
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Enum para sentimiento/resultado de la interacción
DO $$ BEGIN
    CREATE TYPE interaction_sentiment AS ENUM (
        'positive',
        'neutral',
        'negative'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS contact_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Usuario que registró la actividad
    created_by UUID REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id),
    
    -- Tipo y detalles de actividad
    activity_type contact_activity_type NOT NULL DEFAULT 'note',
    direction communication_direction NOT NULL DEFAULT 'outbound',
    sentiment interaction_sentiment DEFAULT 'neutral',
    
    -- Contenido
    subject VARCHAR(255),
    description TEXT,
    outcome TEXT,  -- Resultado de la actividad
    
    -- Fecha y duración
    activity_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    duration_minutes INTEGER DEFAULT 0,  -- Duración para llamadas/reuniones
    
    -- Referencias opcionales
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- Seguimiento
    follow_up_date TIMESTAMP WITH TIME ZONE,
    follow_up_notes TEXT,
    is_follow_up_done BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    attachments JSONB DEFAULT '[]'::jsonb,  -- [{name, url, type}]
    metadata JSONB DEFAULT '{}'::jsonb,     -- Datos adicionales
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para contact_activities
CREATE INDEX IF NOT EXISTS idx_contact_activities_company ON contact_activities(my_company_id);
CREATE INDEX IF NOT EXISTS idx_contact_activities_contact ON contact_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_activities_date ON contact_activities(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_contact_activities_type ON contact_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_contact_activities_follow_up ON contact_activities(follow_up_date) 
    WHERE follow_up_date IS NOT NULL AND is_follow_up_done = FALSE;
CREATE INDEX IF NOT EXISTS idx_contact_activities_deal ON contact_activities(deal_id) WHERE deal_id IS NOT NULL;

-- =====================================================
-- 2. SISTEMA DE LEAD SCORING
-- Puntuación automática de leads basada en comportamiento
-- =====================================================

-- Tabla de configuración de scoring
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
    
    -- Regla
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Condición (tipo de evento que gatilla puntos)
    trigger_type VARCHAR(50) NOT NULL,  -- 'activity', 'deal', 'engagement', 'profile'
    trigger_condition JSONB NOT NULL,   -- {"activity_type": "meeting"} o {"deal_stage": "proposal"}
    
    -- Puntos a sumar/restar
    points INTEGER NOT NULL DEFAULT 0,
    
    -- Activar/desactivar
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de scores calculados por cliente
CREATE TABLE IF NOT EXISTS contact_lead_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Score actual
    total_score INTEGER NOT NULL DEFAULT 0,
    
    -- Clasificación automática basada en score
    -- cold: 0-30, warm: 31-60, hot: 61-100, very_hot: 100+
    temperature VARCHAR(20) GENERATED ALWAYS AS (
        CASE 
            WHEN total_score <= 30 THEN 'cold'
            WHEN total_score <= 60 THEN 'warm'
            WHEN total_score <= 100 THEN 'hot'
            ELSE 'very_hot'
        END
    ) STORED,
    
    -- Desglose de puntos por categoría
    engagement_score INTEGER DEFAULT 0,      -- Interacciones
    profile_score INTEGER DEFAULT 0,         -- Completitud del perfil
    behavior_score INTEGER DEFAULT 0,        -- Comportamiento (abre emails, etc)
    financial_score INTEGER DEFAULT 0,       -- Valor de deals/pagos
    
    -- Última actualización de score
    last_activity_date TIMESTAMP WITH TIME ZONE,
    last_score_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Decaimiento: si no hay actividad, el score baja
    decay_rate DECIMAL(5,4) DEFAULT 0.0000,  -- % diario de decaimiento
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_contact_score UNIQUE(my_company_id, contact_id)
);

-- Historial de cambios de score
CREATE TABLE IF NOT EXISTS lead_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_lead_score_id UUID NOT NULL REFERENCES contact_lead_scores(id) ON DELETE CASCADE,
    
    -- Cambio
    points_change INTEGER NOT NULL,
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    
    -- Razón del cambio
    reason VARCHAR(255) NOT NULL,
    rule_id UUID REFERENCES lead_scoring_rules(id) ON DELETE SET NULL,
    activity_id UUID REFERENCES contact_activities(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_contact_lead_scores_company ON contact_lead_scores(my_company_id);
CREATE INDEX IF NOT EXISTS idx_contact_lead_scores_contact ON contact_lead_scores(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_lead_scores_temp ON contact_lead_scores(temperature);
CREATE INDEX IF NOT EXISTS idx_contact_lead_scores_score ON contact_lead_scores(total_score DESC);

-- =====================================================
-- 3. SEGMENTACIÓN DE CLIENTES
-- Tags avanzados y segmentos dinámicos
-- =====================================================

-- Tabla de segmentos
CREATE TABLE IF NOT EXISTS contact_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366F1',  -- Color hex para UI
    icon VARCHAR(50) DEFAULT 'users',
    
    -- Tipo de segmento
    segment_type VARCHAR(20) NOT NULL DEFAULT 'manual',  -- 'manual', 'dynamic', 'smart'
    
    -- Para segmentos dinámicos: condiciones
    -- Ejemplo: {"temperature": "hot", "total_revenue": {"gte": 10000}}
    conditions JSONB DEFAULT '{}'::jsonb,
    
    -- Conteo de clientes (se actualiza periódicamente para dinámicos)
    client_count INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relación contactos-segmentos (para segmentos manuales)
CREATE TABLE IF NOT EXISTS contact_segment_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_id UUID NOT NULL REFERENCES contact_segments(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT unique_segment_member UNIQUE(segment_id, contact_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_contact_segments_company ON contact_segments(my_company_id);
CREATE INDEX IF NOT EXISTS idx_contact_segment_members_segment ON contact_segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_contact_segment_members_contact ON contact_segment_members(contact_id);

-- =====================================================
-- 4. COMUNICACIONES PROGRAMADAS
-- Para campañas y seguimientos automáticos
-- =====================================================

CREATE TABLE IF NOT EXISTS scheduled_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
    
    -- Destinatario(s)
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    segment_id UUID REFERENCES contact_segments(id) ON DELETE CASCADE,
    -- Si contact_id es NULL y segment_id no, se envía a todo el segmento
    
    -- Tipo y contenido
    communication_type VARCHAR(20) NOT NULL DEFAULT 'email',  -- email, whatsapp, sms
    subject VARCHAR(255),
    content TEXT NOT NULL,
    template_id UUID,  -- Referencia a templates de email/mensajes
    
    -- Programación
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(50) DEFAULT 'America/Montevideo',
    
    -- Estado
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, sent, failed, cancelled
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_comm_company ON scheduled_communications(my_company_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_comm_pending ON scheduled_communications(scheduled_for) 
    WHERE status = 'pending';

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE contact_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_communications ENABLE ROW LEVEL SECURITY;

-- Policies para contact_activities
CREATE POLICY "Users can view contact_activities of their company"
ON contact_activities FOR SELECT
USING (
    my_company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create contact_activities for their company"
ON contact_activities FOR INSERT
WITH CHECK (
    my_company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update contact_activities of their company"
ON contact_activities FOR UPDATE
USING (
    my_company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete contact_activities of their company"
ON contact_activities FOR DELETE
USING (
    my_company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
);

-- Policies para lead_scoring_rules
CREATE POLICY "Users can view lead_scoring_rules of their company"
ON lead_scoring_rules FOR SELECT
USING (
    my_company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage lead_scoring_rules of their company"
ON lead_scoring_rules FOR ALL
USING (
    my_company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
);

-- Policies para contact_lead_scores
CREATE POLICY "Users can view contact_lead_scores of their company"
ON contact_lead_scores FOR SELECT
USING (
    my_company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage contact_lead_scores of their company"
ON contact_lead_scores FOR ALL
USING (
    my_company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
);

-- Policies para lead_score_history
CREATE POLICY "Users can view lead_score_history of their company"
ON lead_score_history FOR SELECT
USING (
    contact_lead_score_id IN (
        SELECT id FROM contact_lead_scores WHERE my_company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    )
);

-- Policies para contact_segments
CREATE POLICY "Users can view contact_segments of their company"
ON contact_segments FOR SELECT
USING (
    my_company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage contact_segments of their company"
ON contact_segments FOR ALL
USING (
    my_company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
);

-- Policies para contact_segment_members
CREATE POLICY "Users can view contact_segment_members"
ON contact_segment_members FOR SELECT
USING (
    segment_id IN (
        SELECT id FROM contact_segments WHERE my_company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can manage contact_segment_members"
ON contact_segment_members FOR ALL
USING (
    segment_id IN (
        SELECT id FROM contact_segments WHERE my_company_id IN (
            SELECT company_id FROM company_users WHERE user_id = auth.uid()
        )
    )
);

-- Policies para scheduled_communications
CREATE POLICY "Users can view scheduled_communications of their company"
ON scheduled_communications FOR SELECT
USING (
    my_company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage scheduled_communications of their company"
ON scheduled_communications FOR ALL
USING (
    my_company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
);

-- =====================================================
-- 6. FUNCIONES Y TRIGGERS
-- =====================================================

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_crm_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contact_activities_timestamp
    BEFORE UPDATE ON contact_activities
    FOR EACH ROW EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER update_lead_scoring_rules_timestamp
    BEFORE UPDATE ON lead_scoring_rules
    FOR EACH ROW EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER update_contact_lead_scores_timestamp
    BEFORE UPDATE ON contact_lead_scores
    FOR EACH ROW EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER update_contact_segments_timestamp
    BEFORE UPDATE ON contact_segments
    FOR EACH ROW EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER update_scheduled_communications_timestamp
    BEFORE UPDATE ON scheduled_communications
    FOR EACH ROW EXECUTE FUNCTION update_crm_timestamp();

-- =====================================================
-- 7. FUNCIÓN PARA CALCULAR/ACTUALIZAR LEAD SCORE
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_contact_lead_score(p_contact_id UUID, p_my_company_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_engagement_score INTEGER := 0;
    v_profile_score INTEGER := 0;
    v_financial_score INTEGER := 0;
    v_behavior_score INTEGER := 0;
    v_activities_count INTEGER;
    v_deals_value DECIMAL;
    v_contact_record RECORD;
BEGIN
    -- Obtener info del contacto
    SELECT * INTO v_contact_record FROM contacts WHERE id = p_contact_id;
    
    -- 1. Profile Score (máx 25 puntos)
    -- Email: +5, Phone: +5, Company: +5, Tags: +5, Notes: +5
    IF v_contact_record.email IS NOT NULL THEN v_profile_score := v_profile_score + 5; END IF;
    IF v_contact_record.phone IS NOT NULL THEN v_profile_score := v_profile_score + 5; END IF;
    IF v_contact_record.company IS NOT NULL THEN v_profile_score := v_profile_score + 5; END IF;
    IF v_contact_record.tags IS NOT NULL AND array_length(v_contact_record.tags, 1) > 0 THEN 
        v_profile_score := v_profile_score + 5; 
    END IF;
    IF v_contact_record.notes IS NOT NULL AND length(v_contact_record.notes) > 10 THEN 
        v_profile_score := v_profile_score + 5; 
    END IF;
    
    -- 2. Engagement Score (máx 40 puntos)
    -- Basado en actividades de los últimos 30 días
    SELECT COUNT(*) INTO v_activities_count
    FROM contact_activities
    WHERE contact_id = p_contact_id 
      AND activity_date >= NOW() - INTERVAL '30 days';
    
    v_engagement_score := LEAST(v_activities_count * 5, 40);
    
    -- 3. Financial Score (máx 35 puntos)
    -- Basado en valor de deals ganados
    SELECT COALESCE(SUM(value), 0) INTO v_deals_value
    FROM deals
    WHERE contact_id = p_contact_id AND stage IN ('won', 'CLOSED_WON');
    
    IF v_deals_value >= 50000 THEN v_financial_score := 35;
    ELSIF v_deals_value >= 20000 THEN v_financial_score := 25;
    ELSIF v_deals_value >= 5000 THEN v_financial_score := 15;
    ELSIF v_deals_value > 0 THEN v_financial_score := 10;
    END IF;
    
    -- Score total
    v_score := v_profile_score + v_engagement_score + v_financial_score + v_behavior_score;
    
    -- Insertar o actualizar score
    INSERT INTO contact_lead_scores (
        my_company_id, contact_id, total_score,
        engagement_score, profile_score, behavior_score, financial_score,
        last_activity_date, last_score_update
    ) VALUES (
        p_my_company_id, p_contact_id, v_score,
        v_engagement_score, v_profile_score, v_behavior_score, v_financial_score,
        NOW(), NOW()
    )
    ON CONFLICT (my_company_id, contact_id) 
    DO UPDATE SET
        total_score = v_score,
        engagement_score = v_engagement_score,
        profile_score = v_profile_score,
        behavior_score = v_behavior_score,
        financial_score = v_financial_score,
        last_score_update = NOW(),
        updated_at = NOW();
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. TRIGGER PARA ACTUALIZAR SCORE AL REGISTRAR ACTIVIDAD
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_update_lead_score_on_activity()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_contact_lead_score(NEW.contact_id, NEW.my_company_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_lead_score_on_activity
    AFTER INSERT ON contact_activities
    FOR EACH ROW EXECUTE FUNCTION trigger_update_lead_score_on_activity();

-- =====================================================
-- 9. REGLAS DE SCORING POR DEFECTO
-- =====================================================

-- Insertar reglas por defecto (se ejecutará una sola vez al crear la tabla)
-- Estas se crearán por empresa cuando se necesiten

-- =====================================================
-- 10. VISTAS ÚTILES
-- =====================================================

-- Vista de contactos con su score y últimas actividades
CREATE OR REPLACE VIEW contact_crm_summary AS
SELECT 
    c.id,
    CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) as name,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.company,
    c.type,
    c.status,
    c.user_id,
    COALESCE(cls.total_score, 0) as lead_score,
    COALESCE(cls.temperature, 'cold') as temperature,
    cls.engagement_score,
    cls.profile_score,
    cls.financial_score,
    (
        SELECT COUNT(*) 
        FROM contact_activities ca 
        WHERE ca.contact_id = c.id
    ) as total_activities,
    (
        SELECT activity_date 
        FROM contact_activities ca 
        WHERE ca.contact_id = c.id 
        ORDER BY activity_date DESC 
        LIMIT 1
    ) as last_activity_date,
    (
        SELECT activity_type 
        FROM contact_activities ca 
        WHERE ca.contact_id = c.id 
        ORDER BY activity_date DESC 
        LIMIT 1
    ) as last_activity_type,
    (
        SELECT COUNT(*) 
        FROM deals d 
        WHERE d.contact_id = c.id
    ) as deals_count,
    (
        SELECT COALESCE(SUM(value), 0) 
        FROM deals d 
        WHERE d.contact_id = c.id AND d.stage IN ('won', 'CLOSED_WON')
    ) as total_revenue,
    c.created_at,
    c.updated_at
FROM contacts c
LEFT JOIN contact_lead_scores cls ON cls.contact_id = c.id;

-- Vista de actividades pendientes de seguimiento
CREATE OR REPLACE VIEW pending_follow_ups AS
SELECT 
    ca.id,
    ca.my_company_id,
    ca.contact_id,
    CONCAT(c.first_name, ' ', COALESCE(c.last_name, '')) as contact_name,
    c.email as contact_email,
    ca.subject,
    ca.activity_type,
    ca.activity_date,
    ca.follow_up_date,
    ca.follow_up_notes,
    ca.assigned_to,
    CASE 
        WHEN ca.follow_up_date < NOW() THEN 'overdue'
        WHEN ca.follow_up_date < NOW() + INTERVAL '1 day' THEN 'today'
        WHEN ca.follow_up_date < NOW() + INTERVAL '7 days' THEN 'this_week'
        ELSE 'later'
    END as urgency
FROM contact_activities ca
JOIN contacts c ON c.id = ca.contact_id
WHERE ca.follow_up_date IS NOT NULL 
  AND ca.is_follow_up_done = FALSE
ORDER BY ca.follow_up_date ASC;

-- =====================================================
-- FIN DEL SCRIPT CRM AVANZADO
-- =====================================================

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema CRM Avanzado creado exitosamente';
    RAISE NOTICE '  - contact_activities: Historial de interacciones';
    RAISE NOTICE '  - lead_scoring_rules: Reglas de puntuación';
    RAISE NOTICE '  - contact_lead_scores: Scores por contacto';
    RAISE NOTICE '  - contact_segments: Segmentación de contactos';
    RAISE NOTICE '  - scheduled_communications: Comunicaciones programadas';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Vistas creadas:';
    RAISE NOTICE '  - contact_crm_summary: Resumen CRM por contacto';
    RAISE NOTICE '  - pending_follow_ups: Seguimientos pendientes';
END $$;
