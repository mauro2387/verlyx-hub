-- =====================================================
-- MERCADOPAGO & SUBSCRIPTIONS SYSTEM
-- =====================================================

-- =====================================================
-- 1. SUBSCRIPTION PLANS (Planes de Club Verlyx)
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Info del plan
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE, -- free, club, premium
  description TEXT,
  
  -- Precio
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'UYU',
  billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, yearly
  
  -- Features (JSON con los beneficios)
  features JSONB,
  
  -- Límites
  max_projects INTEGER,
  max_users INTEGER,
  max_storage_gb INTEGER,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true, -- Visible en página pública
  
  -- UI
  color VARCHAR(7),
  icon VARCHAR(50),
  badge_text VARCHAR(50), -- "Más Popular", "Recomendado"
  
  -- Prioridad (para ordenar en UI)
  sort_order INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar planes por defecto
INSERT INTO subscription_plans (name, slug, price, currency, features, max_projects, max_users, max_storage_gb, badge_text, sort_order) VALUES
  ('Free', 'free', 0, 'UYU', 
   '["Dashboard básico", "1 proyecto", "Soporte por email", "1 GB almacenamiento"]'::jsonb,
   1, 1, 1, NULL, 1),
  
  ('Club', 'club', 990, 'UYU',
   '["Todo de Free", "Proyectos ilimitados", "5 usuarios", "10 GB almacenamiento", "Soporte prioritario", "Verlyx Points", "Descuentos exclusivos"]'::jsonb,
   NULL, 5, 10, 'Más Popular', 2),
  
  ('Premium', 'premium', 2990, 'UYU',
   '["Todo de Club", "Usuarios ilimitados", "100 GB almacenamiento", "IA avanzada", "API access", "Soporte 24/7", "Reportes personalizados", "Integraciones premium"]'::jsonb,
   NULL, NULL, 100, 'Recomendado', 3);

-- =====================================================
-- 2. SUBSCRIPTIONS (Suscripciones de usuarios)
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Usuario/Empresa
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  my_company_id UUID REFERENCES my_companies(id) ON DELETE CASCADE,
  
  -- Plan
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  
  -- Estado
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'paused', 'expired', 'pending')),
  
  -- Pago
  payment_method VARCHAR(50), -- mercadopago, stripe, manual
  external_subscription_id VARCHAR(255), -- ID en MercadoPago
  
  -- Fechas
  started_at TIMESTAMPTZ DEFAULT NOW(),
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Renovación automática
  auto_renew BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_company ON subscriptions(my_company_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver planes públicos
CREATE POLICY "Anyone can view public plans" ON subscription_plans
  FOR SELECT USING (is_public = true);

-- Solo usuarios pueden ver sus suscripciones
CREATE POLICY "Users can view their subscriptions" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their subscriptions" ON subscriptions
  FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- 3. MERCADOPAGO PAYMENTS (Pagos de MercadoPago)
-- =====================================================
CREATE TABLE IF NOT EXISTS mercadopago_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID REFERENCES my_companies(id) ON DELETE CASCADE,
  
  -- IDs MercadoPago
  preference_id VARCHAR(255), -- ID de preferencia
  payment_id VARCHAR(255), -- ID del pago confirmado
  merchant_order_id VARCHAR(255), -- ID de orden
  
  -- Nuestro order_id
  order_id VARCHAR(100) UNIQUE NOT NULL,
  
  -- Monto
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'UYU',
  
  -- Descripción
  title TEXT,
  description TEXT,
  
  -- Cliente (opcional)
  payer_email VARCHAR(255),
  payer_name VARCHAR(255),
  payer_phone VARCHAR(50),
  payer_identification VARCHAR(50),
  
  -- Relaciones
  client_id UUID, -- Referencia a contacts
  project_id UUID REFERENCES projects(id),
  deal_id UUID,
  subscription_id UUID REFERENCES subscriptions(id),
  
  -- Estado
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  status_detail TEXT,
  
  -- Método de pago
  payment_method_id VARCHAR(50), -- visa, master, account_money, etc.
  payment_type_id VARCHAR(50), -- credit_card, debit_card, etc.
  
  -- URLs
  init_point TEXT, -- URL para pagar
  sandbox_init_point TEXT,
  
  -- Metadata de MercadoPago
  metadata JSONB,
  
  -- Webhook data (guardamos el payload completo)
  webhook_payload JSONB,
  
  -- Fechas
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mp_payments_company ON mercadopago_payments(my_company_id);
CREATE INDEX idx_mp_payments_order ON mercadopago_payments(order_id);
CREATE INDEX idx_mp_payments_preference ON mercadopago_payments(preference_id);
CREATE INDEX idx_mp_payments_payment ON mercadopago_payments(payment_id);
CREATE INDEX idx_mp_payments_status ON mercadopago_payments(status);
CREATE INDEX idx_mp_payments_client ON mercadopago_payments(client_id);
CREATE INDEX idx_mp_payments_subscription ON mercadopago_payments(subscription_id);

-- RLS
ALTER TABLE mercadopago_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments of their company" ON mercadopago_payments
  FOR SELECT USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create payments in their company" ON mercadopago_payments
  FOR INSERT WITH CHECK (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payments in their company" ON mercadopago_payments
  FOR UPDATE USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. VERLYX POINTS (Sistema de puntos para clientes)
-- =====================================================
CREATE TABLE IF NOT EXISTS verlyx_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Usuario
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Puntos
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  lifetime_points INTEGER NOT NULL DEFAULT 0, -- Total acumulado histórico
  
  -- Nivel (calculado según puntos)
  level VARCHAR(20) DEFAULT 'bronze', -- bronze, silver, gold, platinum
  
  -- Audit
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- =====================================================
-- 5. POINTS TRANSACTIONS (Movimientos de puntos)
-- =====================================================
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Usuario
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tipo
  type VARCHAR(20) NOT NULL CHECK (type IN ('earned', 'spent', 'expired', 'bonus')),
  
  -- Puntos
  points INTEGER NOT NULL,
  
  -- Razón
  reason TEXT,
  reference_type VARCHAR(50), -- payment, project, referral, etc.
  reference_id UUID,
  
  -- Balance después
  balance_after INTEGER,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_points_user ON verlyx_points(user_id);
CREATE INDEX idx_points_trans_user ON points_transactions(user_id);
CREATE INDEX idx_points_trans_date ON points_transactions(created_at);

-- RLS
ALTER TABLE verlyx_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their points" ON verlyx_points
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their points transactions" ON points_transactions
  FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- FUNCIONES ÚTILES
-- =====================================================

-- Función para crear ingreso automáticamente cuando se confirma pago de MercadoPago
CREATE OR REPLACE FUNCTION create_income_from_mercadopago()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- Solo crear ingreso si el pago fue aprobado
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- Buscar cuenta de MercadoPago
    SELECT id INTO v_account_id
    FROM accounts
    WHERE my_company_id = NEW.my_company_id
      AND type = 'mercadopago'
    LIMIT 1;
    
    -- Crear ingreso
    INSERT INTO incomes (
      my_company_id,
      description,
      amount,
      currency,
      client_id,
      client_name,
      account_id,
      payment_method,
      payment_date,
      invoice_number,
      project_id,
      deal_id,
      status,
      notes,
      created_by
    ) VALUES (
      NEW.my_company_id,
      COALESCE(NEW.title, NEW.description, 'Pago MercadoPago'),
      NEW.amount,
      NEW.currency,
      NEW.client_id,
      NEW.payer_name,
      v_account_id,
      'mercadopago',
      NOW()::DATE,
      NEW.payment_id,
      NEW.project_id,
      NEW.deal_id,
      'received',
      'Pago automático desde MercadoPago - Order: ' || NEW.order_id,
      NEW.created_by
    );
    
    -- Si hay account_id, crear transacción
    IF v_account_id IS NOT NULL THEN
      INSERT INTO transactions (
        my_company_id,
        account_id,
        type,
        amount,
        currency,
        description,
        transaction_date,
        created_by
      ) VALUES (
        NEW.my_company_id,
        v_account_id,
        'income',
        NEW.amount,
        NEW.currency,
        'MercadoPago: ' || NEW.order_id,
        NEW.approved_at,
        NEW.created_by
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_create_income_from_mp ON mercadopago_payments;
CREATE TRIGGER trigger_create_income_from_mp
  AFTER UPDATE ON mercadopago_payments
  FOR EACH ROW
  EXECUTE FUNCTION create_income_from_mercadopago();

-- Función para agregar puntos Verlyx
CREATE OR REPLACE FUNCTION add_verlyx_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_reference_type VARCHAR(50) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Insertar o actualizar puntos del usuario
  INSERT INTO verlyx_points (user_id, points, lifetime_points)
  VALUES (p_user_id, p_points, p_points)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    points = verlyx_points.points + p_points,
    lifetime_points = verlyx_points.lifetime_points + p_points,
    updated_at = NOW()
  RETURNING points INTO v_new_balance;
  
  -- Registrar transacción
  INSERT INTO points_transactions (
    user_id,
    type,
    points,
    reason,
    reference_type,
    reference_id,
    balance_after
  ) VALUES (
    p_user_id,
    'earned',
    p_points,
    p_reason,
    p_reference_type,
    p_reference_id,
    v_new_balance
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE subscription_plans IS 'Planes de suscripción (Free, Club, Premium)';
COMMENT ON TABLE subscriptions IS 'Suscripciones activas de usuarios a planes';
COMMENT ON TABLE mercadopago_payments IS 'Pagos procesados por MercadoPago con webhooks';
COMMENT ON TABLE verlyx_points IS 'Puntos Verlyx acumulados por usuario';
COMMENT ON TABLE points_transactions IS 'Historial de movimientos de puntos';
