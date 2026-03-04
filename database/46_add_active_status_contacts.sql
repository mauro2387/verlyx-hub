-- =====================================================
-- Migration 46: Add 'active' to contacts status CHECK
-- =====================================================
-- The frontend sends status='active' via handleMarkActive
-- but 'active' was missing from the DB CHECK constraint.
-- Current allowed: new, contacted, qualified, negotiation, won, lost, inactive
-- Adding: active
-- =====================================================

-- Drop the old CHECK constraint and recreate with 'active' included
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contact_status_check;
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_status_check;

-- Find and drop the actual CHECK constraint by querying pg_constraint
DO $$
DECLARE
  conname_val TEXT;
BEGIN
  SELECT conname INTO conname_val
  FROM pg_constraint
  WHERE conrelid = 'public.contacts'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';
  
  IF conname_val IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.contacts DROP CONSTRAINT %I', conname_val);
    RAISE NOTICE 'Dropped constraint: %', conname_val;
  END IF;
END $$;

-- Recreate with 'active' added
ALTER TABLE public.contacts
ADD CONSTRAINT contact_status_check
CHECK (status::text = ANY (ARRAY[
  'new', 'active', 'contacted', 'qualified',
  'negotiation', 'won', 'lost', 'inactive'
]::text[]));

-- Verify
DO $$
BEGIN
  RAISE NOTICE '✅ contacts status CHECK now includes: new, active, contacted, qualified, negotiation, won, lost, inactive';
END $$;
