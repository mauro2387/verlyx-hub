-- =====================================================
-- VERLYX HUB - SISTEMA DE EQUIPO/COLABORADORES
-- Socios, Empleados, Contratistas (permanentes o temporales)
-- =====================================================

-- Enum para tipo de miembro
DO $$ BEGIN
    CREATE TYPE member_type AS ENUM (
        'partner',      -- Socio
        'employee',     -- Empleado
        'contractor',   -- Contratista
        'freelancer',   -- Freelancer
        'intern'        -- Practicante
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Enum para estado del miembro
DO $$ BEGIN
    CREATE TYPE member_status AS ENUM (
        'active',       -- Activo
        'inactive',     -- Inactivo
        'pending',      -- Pendiente de inicio
        'on_leave',     -- De permiso/licencia
        'terminated'    -- Terminado
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Enum para tipo de contrato
DO $$ BEGIN
    CREATE TYPE contract_type AS ENUM (
        'permanent',    -- Permanente/Indefinido
        'temporary',    -- Temporal
        'project',      -- Por proyecto
        'hourly',       -- Por hora
        'commission'    -- Por comisión
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- TABLA PRINCIPAL: MIEMBROS DEL EQUIPO
-- =====================================================

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,  -- Dueño/Admin que los agregó
    
    -- Información básica
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    
    -- Foto y documentos
    avatar_url TEXT,
    
    -- Tipo y estado
    member_type member_type NOT NULL DEFAULT 'employee',
    status member_status NOT NULL DEFAULT 'pending',
    contract_type contract_type NOT NULL DEFAULT 'permanent',
    
    -- Puesto y departamento
    job_title VARCHAR(150),
    department VARCHAR(100),
    
    -- Fechas de contrato
    start_date DATE,
    end_date DATE,  -- NULL para permanentes
    
    -- Compensación
    currency VARCHAR(3) DEFAULT 'MXN',
    salary DECIMAL(15,2),  -- Salario mensual o anual según salary_type
    salary_type VARCHAR(20) DEFAULT 'monthly',  -- monthly, annual, hourly
    hourly_rate DECIMAL(10,2),  -- Para freelancers/contractors
    commission_percent DECIMAL(5,2),  -- Para socios o ventas
    
    -- Acceso al sistema
    has_system_access BOOLEAN DEFAULT FALSE,
    linked_user_id UUID,  -- Si tienen cuenta en el sistema
    
    -- Permisos (JSON flexible)
    permissions JSONB DEFAULT '{
        "can_view_projects": true,
        "can_edit_projects": false,
        "can_view_finances": false,
        "can_view_clients": true,
        "can_edit_clients": false,
        "can_manage_tasks": true
    }'::jsonb,
    
    -- Información adicional
    address TEXT,
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(50),
    
    -- Documentos importantes (referencias)
    documents JSONB DEFAULT '[]'::jsonb,
    
    -- Notas
    notes TEXT,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: REGISTRO DE TIEMPO TRABAJADO POR MIEMBRO
-- =====================================================

CREATE TABLE IF NOT EXISTS team_member_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Período
    work_date DATE NOT NULL,
    hours_worked DECIMAL(5,2) NOT NULL DEFAULT 0,
    
    -- Proyecto asociado (opcional)
    project_id UUID,
    project_name VARCHAR(255),
    
    -- Descripción del trabajo
    description TEXT,
    
    -- Para pago
    hourly_rate DECIMAL(10,2),
    total_amount DECIMAL(15,2) GENERATED ALWAYS AS (hours_worked * COALESCE(hourly_rate, 0)) STORED,
    
    -- Estado de pago
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: PAGOS A MIEMBROS
-- =====================================================

CREATE TABLE IF NOT EXISTS team_member_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Tipo de pago
    payment_type VARCHAR(50) NOT NULL DEFAULT 'salary',  -- salary, bonus, commission, reimbursement, advance
    
    -- Período que cubre
    period_start DATE,
    period_end DATE,
    
    -- Monto
    currency VARCHAR(3) DEFAULT 'MXN',
    gross_amount DECIMAL(15,2) NOT NULL,
    deductions DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2) GENERATED ALWAYS AS (gross_amount - deductions) STORED,
    
    -- Estado
    status VARCHAR(20) DEFAULT 'pending',  -- pending, paid, cancelled
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Referencia
    reference VARCHAR(100),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: DOCUMENTOS DE MIEMBROS
-- =====================================================

CREATE TABLE IF NOT EXISTS team_member_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Documento
    name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,  -- contract, id, tax, certificate, other
    file_url TEXT,
    
    -- Fechas
    issue_date DATE,
    expiry_date DATE,
    
    -- Estado
    is_verified BOOLEAN DEFAULT FALSE,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_members_type ON team_members(member_type);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(user_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_team_member_hours_member ON team_member_hours(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_hours_date ON team_member_hours(work_date DESC);

CREATE INDEX IF NOT EXISTS idx_team_member_payments_member ON team_member_payments(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_payments_status ON team_member_payments(status);

CREATE INDEX IF NOT EXISTS idx_team_member_documents_member ON team_member_documents(team_member_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_members_user_access" ON team_members FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "team_member_hours_user_access" ON team_member_hours FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "team_member_payments_user_access" ON team_member_payments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "team_member_documents_user_access" ON team_member_documents FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_team_members_timestamp 
    BEFORE UPDATE ON team_members 
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de resumen de equipo
CREATE OR REPLACE VIEW team_summary AS
SELECT 
    user_id,
    COUNT(*) FILTER (WHERE status = 'active') as active_count,
    COUNT(*) FILTER (WHERE member_type = 'partner') as partners_count,
    COUNT(*) FILTER (WHERE member_type = 'employee') as employees_count,
    COUNT(*) FILTER (WHERE member_type = 'contractor') as contractors_count,
    COUNT(*) FILTER (WHERE member_type = 'freelancer') as freelancers_count,
    COUNT(*) FILTER (WHERE contract_type = 'temporary' AND status = 'active') as temporary_count,
    COUNT(*) FILTER (WHERE end_date IS NOT NULL AND end_date <= CURRENT_DATE + INTERVAL '30 days' AND status = 'active') as ending_soon_count
FROM team_members
GROUP BY user_id;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de Equipo/Colaboradores creado exitosamente';
    RAISE NOTICE '';
    RAISE NOTICE '📋 TABLAS CREADAS:';
    RAISE NOTICE '  - team_members (Socios, Empleados, Contratistas)';
    RAISE NOTICE '  - team_member_hours (Horas trabajadas)';
    RAISE NOTICE '  - team_member_payments (Pagos)';
    RAISE NOTICE '  - team_member_documents (Documentos)';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 TIPOS DE MIEMBRO:';
    RAISE NOTICE '  - partner (Socio)';
    RAISE NOTICE '  - employee (Empleado)';
    RAISE NOTICE '  - contractor (Contratista)';
    RAISE NOTICE '  - freelancer (Freelancer)';
    RAISE NOTICE '  - intern (Practicante)';
    RAISE NOTICE '';
    RAISE NOTICE '📝 TIPOS DE CONTRATO:';
    RAISE NOTICE '  - permanent (Permanente)';
    RAISE NOTICE '  - temporary (Temporal)';
    RAISE NOTICE '  - project (Por proyecto)';
    RAISE NOTICE '  - hourly (Por hora)';
    RAISE NOTICE '  - commission (Por comisión)';
END $$;
