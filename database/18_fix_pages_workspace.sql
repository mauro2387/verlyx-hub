-- =====================================================
-- FIX PAGES TABLE FOR WORKSPACE
-- Add missing columns for full functionality
-- =====================================================

-- Add is_favorite column if not exists
ALTER TABLE pages ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Add content column (JSONB for storing blocks)
ALTER TABLE pages ADD COLUMN IF NOT EXISTS content JSONB DEFAULT '{"blocks": []}';

-- Add cover_url column
ALTER TABLE pages ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Create index for favorites
CREATE INDEX IF NOT EXISTS idx_pages_is_favorite ON pages(is_favorite);

-- Ensure RLS is disabled for development
ALTER TABLE pages DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON pages TO anon, authenticated, service_role;

-- Reload API cache
NOTIFY pgrst, 'reload schema';
