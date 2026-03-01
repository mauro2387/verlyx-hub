-- =====================================================
-- VERLYX HUB - MÓDULOS EMPRESARIALES
-- Cotizaciones, Time Tracking, Notificaciones, Automatizaciones
-- =====================================================

-- =====================================================
-- 1. SISTEMA DE COTIZACIONES/PRESUPUESTOS
-- =====================================================

-- Enum para estados de cotización
DO $$ BEGIN
    CREATE TYPE quote_status AS ENUM (
        'draft',        -- Borrador
        'sent',         -- Enviada al cliente
        'viewed',       -- Vista por el cliente
        'accepted',     -- Aceptada
        'rejected',     -- Rechazada
        'expired',      -- Expirada
        'converted'     -- Convertida a proyecto/factura
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Tabla de cotizaciones
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    
    -- Identificación
    quote_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Estado y fechas
    status quote_status NOT NULL DEFAULT 'draft',
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    
    -- Montos
    currency VARCHAR(3) DEFAULT 'UYU',
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 22,  -- IVA Uruguay
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Términos y condiciones
    terms TEXT,
    notes TEXT,
    payment_terms VARCHAR(255),
    
    -- Template y personalización
    template_id UUID,
    custom_css TEXT,
    header_image_url TEXT,
    
    -- Seguimiento
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Conversión
    converted_to_invoice_id UUID,
    converted_to_project_id UUID REFERENCES projects(id),
    converted_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items de cotización
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    
    -- Item
    item_order INTEGER NOT NULL DEFAULT 0,
    item_type VARCHAR(20) DEFAULT 'service',  -- service, product, fee, discount
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Cantidades y precios
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'unidad',  -- hora, día, unidad, mes, etc.
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 22,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Referencia a producto/servicio del catálogo
    product_id UUID,
    
    -- Opcional: detalle de horas estimadas
    estimated_hours DECIMAL(10,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para cotizaciones
CREATE INDEX IF NOT EXISTS idx_quotes_company ON quotes(my_company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_contact ON quotes(contact_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_date ON quotes(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

-- =====================================================
-- 2. SISTEMA DE TIME TRACKING
-- =====================================================

-- Tabla de entradas de tiempo
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Asociaciones (al menos una requerida)
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    
    -- Tiempo
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    
    -- Descripción
    description TEXT,
    
    -- Clasificación
    is_billable BOOLEAN DEFAULT TRUE,
    hourly_rate DECIMAL(10,2),  -- Si es facturable
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (
        CASE WHEN is_billable AND hourly_rate IS NOT NULL 
        THEN (duration_minutes / 60.0) * hourly_rate 
        ELSE 0 END
    ) STORED,
    
    -- Estado
    is_running BOOLEAN DEFAULT FALSE,  -- Timer activo
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Facturación
    is_invoiced BOOLEAN DEFAULT FALSE,
    invoice_id UUID,
    
    -- Tags para categorización
    tags TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de timers activos (para tracking en tiempo real)
CREATE TABLE IF NOT EXISTS active_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Asociaciones
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- Timer
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    description TEXT,
    is_billable BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT one_timer_per_user UNIQUE(user_id)
);

-- Índices para time tracking
CREATE INDEX IF NOT EXISTS idx_time_entries_company ON time_entries(my_company_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_billable ON time_entries(is_billable) WHERE is_billable = TRUE;

-- =====================================================
-- 3. SISTEMA DE NOTIFICACIONES
-- =====================================================

-- Enum para tipos de notificación
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'info',
        'success',
        'warning',
        'error',
        'reminder',
        'mention',
        'assignment',
        'deadline',
        'payment',
        'system'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Enum para canales de notificación
DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM (
        'in_app',
        'email',
        'push',
        'sms',
        'whatsapp'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Contenido
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type notification_type NOT NULL DEFAULT 'info',
    
    -- Enlace a recurso relacionado
    entity_type VARCHAR(50),  -- project, task, deal, contact, invoice, etc.
    entity_id UUID,
    action_url TEXT,
    
    -- Estado
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Canales enviados
    channels notification_channel[] DEFAULT '{in_app}',
    sent_via_email BOOLEAN DEFAULT FALSE,
    sent_via_push BOOLEAN DEFAULT FALSE,
    
    -- Prioridad
    priority INTEGER DEFAULT 0,  -- 0=normal, 1=alta, 2=urgente
    
    -- Expiración
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Preferencias de notificación por usuario
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
    
    -- Preferencias por tipo de evento
    preferences JSONB NOT NULL DEFAULT '{
        "task_assigned": {"in_app": true, "email": true},
        "task_due_soon": {"in_app": true, "email": true},
        "task_overdue": {"in_app": true, "email": true},
        "deal_won": {"in_app": true, "email": true},
        "deal_lost": {"in_app": true, "email": false},
        "payment_received": {"in_app": true, "email": true},
        "invoice_overdue": {"in_app": true, "email": true},
        "project_deadline": {"in_app": true, "email": true},
        "mention": {"in_app": true, "email": true},
        "follow_up_due": {"in_app": true, "email": true},
        "quote_viewed": {"in_app": true, "email": false},
        "quote_accepted": {"in_app": true, "email": true}
    }'::jsonb,
    
    -- Horarios de no molestar
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    quiet_days INTEGER[] DEFAULT '{}',  -- 0=domingo, 6=sábado
    
    -- Email digest
    daily_digest BOOLEAN DEFAULT FALSE,
    weekly_digest BOOLEAN DEFAULT TRUE,
    digest_time TIME DEFAULT '09:00',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_company_prefs UNIQUE(user_id, my_company_id)
);

-- Índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_date ON notifications(created_at DESC);

-- =====================================================
-- 4. SISTEMA DE AUTOMATIZACIONES/WORKFLOWS
-- =====================================================

-- Enum para triggers de automatización
DO $$ BEGIN
    CREATE TYPE automation_trigger AS ENUM (
        -- Contactos
        'contact_created',
        'contact_updated',
        'contact_tag_added',
        
        -- Deals
        'deal_created',
        'deal_stage_changed',
        'deal_won',
        'deal_lost',
        
        -- Proyectos
        'project_created',
        'project_status_changed',
        'project_completed',
        
        -- Tareas
        'task_created',
        'task_completed',
        'task_overdue',
        
        -- Pagos
        'payment_received',
        'invoice_overdue',
        
        -- Tiempo
        'scheduled',  -- Ejecutar en horario específico
        'recurring'   -- Ejecutar periódicamente
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Enum para acciones de automatización
DO $$ BEGIN
    CREATE TYPE automation_action AS ENUM (
        'send_email',
        'send_notification',
        'create_task',
        'update_field',
        'add_tag',
        'remove_tag',
        'assign_user',
        'create_activity',
        'move_deal_stage',
        'create_project',
        'webhook',
        'delay',
        'condition'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Tabla de automatizaciones
CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
    
    -- Identificación
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Trigger
    trigger_type automation_trigger NOT NULL,
    trigger_conditions JSONB DEFAULT '{}'::jsonb,  -- Condiciones adicionales
    
    -- Para triggers programados
    schedule_cron VARCHAR(100),  -- Expresión cron para 'scheduled'
    schedule_timezone VARCHAR(50) DEFAULT 'America/Montevideo',
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Estadísticas
    run_count INTEGER DEFAULT 0,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pasos/acciones de la automatización
CREATE TABLE IF NOT EXISTS automation_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    
    -- Orden y estructura
    step_order INTEGER NOT NULL DEFAULT 0,
    parent_step_id UUID REFERENCES automation_steps(id),  -- Para condiciones/branches
    
    -- Acción
    action_type automation_action NOT NULL,
    action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Para delays
    delay_minutes INTEGER,
    
    -- Para condiciones
    condition_field VARCHAR(100),
    condition_operator VARCHAR(20),  -- equals, not_equals, contains, gt, lt, etc.
    condition_value TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Historial de ejecuciones
CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    
    -- Contexto
    trigger_entity_type VARCHAR(50),
    trigger_entity_id UUID,
    
    -- Resultado
    status VARCHAR(20) NOT NULL,  -- success, failed, skipped
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Detalles
    steps_completed INTEGER DEFAULT 0,
    error_message TEXT,
    execution_data JSONB DEFAULT '{}'::jsonb
);

-- Índices para automatizaciones
CREATE INDEX IF NOT EXISTS idx_automations_company ON automations(my_company_id);
CREATE INDEX IF NOT EXISTS idx_automations_trigger ON automations(trigger_type) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_automation_steps_automation ON automation_steps(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_automation ON automation_logs(automation_id);

-- =====================================================
-- 5. CATÁLOGO DE PRODUCTOS/SERVICIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
    
    -- Identificación
    sku VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Tipo
    product_type VARCHAR(20) NOT NULL DEFAULT 'service',  -- service, product, subscription
    
    -- Precios
    currency VARCHAR(3) DEFAULT 'UYU',
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(15,2) DEFAULT 0,  -- Costo interno
    unit VARCHAR(50) DEFAULT 'unidad',
    
    -- Impuestos
    tax_percent DECIMAL(5,2) DEFAULT 22,
    tax_included BOOLEAN DEFAULT FALSE,
    
    -- Para servicios por hora
    is_hourly BOOLEAN DEFAULT FALSE,
    default_hours DECIMAL(10,2),
    
    -- Categorización
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Imagen
    image_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_company ON products(my_company_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = TRUE;

-- =====================================================
-- 6. METAS Y OBJETIVOS
-- =====================================================

-- Tabla de metas
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),  -- NULL = meta de empresa
    
    -- Identificación
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Tipo y métrica
    goal_type VARCHAR(50) NOT NULL,  -- revenue, deals_won, deals_count, projects_completed, etc.
    metric_field VARCHAR(100),
    
    -- Target
    target_value DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) DEFAULT 0,
    
    -- Período
    period_type VARCHAR(20) NOT NULL,  -- daily, weekly, monthly, quarterly, yearly, custom
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Estado
    status VARCHAR(20) DEFAULT 'active',  -- active, achieved, failed, cancelled
    achieved_at TIMESTAMP WITH TIME ZONE,
    
    -- Notificaciones
    notify_at_percent INTEGER[] DEFAULT '{50, 75, 90, 100}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_company ON goals(my_company_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_active ON goals(status) WHERE status = 'active';

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Policies para quotes
CREATE POLICY "quotes_company_access" ON quotes FOR ALL
USING (my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

CREATE POLICY "quote_items_access" ON quote_items FOR ALL
USING (quote_id IN (SELECT id FROM quotes WHERE my_company_id IN 
    (SELECT company_id FROM company_users WHERE user_id = auth.uid())));

-- Policies para time_entries
CREATE POLICY "time_entries_company_access" ON time_entries FOR ALL
USING (my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

CREATE POLICY "active_timers_user_access" ON active_timers FOR ALL
USING (user_id = auth.uid());

-- Policies para notifications
CREATE POLICY "notifications_user_access" ON notifications FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "notification_prefs_user_access" ON notification_preferences FOR ALL
USING (user_id = auth.uid());

-- Policies para automations
CREATE POLICY "automations_company_access" ON automations FOR ALL
USING (my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

CREATE POLICY "automation_steps_access" ON automation_steps FOR ALL
USING (automation_id IN (SELECT id FROM automations WHERE my_company_id IN 
    (SELECT company_id FROM company_users WHERE user_id = auth.uid())));

CREATE POLICY "automation_logs_access" ON automation_logs FOR ALL
USING (automation_id IN (SELECT id FROM automations WHERE my_company_id IN 
    (SELECT company_id FROM company_users WHERE user_id = auth.uid())));

-- Policies para products
CREATE POLICY "products_company_access" ON products FOR ALL
USING (my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

-- Policies para goals
CREATE POLICY "goals_company_access" ON goals FOR ALL
USING (my_company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

-- =====================================================
-- 8. FUNCIONES ÚTILES
-- =====================================================

-- Función para calcular totales de cotización
CREATE OR REPLACE FUNCTION calculate_quote_totals(p_quote_id UUID)
RETURNS void AS $$
DECLARE
    v_subtotal DECIMAL(15,2);
    v_discount DECIMAL(15,2);
    v_tax DECIMAL(15,2);
    v_total DECIMAL(15,2);
    v_quote RECORD;
BEGIN
    SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;
    
    -- Calcular subtotal de items
    SELECT COALESCE(SUM(total), 0) INTO v_subtotal
    FROM quote_items WHERE quote_id = p_quote_id;
    
    -- Aplicar descuento
    v_discount := CASE 
        WHEN v_quote.discount_percent > 0 THEN v_subtotal * (v_quote.discount_percent / 100)
        ELSE COALESCE(v_quote.discount_amount, 0)
    END;
    
    -- Calcular impuesto
    v_tax := (v_subtotal - v_discount) * (COALESCE(v_quote.tax_percent, 0) / 100);
    
    -- Total final
    v_total := v_subtotal - v_discount + v_tax;
    
    -- Actualizar cotización
    UPDATE quotes SET
        subtotal = v_subtotal,
        discount_amount = v_discount,
        tax_amount = v_tax,
        total = v_total,
        updated_at = NOW()
    WHERE id = p_quote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para detener timer y crear time entry
CREATE OR REPLACE FUNCTION stop_timer(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_timer RECORD;
    v_duration INTEGER;
    v_entry_id UUID;
BEGIN
    -- Obtener timer activo
    SELECT * INTO v_timer FROM active_timers WHERE user_id = p_user_id;
    
    IF v_timer IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Calcular duración
    v_duration := EXTRACT(EPOCH FROM (NOW() - v_timer.started_at)) / 60;
    
    -- Crear time entry
    INSERT INTO time_entries (
        my_company_id, user_id, project_id, task_id,
        date, start_time, end_time, duration_minutes,
        description, is_billable
    ) VALUES (
        v_timer.my_company_id, v_timer.user_id, v_timer.project_id, v_timer.task_id,
        CURRENT_DATE, v_timer.started_at, NOW(), v_duration,
        v_timer.description, v_timer.is_billable
    ) RETURNING id INTO v_entry_id;
    
    -- Eliminar timer
    DELETE FROM active_timers WHERE user_id = p_user_id;
    
    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear notificación
CREATE OR REPLACE FUNCTION create_notification(
    p_company_id UUID,
    p_user_id UUID,
    p_title VARCHAR(255),
    p_message TEXT,
    p_type notification_type DEFAULT 'info',
    p_entity_type VARCHAR(50) DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL,
    p_priority INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        my_company_id, user_id, title, message, notification_type,
        entity_type, entity_id, action_url, priority
    ) VALUES (
        p_company_id, p_user_id, p_title, p_message, p_type,
        p_entity_type, p_entity_id, p_action_url, p_priority
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar progreso de metas
CREATE OR REPLACE FUNCTION update_goal_progress(p_goal_id UUID)
RETURNS void AS $$
DECLARE
    v_goal RECORD;
    v_current DECIMAL(15,2);
BEGIN
    SELECT * INTO v_goal FROM goals WHERE id = p_goal_id;
    
    -- Calcular valor actual según tipo de meta
    CASE v_goal.goal_type
        WHEN 'revenue' THEN
            SELECT COALESCE(SUM(value), 0) INTO v_current
            FROM deals 
            WHERE my_company_id = v_goal.my_company_id 
              AND stage IN ('won', 'CLOSED_WON')
              AND closed_at BETWEEN v_goal.start_date AND v_goal.end_date;
              
        WHEN 'deals_won' THEN
            SELECT COUNT(*) INTO v_current
            FROM deals 
            WHERE my_company_id = v_goal.my_company_id 
              AND stage IN ('won', 'CLOSED_WON')
              AND closed_at BETWEEN v_goal.start_date AND v_goal.end_date;
              
        WHEN 'deals_count' THEN
            SELECT COUNT(*) INTO v_current
            FROM deals 
            WHERE my_company_id = v_goal.my_company_id 
              AND created_at BETWEEN v_goal.start_date AND v_goal.end_date;
              
        WHEN 'projects_completed' THEN
            SELECT COUNT(*) INTO v_current
            FROM projects 
            WHERE my_company_id = v_goal.my_company_id 
              AND status = 'completed'
              AND updated_at BETWEEN v_goal.start_date AND v_goal.end_date;
              
        ELSE
            v_current := v_goal.current_value;
    END CASE;
    
    -- Actualizar meta
    UPDATE goals SET
        current_value = v_current,
        status = CASE 
            WHEN v_current >= v_goal.target_value THEN 'achieved'
            WHEN v_goal.end_date < CURRENT_DATE AND v_current < v_goal.target_value THEN 'failed'
            ELSE 'active'
        END,
        achieved_at = CASE 
            WHEN v_current >= v_goal.target_value AND achieved_at IS NULL THEN NOW()
            ELSE achieved_at
        END,
        updated_at = NOW()
    WHERE id = p_goal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. TRIGGERS
-- =====================================================

-- Trigger para actualizar totales de cotización
CREATE OR REPLACE FUNCTION trigger_update_quote_totals()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM calculate_quote_totals(COALESCE(NEW.quote_id, OLD.quote_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quote_totals_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON quote_items
    FOR EACH ROW EXECUTE FUNCTION trigger_update_quote_totals();

-- Trigger para timestamps
CREATE TRIGGER update_quotes_timestamp
    BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER update_time_entries_timestamp
    BEFORE UPDATE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER update_automations_timestamp
    BEFORE UPDATE ON automations
    FOR EACH ROW EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER update_products_timestamp
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_crm_timestamp();

CREATE TRIGGER update_goals_timestamp
    BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_crm_timestamp();

-- =====================================================
-- 10. VISTAS PARA DASHBOARD
-- =====================================================

-- Vista de resumen de ventas
CREATE OR REPLACE VIEW sales_dashboard AS
SELECT 
    my_company_id,
    -- Este mes
    COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as deals_this_month,
    COALESCE(SUM(value) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0) as pipeline_this_month,
    COUNT(*) FILTER (WHERE stage IN ('won', 'CLOSED_WON') AND closed_at >= date_trunc('month', CURRENT_DATE)) as won_this_month,
    COALESCE(SUM(value) FILTER (WHERE stage IN ('won', 'CLOSED_WON') AND closed_at >= date_trunc('month', CURRENT_DATE)), 0) as revenue_this_month,
    -- Mes anterior
    COUNT(*) FILTER (WHERE stage IN ('won', 'CLOSED_WON') AND closed_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND closed_at < date_trunc('month', CURRENT_DATE)) as won_last_month,
    COALESCE(SUM(value) FILTER (WHERE stage IN ('won', 'CLOSED_WON') AND closed_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND closed_at < date_trunc('month', CURRENT_DATE)), 0) as revenue_last_month,
    -- Este año
    COUNT(*) FILTER (WHERE stage IN ('won', 'CLOSED_WON') AND closed_at >= date_trunc('year', CURRENT_DATE)) as won_this_year,
    COALESCE(SUM(value) FILTER (WHERE stage IN ('won', 'CLOSED_WON') AND closed_at >= date_trunc('year', CURRENT_DATE)), 0) as revenue_this_year,
    -- Pipeline activo
    COUNT(*) FILTER (WHERE stage NOT IN ('won', 'CLOSED_WON', 'lost', 'CLOSED_LOST')) as active_deals,
    COALESCE(SUM(value) FILTER (WHERE stage NOT IN ('won', 'CLOSED_WON', 'lost', 'CLOSED_LOST')), 0) as active_pipeline
FROM deals
GROUP BY my_company_id;

-- Vista de productividad
CREATE OR REPLACE VIEW productivity_dashboard AS
SELECT 
    my_company_id,
    user_id,
    -- Horas esta semana
    COALESCE(SUM(duration_minutes) FILTER (WHERE date >= date_trunc('week', CURRENT_DATE)), 0) / 60.0 as hours_this_week,
    -- Horas este mes
    COALESCE(SUM(duration_minutes) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE)), 0) / 60.0 as hours_this_month,
    -- Horas facturables
    COALESCE(SUM(duration_minutes) FILTER (WHERE is_billable = TRUE AND date >= date_trunc('month', CURRENT_DATE)), 0) / 60.0 as billable_hours_this_month,
    -- Monto facturable
    COALESCE(SUM(total_amount) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE)), 0) as billable_amount_this_month,
    -- Por proyecto
    COUNT(DISTINCT project_id) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE)) as projects_worked_this_month
FROM time_entries
GROUP BY my_company_id, user_id;

-- Vista de actividad reciente
CREATE OR REPLACE VIEW recent_activity AS
SELECT * FROM (
    SELECT 
        my_company_id,
        'deal' as entity_type,
        id as entity_id,
        title as entity_name,
        stage as status,
        created_at,
        'Deal creado' as action
    FROM deals WHERE created_at >= NOW() - INTERVAL '7 days'
    
    UNION ALL
    
    SELECT 
        my_company_id,
        'project' as entity_type,
        id as entity_id,
        name as entity_name,
        status,
        created_at,
        'Proyecto creado' as action
    FROM projects WHERE created_at >= NOW() - INTERVAL '7 days'
    
    UNION ALL
    
    SELECT 
        my_company_id,
        'task' as entity_type,
        id as entity_id,
        title as entity_name,
        status,
        created_at,
        'Tarea creada' as action
    FROM tasks WHERE created_at >= NOW() - INTERVAL '7 days'
) activity
ORDER BY created_at DESC
LIMIT 50;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Módulos Empresariales creados exitosamente';
    RAISE NOTICE '';
    RAISE NOTICE '📋 COTIZACIONES:';
    RAISE NOTICE '  - quotes: Cotizaciones/presupuestos';
    RAISE NOTICE '  - quote_items: Items de cotización';
    RAISE NOTICE '';
    RAISE NOTICE '⏱️ TIME TRACKING:';
    RAISE NOTICE '  - time_entries: Entradas de tiempo';
    RAISE NOTICE '  - active_timers: Timers activos';
    RAISE NOTICE '';
    RAISE NOTICE '🔔 NOTIFICACIONES:';
    RAISE NOTICE '  - notifications: Notificaciones';
    RAISE NOTICE '  - notification_preferences: Preferencias';
    RAISE NOTICE '';
    RAISE NOTICE '⚡ AUTOMATIZACIONES:';
    RAISE NOTICE '  - automations: Reglas de automatización';
    RAISE NOTICE '  - automation_steps: Pasos de workflow';
    RAISE NOTICE '  - automation_logs: Historial de ejecuciones';
    RAISE NOTICE '';
    RAISE NOTICE '📦 PRODUCTOS:';
    RAISE NOTICE '  - products: Catálogo de productos/servicios';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 METAS:';
    RAISE NOTICE '  - goals: Objetivos y metas';
    RAISE NOTICE '';
    RAISE NOTICE '📊 VISTAS DASHBOARD:';
    RAISE NOTICE '  - sales_dashboard';
    RAISE NOTICE '  - productivity_dashboard';
    RAISE NOTICE '  - recent_activity';
END $$;
