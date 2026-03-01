-- =====================================================
-- VERLYX HUB - MÓDULOS EMPRESARIALES (STANDALONE)
-- Cotizaciones, Time Tracking, Notificaciones, Automatizaciones
-- Versión que funciona sin dependencias de otras tablas
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
    user_id UUID NOT NULL,
    
    -- Cliente (datos inline por si no existe tabla contacts)
    contact_id UUID,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_company VARCHAR(255),
    
    -- Deal asociado (opcional)
    deal_id UUID,
    
    -- Identificación
    quote_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Estado y fechas
    status quote_status NOT NULL DEFAULT 'draft',
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    
    -- Montos
    currency VARCHAR(3) DEFAULT 'MXN',
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 16,  -- IVA México
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Términos y condiciones
    terms TEXT,
    notes TEXT,
    payment_terms VARCHAR(255),
    
    -- Seguimiento
    view_count INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items de cotización
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    
    -- Item
    sort_order INTEGER NOT NULL DEFAULT 0,
    item_type VARCHAR(20) DEFAULT 'service',  -- service, product, fee, discount
    description VARCHAR(500) NOT NULL,
    
    -- Cantidades y precios
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'unidad',  -- hora, día, unidad, mes, etc.
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 16,
    
    -- Calculados
    subtotal DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_percent/100)) STORED,
    tax_amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_percent/100) * tax_rate/100) STORED,
    total DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_percent/100) * (1 + tax_rate/100)) STORED,
    
    -- Referencia a producto del catálogo
    product_id UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para cotizaciones
CREATE INDEX IF NOT EXISTS idx_quotes_user ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_date ON quotes(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

-- =====================================================
-- 2. SISTEMA DE TIME TRACKING
-- =====================================================

-- Tabla de entradas de tiempo
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Asociaciones opcionales
    project_id UUID,
    task_id UUID,
    
    -- Tiempo
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    
    -- Descripción
    description TEXT,
    
    -- Clasificación
    is_billable BOOLEAN DEFAULT TRUE,
    hourly_rate DECIMAL(10,2),
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (
        CASE WHEN is_billable AND hourly_rate IS NOT NULL 
        THEN (duration_minutes / 60.0) * hourly_rate 
        ELSE 0 END
    ) STORED,
    
    -- Estado
    is_approved BOOLEAN DEFAULT FALSE,
    
    -- Facturación
    is_invoiced BOOLEAN DEFAULT FALSE,
    invoice_id UUID,
    
    -- Tags
    tags TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de timers activos
CREATE TABLE IF NOT EXISTS active_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Asociaciones
    project_id UUID,
    task_id UUID,
    
    -- Timer
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    description TEXT,
    is_billable BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT one_timer_per_user UNIQUE(user_id)
);

-- Índices para time tracking
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_active_timers_user ON active_timers(user_id);

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

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Contenido
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type notification_type NOT NULL DEFAULT 'info',
    
    -- Enlace a recurso
    entity_type VARCHAR(50),
    entity_id UUID,
    action_url TEXT,
    
    -- Estado
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Prioridad (0=normal, 1=alta, 2=urgente)
    priority INTEGER DEFAULT 0,
    
    -- Expiración
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Preferencias de notificación
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    
    -- Preferencias por tipo de evento
    preferences JSONB NOT NULL DEFAULT '{
        "task_assigned": {"in_app": true, "email": true},
        "task_due_soon": {"in_app": true, "email": true},
        "task_overdue": {"in_app": true, "email": true},
        "deal_won": {"in_app": true, "email": true},
        "payment_received": {"in_app": true, "email": true},
        "invoice_overdue": {"in_app": true, "email": true},
        "project_deadline": {"in_app": true, "email": true},
        "follow_up_due": {"in_app": true, "email": true},
        "quote_viewed": {"in_app": true, "email": false},
        "quote_accepted": {"in_app": true, "email": true}
    }'::jsonb,
    
    -- Horarios de no molestar
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    quiet_days INTEGER[] DEFAULT '{}',
    
    -- Email digest
    daily_digest BOOLEAN DEFAULT FALSE,
    weekly_digest BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_date ON notifications(created_at DESC);

-- =====================================================
-- 4. SISTEMA DE AUTOMATIZACIONES
-- =====================================================

-- Enum para triggers
DO $$ BEGIN
    CREATE TYPE automation_trigger AS ENUM (
        'contact_created',
        'contact_updated',
        'deal_created',
        'deal_stage_changed',
        'deal_won',
        'deal_lost',
        'project_created',
        'project_completed',
        'task_created',
        'task_completed',
        'task_overdue',
        'payment_received',
        'invoice_overdue',
        'scheduled',
        'recurring'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Enum para acciones
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
    user_id UUID NOT NULL,
    
    -- Identificación
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Trigger
    trigger_type automation_trigger NOT NULL,
    trigger_conditions JSONB DEFAULT '{}'::jsonb,
    
    -- Para triggers programados
    schedule_cron VARCHAR(100),
    schedule_timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Estadísticas
    run_count INTEGER DEFAULT 0,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pasos de automatización
CREATE TABLE IF NOT EXISTS automation_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    
    -- Orden
    step_order INTEGER NOT NULL DEFAULT 0,
    parent_step_id UUID REFERENCES automation_steps(id),
    
    -- Acción
    action_type automation_action NOT NULL,
    action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Para delays
    delay_minutes INTEGER,
    
    -- Para condiciones
    condition_field VARCHAR(100),
    condition_operator VARCHAR(20),
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
CREATE INDEX IF NOT EXISTS idx_automations_user ON automations(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_trigger ON automations(trigger_type) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_automation_steps_automation ON automation_steps(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_automation ON automation_logs(automation_id);

-- =====================================================
-- 5. CATÁLOGO DE PRODUCTOS/SERVICIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Identificación
    sku VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Tipo
    product_type VARCHAR(20) NOT NULL DEFAULT 'service',  -- service, product, subscription
    
    -- Precios
    currency VARCHAR(3) DEFAULT 'MXN',
    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    cost DECIMAL(15,2) DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'unidad',
    
    -- Impuestos
    tax_rate DECIMAL(5,2) DEFAULT 16,
    
    -- Para servicios por hora
    is_hourly BOOLEAN DEFAULT FALSE,
    
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

CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = TRUE;

-- =====================================================
-- 6. METAS Y OBJETIVOS
-- =====================================================

CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Identificación
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Tipo y métrica
    goal_type VARCHAR(50) NOT NULL,  -- revenue, deals_won, projects_completed, custom
    
    -- Target
    target_value DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) DEFAULT 0,
    
    -- Período
    period_type VARCHAR(20) NOT NULL,  -- daily, weekly, monthly, quarterly, yearly
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Estado
    status VARCHAR(20) DEFAULT 'active',  -- active, achieved, failed, cancelled
    achieved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Policies simples basadas en user_id
CREATE POLICY "quotes_user_access" ON quotes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "quote_items_access" ON quote_items FOR ALL USING (quote_id IN (SELECT id FROM quotes WHERE user_id = auth.uid()));
CREATE POLICY "time_entries_user_access" ON time_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "active_timers_user_access" ON active_timers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "notifications_user_access" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "notification_prefs_user_access" ON notification_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "automations_user_access" ON automations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "automation_steps_access" ON automation_steps FOR ALL USING (automation_id IN (SELECT id FROM automations WHERE user_id = auth.uid()));
CREATE POLICY "automation_logs_access" ON automation_logs FOR ALL USING (automation_id IN (SELECT id FROM automations WHERE user_id = auth.uid()));
CREATE POLICY "products_user_access" ON products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "goals_user_access" ON goals FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 8. FUNCIONES ÚTILES
-- =====================================================

-- Función para recalcular totales de cotización
CREATE OR REPLACE FUNCTION calculate_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL(15,2);
    v_tax DECIMAL(15,2);
    v_total DECIMAL(15,2);
    v_quote_id UUID;
BEGIN
    v_quote_id := COALESCE(NEW.quote_id, OLD.quote_id);
    
    -- Sumar items
    SELECT 
        COALESCE(SUM(subtotal), 0),
        COALESCE(SUM(tax_amount), 0),
        COALESCE(SUM(total), 0)
    INTO v_subtotal, v_tax, v_total
    FROM quote_items 
    WHERE quote_id = v_quote_id;
    
    -- Actualizar cotización
    UPDATE quotes SET
        subtotal = v_subtotal,
        tax_amount = v_tax,
        total = v_total,
        updated_at = NOW()
    WHERE id = v_quote_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar totales
DROP TRIGGER IF EXISTS update_quote_totals_trigger ON quote_items;
CREATE TRIGGER update_quote_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON quote_items
    FOR EACH ROW EXECUTE FUNCTION calculate_quote_totals();

-- Función para crear notificación
CREATE OR REPLACE FUNCTION create_notification(
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
        user_id, title, message, notification_type,
        entity_type, entity_id, action_url, priority
    ) VALUES (
        p_user_id, p_title, p_message, p_type,
        p_entity_type, p_entity_id, p_action_url, p_priority
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de timestamp
CREATE TRIGGER update_quotes_timestamp BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_time_entries_timestamp BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_automations_timestamp BEFORE UPDATE ON automations FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_products_timestamp BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_goals_timestamp BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_notification_prefs_timestamp BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Módulos Empresariales creados exitosamente';
    RAISE NOTICE '';
    RAISE NOTICE '📋 TABLAS CREADAS:';
    RAISE NOTICE '  - quotes, quote_items (Cotizaciones)';
    RAISE NOTICE '  - time_entries, active_timers (Time Tracking)';
    RAISE NOTICE '  - notifications, notification_preferences';
    RAISE NOTICE '  - automations, automation_steps, automation_logs';
    RAISE NOTICE '  - products (Catálogo)';
    RAISE NOTICE '  - goals (Metas)';
END $$;
