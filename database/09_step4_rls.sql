-- =====================================================
-- PASO 4: RLS policies solamente
-- =====================================================
ALTER TABLE client_organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view client organizations of their companies" ON client_organizations;
DROP POLICY IF EXISTS "Users can create client organizations" ON client_organizations;
DROP POLICY IF EXISTS "Users can update client organizations" ON client_organizations;
DROP POLICY IF EXISTS "Users can delete client organizations" ON client_organizations;

CREATE POLICY "Users can view client organizations of their companies"
ON client_organizations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = client_organizations.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can create client organizations"
ON client_organizations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = client_organizations.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update client organizations"
ON client_organizations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = client_organizations.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete client organizations"
ON client_organizations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = client_organizations.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);
