-- =====================================================
-- VERLYX PAYMENTS - Sistema de Pagos Interno P2P
-- Transferencias entre usuarios Verlyx SIN comisiones
-- =====================================================

-- 1. WALLET VIRTUAL (Billetera por Usuario)
-- =====================================================
CREATE TABLE IF NOT EXISTS verlyx_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES my_companies(id) ON DELETE CASCADE,
    
    -- Balance
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'UYU',
    
    -- Estado
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    
    -- Límites (para seguridad)
    daily_send_limit DECIMAL(15, 2) DEFAULT 100000.00,
    daily_receive_limit DECIMAL(15, 2) DEFAULT 500000.00,
    
    -- Auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, company_id)
);

-- 2. TRANSFERENCIAS VERLYX (P2P Sin Comisiones)
-- =====================================================
CREATE TABLE IF NOT EXISTS verlyx_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Origen
    sender_wallet_id UUID NOT NULL REFERENCES verlyx_wallets(id) ON DELETE RESTRICT,
    sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    sender_company_id UUID REFERENCES my_companies(id) ON DELETE RESTRICT,
    
    -- Destino
    receiver_wallet_id UUID NOT NULL REFERENCES verlyx_wallets(id) ON DELETE RESTRICT,
    receiver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    receiver_company_id UUID REFERENCES my_companies(id) ON DELETE RESTRICT,
    
    -- Monto
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'UYU',
    
    -- Concepto
    concept TEXT,
    reference_type VARCHAR(50), -- 'deal', 'invoice', 'project', 'service', 'payment_request'
    reference_id UUID,
    
    -- Estado
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, completed, failed, cancelled
    
    -- Verificación
    verification_code VARCHAR(6), -- Código de 6 dígitos para confirmar
    expires_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    
    -- Auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Índices
    CONSTRAINT sender_not_receiver CHECK (sender_wallet_id != receiver_wallet_id)
);

-- 3. SOLICITUDES DE PAGO (Payment Requests)
-- =====================================================
CREATE TABLE IF NOT EXISTS verlyx_payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Solicitante (quien pide el dinero)
    requester_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_company_id UUID REFERENCES my_companies(id) ON DELETE CASCADE,
    requester_wallet_id UUID NOT NULL REFERENCES verlyx_wallets(id) ON DELETE CASCADE,
    
    -- Pagador (quien debe pagar)
    payer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    payer_company_id UUID REFERENCES my_companies(id) ON DELETE CASCADE,
    payer_email VARCHAR(255), -- Si no está en Verlyx aún
    
    -- Monto
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'UYU',
    
    -- Detalles
    concept TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    
    -- Referencias
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50),
    
    -- Estado
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, paid, expired, cancelled
    
    -- Link de pago único
    payment_link_code VARCHAR(20) UNIQUE NOT NULL,
    payment_link_expires_at TIMESTAMPTZ,
    
    -- Notificación
    notification_sent_at TIMESTAMPTZ,
    reminder_count INTEGER DEFAULT 0,
    
    -- Pago asociado
    transfer_id UUID REFERENCES verlyx_transfers(id) ON DELETE SET NULL,
    paid_at TIMESTAMPTZ,
    
    -- Auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. QR CODES para Pagos Rápidos
-- =====================================================
CREATE TABLE IF NOT EXISTS verlyx_payment_qr (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES verlyx_wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES my_companies(id) ON DELETE CASCADE,
    
    -- Configuración del QR
    qr_code TEXT NOT NULL UNIQUE, -- Código único para escanear
    qr_type VARCHAR(20) NOT NULL DEFAULT 'receive', -- receive, fixed_amount
    
    -- Si es monto fijo
    fixed_amount DECIMAL(15, 2),
    fixed_concept TEXT,
    
    -- Estado
    is_active BOOLEAN NOT NULL DEFAULT true,
    uses_count INTEGER NOT NULL DEFAULT 0,
    max_uses INTEGER, -- NULL = ilimitado
    
    expires_at TIMESTAMPTZ,
    
    -- Auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- =====================================================
-- ÍNDICES para Performance
-- =====================================================

CREATE INDEX idx_verlyx_wallets_user_id ON verlyx_wallets(user_id);
CREATE INDEX idx_verlyx_wallets_company_id ON verlyx_wallets(company_id);
CREATE INDEX idx_verlyx_wallets_balance ON verlyx_wallets(balance) WHERE is_active = true;

CREATE INDEX idx_verlyx_transfers_sender ON verlyx_transfers(sender_wallet_id, created_at DESC);
CREATE INDEX idx_verlyx_transfers_receiver ON verlyx_transfers(receiver_wallet_id, created_at DESC);
CREATE INDEX idx_verlyx_transfers_status ON verlyx_transfers(status, created_at DESC);
CREATE INDEX idx_verlyx_transfers_reference ON verlyx_transfers(reference_type, reference_id);

CREATE INDEX idx_payment_requests_requester ON verlyx_payment_requests(requester_user_id, created_at DESC);
CREATE INDEX idx_payment_requests_payer ON verlyx_payment_requests(payer_user_id, status);
CREATE INDEX idx_payment_requests_link ON verlyx_payment_requests(payment_link_code) WHERE status = 'pending';
CREATE INDEX idx_payment_requests_status ON verlyx_payment_requests(status, due_date);

CREATE INDEX idx_payment_qr_wallet ON verlyx_payment_qr(wallet_id) WHERE is_active = true;
CREATE INDEX idx_payment_qr_code ON verlyx_payment_qr(qr_code) WHERE is_active = true;

-- =====================================================
-- TRIGGERS para Actualizar Balances Automáticamente
-- =====================================================

-- Trigger para actualizar balance al completar transferencia
CREATE OR REPLACE FUNCTION update_wallet_balance_on_transfer()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Restar del wallet emisor
        UPDATE verlyx_wallets
        SET balance = balance - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.sender_wallet_id;
        
        -- Sumar al wallet receptor
        UPDATE verlyx_wallets
        SET balance = balance + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.receiver_wallet_id;
        
        -- Actualizar timestamp de completado
        NEW.completed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wallet_balance
BEFORE UPDATE ON verlyx_transfers
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION update_wallet_balance_on_transfer();

-- Trigger para crear income automático al recibir pago
CREATE OR REPLACE FUNCTION create_income_from_verlyx_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.receiver_company_id IS NOT NULL THEN
        INSERT INTO incomes (
            company_id,
            amount,
            concept,
            income_date,
            payment_method,
            status,
            notes,
            created_by
        ) VALUES (
            NEW.receiver_company_id,
            NEW.amount,
            COALESCE(NEW.concept, 'Pago recibido vía Verlyx'),
            CURRENT_DATE,
            'verlyx_transfer',
            'received',
            'Transfer ID: ' || NEW.id::TEXT,
            NEW.receiver_user_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_income_from_payment
AFTER UPDATE ON verlyx_transfers
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION create_income_from_verlyx_payment();

-- =====================================================
-- FUNCIONES ÚTILES
-- =====================================================

-- Función para crear wallet automáticamente para nuevos usuarios
CREATE OR REPLACE FUNCTION create_default_wallet_for_user(p_user_id UUID, p_company_id UUID)
RETURNS UUID AS $$
DECLARE
    v_wallet_id UUID;
BEGIN
    INSERT INTO verlyx_wallets (user_id, company_id, balance, is_active)
    VALUES (p_user_id, p_company_id, 0.00, true)
    ON CONFLICT (user_id, company_id) DO NOTHING
    RETURNING id INTO v_wallet_id;
    
    RETURN v_wallet_id;
END;
$$ LANGUAGE plpgsql;

-- Función para generar código de payment request único
CREATE OR REPLACE FUNCTION generate_payment_link_code()
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        -- Generar código aleatorio de 20 caracteres
        v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 20));
        
        -- Verificar si ya existe
        SELECT EXISTS(SELECT 1 FROM verlyx_payment_requests WHERE payment_link_code = v_code)
        INTO v_exists;
        
        EXIT WHEN NOT v_exists;
    END LOOP;
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Función para generar QR code único
CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS TEXT AS $$
BEGIN
    RETURN 'VRX-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 16));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE verlyx_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE verlyx_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE verlyx_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE verlyx_payment_qr ENABLE ROW LEVEL SECURITY;

-- Policies para verlyx_wallets
CREATE POLICY "Users can view their own wallets"
    ON verlyx_wallets FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can view wallets from their companies"
    ON verlyx_wallets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM company_users
            WHERE company_users.company_id = verlyx_wallets.company_id
            AND company_users.user_id = auth.uid()
        )
    );

-- Policies para verlyx_transfers
CREATE POLICY "Users can view their transfers"
    ON verlyx_transfers FOR SELECT
    USING (
        sender_user_id = auth.uid() OR receiver_user_id = auth.uid()
    );

CREATE POLICY "Users can create transfers from their wallets"
    ON verlyx_transfers FOR INSERT
    WITH CHECK (sender_user_id = auth.uid());

CREATE POLICY "Users can update their pending transfers"
    ON verlyx_transfers FOR UPDATE
    USING (sender_user_id = auth.uid() AND status = 'pending');

-- Policies para verlyx_payment_requests
CREATE POLICY "Users can view their payment requests"
    ON verlyx_payment_requests FOR SELECT
    USING (
        requester_user_id = auth.uid() OR payer_user_id = auth.uid()
    );

CREATE POLICY "Users can create payment requests"
    ON verlyx_payment_requests FOR INSERT
    WITH CHECK (requester_user_id = auth.uid());

CREATE POLICY "Users can update their payment requests"
    ON verlyx_payment_requests FOR UPDATE
    USING (requester_user_id = auth.uid());

-- Policies para verlyx_payment_qr
CREATE POLICY "Users can view their QR codes"
    ON verlyx_payment_qr FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their QR codes"
    ON verlyx_payment_qr FOR ALL
    USING (user_id = auth.uid());

-- =====================================================
-- DATOS INICIALES (Si es necesario)
-- =====================================================

-- Función para inicializar wallets para usuarios existentes
CREATE OR REPLACE FUNCTION initialize_existing_wallets()
RETURNS void AS $$
BEGIN
    -- Crear wallet para cada usuario en cada empresa
    INSERT INTO verlyx_wallets (user_id, company_id, balance, is_active)
    SELECT DISTINCT cu.user_id, cu.company_id, 0.00, true
    FROM company_users cu
    WHERE NOT EXISTS (
        SELECT 1 FROM verlyx_wallets vw
        WHERE vw.user_id = cu.user_id AND vw.company_id = cu.company_id
    );
END;
$$ LANGUAGE plpgsql;

-- Ejecutar inicialización
-- SELECT initialize_existing_wallets();

COMMENT ON TABLE verlyx_wallets IS 'Billetera virtual para cada usuario en cada empresa';
COMMENT ON TABLE verlyx_transfers IS 'Transferencias P2P entre usuarios Verlyx sin comisiones';
COMMENT ON TABLE verlyx_payment_requests IS 'Solicitudes de pago que se pueden enviar por email o link';
COMMENT ON TABLE verlyx_payment_qr IS 'Códigos QR para pagos rápidos escaneando desde app móvil';
