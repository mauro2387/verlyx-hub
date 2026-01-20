-- =====================================================
-- FINANCIAL SYSTEM - GASTOS, INGRESOS, CUENTAS, PRESUPUESTOS
-- =====================================================

-- =====================================================
-- 1. CATEGORIES (Categorías de gastos e ingresos)
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  
  -- Info básica
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income')),
  color VARCHAR(7), -- Color hex para UI
  icon VARCHAR(50), -- Icono para UI
  
  -- Organización
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(my_company_id, name, type)
);

-- Index
CREATE INDEX idx_categories_company ON categories(my_company_id);
CREATE INDEX idx_categories_type ON categories(type);

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories of their company" ON categories
  FOR SELECT USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create categories in their company" ON categories
  FOR INSERT WITH CHECK (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update categories in their company" ON categories
  FOR UPDATE USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete categories in their company" ON categories
  FOR DELETE USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 2. ACCOUNTS (Cuentas/Cajas: efectivo, bancos, MP, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  
  -- Info básica
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('cash', 'bank', 'mercadopago', 'stripe', 'paypal', 'other')),
  currency VARCHAR(3) NOT NULL DEFAULT 'UYU',
  
  -- Detalles bancarios (opcional)
  bank_name VARCHAR(100),
  account_number VARCHAR(100),
  
  -- Balance
  initial_balance DECIMAL(15, 2) DEFAULT 0,
  current_balance DECIMAL(15, 2) DEFAULT 0,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  color VARCHAR(7),
  icon VARCHAR(50),
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(my_company_id, name)
);

-- Index
CREATE INDEX idx_accounts_company ON accounts(my_company_id);
CREATE INDEX idx_accounts_type ON accounts(type);

-- RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accounts of their company" ON accounts
  FOR SELECT USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create accounts in their company" ON accounts
  FOR INSERT WITH CHECK (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update accounts in their company" ON accounts
  FOR UPDATE USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete accounts in their company" ON accounts
  FOR DELETE USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 3. EXPENSES (Gastos)
-- =====================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  
  -- Info básica
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'UYU',
  
  -- Categorización
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  
  -- Proveedor
  supplier_name VARCHAR(255),
  supplier_tax_id VARCHAR(50), -- RUT/CUIT/etc
  
  -- Pago
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  payment_method VARCHAR(50), -- cash, transfer, card, check
  payment_date DATE NOT NULL,
  
  -- Factura
  invoice_number VARCHAR(100),
  invoice_date DATE,
  
  -- Relaciones
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  deal_id UUID, -- No FK para evitar errores si no existe deals
  
  -- Adjuntos
  attachment_urls TEXT[], -- Array de URLs en Supabase Storage
  
  -- Tags y notas
  tags TEXT[],
  notes TEXT,
  
  -- Estado
  status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'cancelled')),
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency VARCHAR(20), -- monthly, yearly, etc.
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_expenses_company ON expenses(my_company_id);
CREATE INDEX idx_expenses_date ON expenses(payment_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_project ON expenses(project_id);
CREATE INDEX idx_expenses_account ON expenses(account_id);
CREATE INDEX idx_expenses_status ON expenses(status);

-- RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expenses of their company" ON expenses
  FOR SELECT USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create expenses in their company" ON expenses
  FOR INSERT WITH CHECK (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update expenses in their company" ON expenses
  FOR UPDATE USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete expenses in their company" ON expenses
  FOR DELETE USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. INCOMES (Ingresos)
-- =====================================================
CREATE TABLE IF NOT EXISTS incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  
  -- Info básica
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'UYU',
  
  -- Categorización
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  
  -- Cliente
  client_id UUID, -- Referencia a contacts/clients
  client_name VARCHAR(255),
  
  -- Cobro
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  payment_method VARCHAR(50), -- cash, transfer, card, mercadopago
  payment_date DATE,
  
  -- Factura
  invoice_number VARCHAR(100),
  invoice_date DATE,
  
  -- Relaciones
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  deal_id UUID,
  payment_link_id UUID REFERENCES payment_links(id) ON DELETE SET NULL,
  
  -- Adjuntos
  attachment_urls TEXT[],
  
  -- Tags y notas
  tags TEXT[],
  notes TEXT,
  
  -- Estado
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled', 'overdue')),
  due_date DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency VARCHAR(20),
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_incomes_company ON incomes(my_company_id);
CREATE INDEX idx_incomes_date ON incomes(payment_date);
CREATE INDEX idx_incomes_due_date ON incomes(due_date);
CREATE INDEX idx_incomes_category ON incomes(category_id);
CREATE INDEX idx_incomes_client ON incomes(client_id);
CREATE INDEX idx_incomes_project ON incomes(project_id);
CREATE INDEX idx_incomes_account ON incomes(account_id);
CREATE INDEX idx_incomes_status ON incomes(status);

-- RLS
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view incomes of their company" ON incomes
  FOR SELECT USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create incomes in their company" ON incomes
  FOR INSERT WITH CHECK (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update incomes in their company" ON incomes
  FOR UPDATE USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete incomes in their company" ON incomes
  FOR DELETE USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. BUDGETS (Presupuestos)
-- =====================================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  
  -- Info básica
  name VARCHAR(255) NOT NULL,
  period VARCHAR(20) NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly')),
  year INTEGER NOT NULL,
  month INTEGER, -- NULL para yearly
  
  -- Categoría (opcional, si no se pone es general)
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  
  -- Montos
  planned_amount DECIMAL(15, 2) NOT NULL CHECK (planned_amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'UYU',
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  alert_percentage INTEGER DEFAULT 80, -- Alertar al llegar a X% del presupuesto
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_budgets_company ON budgets(my_company_id);
CREATE INDEX idx_budgets_category ON budgets(category_id);
CREATE INDEX idx_budgets_period ON budgets(period, year, month);

-- RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budgets of their company" ON budgets
  FOR SELECT USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create budgets in their company" ON budgets
  FOR INSERT WITH CHECK (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update budgets in their company" ON budgets
  FOR UPDATE USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete budgets in their company" ON budgets
  FOR DELETE USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 6. TRANSACTIONS (Movimientos de cuentas)
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  
  -- Cuenta
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Tipo
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  
  -- Monto
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'UYU',
  
  -- Descripción
  description TEXT,
  
  -- Relación con gasto/ingreso
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  income_id UUID REFERENCES incomes(id) ON DELETE CASCADE,
  
  -- Para transferencias
  to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  
  -- Balance después de la transacción
  balance_after DECIMAL(15, 2),
  
  -- Fecha
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transactions_company ON transactions(my_company_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_expense ON transactions(expense_id);
CREATE INDEX idx_transactions_income ON transactions(income_id);

-- RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transactions of their company" ON transactions
  FOR SELECT USING (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transactions in their company" ON transactions
  FOR INSERT WITH CHECK (
    my_company_id IN (
      SELECT my_company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- TRIGGERS PARA ACTUALIZAR BALANCES
-- =====================================================

-- Función para actualizar balance de cuenta
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'income' THEN
      UPDATE accounts 
      SET current_balance = current_balance + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE accounts 
      SET current_balance = current_balance - NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_id;
    ELSIF NEW.type = 'transfer' AND NEW.to_account_id IS NOT NULL THEN
      -- Resta de cuenta origen
      UPDATE accounts 
      SET current_balance = current_balance - NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.account_id;
      -- Suma a cuenta destino
      UPDATE accounts 
      SET current_balance = current_balance + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.to_account_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_update_account_balance ON transactions;
CREATE TRIGGER trigger_update_account_balance
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();

-- =====================================================
-- FUNCIONES ÚTILES
-- =====================================================

-- Función para crear categorías por defecto
CREATE OR REPLACE FUNCTION create_default_categories(p_company_id UUID)
RETURNS void AS $$
BEGIN
  -- Categorías de gastos
  INSERT INTO categories (my_company_id, name, type, color, icon) VALUES
    (p_company_id, 'Sueldos y Salarios', 'expense', '#EF4444', '👥'),
    (p_company_id, 'Alquiler', 'expense', '#F59E0B', '🏢'),
    (p_company_id, 'Servicios', 'expense', '#3B82F6', '⚡'),
    (p_company_id, 'Marketing', 'expense', '#8B5CF6', '📢'),
    (p_company_id, 'Compras', 'expense', '#10B981', '🛒'),
    (p_company_id, 'Impuestos', 'expense', '#6B7280', '📋'),
    (p_company_id, 'Otros Gastos', 'expense', '#9CA3AF', '💸');
  
  -- Categorías de ingresos
  INSERT INTO categories (my_company_id, name, type, color, icon) VALUES
    (p_company_id, 'Ventas', 'income', '#10B981', '💰'),
    (p_company_id, 'Servicios', 'income', '#3B82F6', '🎯'),
    (p_company_id, 'Suscripciones', 'income', '#8B5CF6', '🔄'),
    (p_company_id, 'Otros Ingresos', 'income', '#6B7280', '💵');
END;
$$ LANGUAGE plpgsql;

-- Función para crear cuentas por defecto
CREATE OR REPLACE FUNCTION create_default_accounts(p_company_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO accounts (my_company_id, name, type, currency, color, icon) VALUES
    (p_company_id, 'Efectivo', 'cash', 'UYU', '#10B981', '💵'),
    (p_company_id, 'Banco', 'bank', 'UYU', '#3B82F6', '🏦'),
    (p_company_id, 'MercadoPago', 'mercadopago', 'UYU', '#00B1EA', '💳');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE categories IS 'Categorías de gastos e ingresos por empresa';
COMMENT ON TABLE accounts IS 'Cuentas y cajas (efectivo, bancos, pasarelas) por empresa';
COMMENT ON TABLE expenses IS 'Gastos de la empresa con categorización y seguimiento';
COMMENT ON TABLE incomes IS 'Ingresos de la empresa con facturación y cobros';
COMMENT ON TABLE budgets IS 'Presupuestos por categoría o generales';
COMMENT ON TABLE transactions IS 'Movimientos de cuentas (entradas, salidas, transferencias)';
