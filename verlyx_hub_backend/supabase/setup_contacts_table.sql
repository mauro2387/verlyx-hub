-- Create contacts table if not exists
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  type VARCHAR(20) NOT NULL CHECK (type IN ('lead', 'client', 'partner', 'merchant')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('new', 'contacted', 'qualified', 'negotiation', 'won', 'lost', 'inactive')),
  source VARCHAR(100),
  company_id UUID,
  assigned_to UUID,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  
  -- Foreign key to profiles table
  CONSTRAINT fk_assigned_to FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all contacts" ON contacts;
DROP POLICY IF EXISTS "Users can create contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts" ON contacts;
DROP POLICY IF EXISTS "Owners can delete contacts" ON contacts;

-- Create RLS policies
-- Allow authenticated users to view all contacts
CREATE POLICY "Users can view all contacts" ON contacts
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create contacts
CREATE POLICY "Users can create contacts" ON contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update contacts
CREATE POLICY "Users can update contacts" ON contacts
  FOR UPDATE
  TO authenticated
  USING (true);

-- Allow authenticated users to delete contacts
CREATE POLICY "Users can delete contacts" ON contacts
  FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update user profile to have admin role (replace with your user ID)
-- First, find your user ID by running: SELECT id, email FROM auth.users;
-- Then replace 'YOUR_USER_ID_HERE' with your actual user ID
UPDATE profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'test@gmail.com'
);
