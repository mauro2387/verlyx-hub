-- ============================================
-- Migration 47: Opportunity Engine + Market Scanner
-- ============================================
-- Extends leads table for digital audit support
-- and creates market_snapshots for city analysis.
-- ============================================

-- =============================================
-- 1. EXTEND LEADS TABLE
-- =============================================

-- Opportunity type detected by the engine
ALTER TABLE leads ADD COLUMN IF NOT EXISTS opportunity_type VARCHAR(50);
-- Digital presence score (0-100)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS digital_score INTEGER DEFAULT 0;
-- Last audit timestamp
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_audit_at TIMESTAMPTZ;
-- Structured audit result
ALTER TABLE leads ADD COLUMN IF NOT EXISTS audit_data JSONB DEFAULT '{}';

-- Index for quickly finding high-opportunity leads
CREATE INDEX IF NOT EXISTS idx_leads_opportunity_type ON leads(opportunity_type) WHERE opportunity_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_digital_score ON leads(digital_score DESC) WHERE digital_score > 0;

-- =============================================
-- 2. EXTEND PROSPECTING_CAMPAIGNS TABLE
-- =============================================

ALTER TABLE prospecting_campaigns ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(50) DEFAULT 'general';

-- =============================================
-- 3. MARKET SNAPSHOTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS market_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    my_company_id UUID REFERENCES my_companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    city VARCHAR(255) NOT NULL,
    business_type VARCHAR(255) NOT NULL,
    total_found INTEGER DEFAULT 0,
    no_website INTEGER DEFAULT 0,
    broken_website INTEGER DEFAULT 0,
    slow_website INTEGER DEFAULT 0,
    good_website INTEGER DEFAULT 0,
    avg_digital_score NUMERIC(5,2) DEFAULT 0,
    snapshot_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_snapshots_company ON market_snapshots(my_company_id);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_city ON market_snapshots(city, business_type);

-- =============================================
-- RLS FOR MARKET SNAPSHOTS
-- =============================================

ALTER TABLE market_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'market_snapshots'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.market_snapshots', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "market_snapshots_user_access" ON market_snapshots
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- VERIFY
-- =============================================

DO $$
DECLARE
    col_count INTEGER;
    snap_exists BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name IN ('opportunity_type', 'digital_score', 'last_audit_at', 'audit_data');

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'market_snapshots'
    ) INTO snap_exists;

    RAISE NOTICE '✅ Leads new columns: %/4', col_count;
    RAISE NOTICE '✅ market_snapshots table: %', snap_exists;

    IF col_count = 4 AND snap_exists THEN
        RAISE NOTICE '✅ Migration 47 complete — Opportunity Engine + Market Scanner ready';
    ELSE
        RAISE WARNING '⚠️ Migration 47 incomplete';
    END IF;
END $$;
