-- =====================================================
-- PASO 3: Agregar índices solamente
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_client_orgs_my_company ON client_organizations(my_company_id);
CREATE INDEX IF NOT EXISTS idx_client_orgs_client ON client_organizations(client_id);
CREATE INDEX IF NOT EXISTS idx_client_orgs_parent ON client_organizations(parent_organization_id);
CREATE INDEX IF NOT EXISTS idx_client_orgs_type ON client_organizations(type);
CREATE INDEX IF NOT EXISTS idx_client_orgs_active ON client_organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_client_orgs_code ON client_organizations(code);
CREATE INDEX IF NOT EXISTS idx_client_orgs_tags ON client_organizations USING GIN(tags);
