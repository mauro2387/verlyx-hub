-- =====================================================
-- PAYMENTS MODULE - DLOCAL INTEGRATION
-- =====================================================

-- Drop tables if exist (for clean install)
DROP TABLE IF EXISTS refunds CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS payment_links CASCADE;

-- Payment Links table (for generating payment URLs)
CREATE TABLE payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(100) UNIQUE NOT NULL,
  external_id VARCHAR(100), -- dLocal payment ID
  external_payment_id VARCHAR(100), -- dLocal confirmed payment ID
  
  -- Amount info
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  country VARCHAR(2) NOT NULL DEFAULT 'UY',
  
  -- Description
  description TEXT,
  
  -- Client info
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  
  -- Relations (sin foreign keys para evitar errores)
  project_id UUID,
  deal_id UUID,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  status_detail TEXT,
  error_message TEXT,
  
  -- Payment details (filled after payment)
  payment_method VARCHAR(50),
  payment_method_type VARCHAR(50),
  
  -- URLs
  payment_url TEXT,
  
  -- Dates
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table (confirmed payments)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(100) UNIQUE,
  payment_link_id UUID REFERENCES payment_links(id) ON DELETE SET NULL,
  order_id VARCHAR(100),
  
  -- Amount
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  
  -- Payment method
  payment_method VARCHAR(50),
  payment_method_type VARCHAR(50),
  
  -- Client info
  client_name VARCHAR(255),
  description TEXT,
  
  -- Relations
  project_id UUID,
  deal_id UUID,
  
  -- Refund info
  refunded_amount DECIMAL(12, 2) DEFAULT 0,
  refund_reason TEXT,
  
  -- Dates
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refunds table
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  external_id VARCHAR(100),
  
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_links_order_id ON payment_links(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON payment_links(status);
CREATE INDEX IF NOT EXISTS idx_payment_links_created ON payment_links(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at DESC);

-- Disable RLS for development
ALTER TABLE payment_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE refunds DISABLE ROW LEVEL SECURITY;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- Sample data for testing
-- =====================================================

-- Insert some test payment links
INSERT INTO payment_links (order_id, amount, currency, country, description, client_name, client_email, status, expires_at) VALUES
  ('VLX-TEST-001', 5000.00, 'USD', 'UY', 'Desarrollo Web - Proyecto Alpha', 'ACME Corp', 'pagos@acme.com', 'pending', NOW() + INTERVAL '7 days'),
  ('VLX-TEST-002', 15000.00, 'USD', 'UY', 'App Móvil - Milestone 1', 'TechStart Inc', 'finance@techstart.com', 'paid', NOW() + INTERVAL '7 days'),
  ('VLX-TEST-003', 2500.00, 'USD', 'UY', 'Consultoría mensual', 'Global Solutions', 'billing@global.com', 'expired', NOW() - INTERVAL '2 days')
ON CONFLICT (order_id) DO NOTHING;

-- Insert test payment for the paid link
INSERT INTO payments (external_id, order_id, amount, currency, status, payment_method, client_name, description, paid_at) 
SELECT 
  'DLOCAL-TEST-001',
  'VLX-TEST-002',
  15000.00,
  'USD',
  'completed',
  'CARD',
  'TechStart Inc',
  'App Móvil - Milestone 1',
  NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM payments WHERE external_id = 'DLOCAL-TEST-001');

-- Update the paid link with payment reference
UPDATE payment_links 
SET paid_at = NOW() - INTERVAL '2 days'
WHERE order_id = 'VLX-TEST-002';
