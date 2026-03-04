-- ============================================
-- Migration 40: Fix notifications table schema
-- ============================================
-- Problem: Frontend uses columns (type, related_type, related_id, related_name, metadata)
-- but the SQL table from migration 24 uses (notification_type, entity_type, entity_id)
-- and is missing related_name and metadata columns.
--
-- This migration adds the missing columns so the frontend works correctly.
-- ============================================

-- Step 1: Add missing columns that the frontend expects
-- Using IF NOT EXISTS via DO block for safety

DO $$
BEGIN
  -- 'type' column (frontend uses this, SQL had 'notification_type')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN type VARCHAR(50);
    -- Backfill from notification_type if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'notification_type'
    ) THEN
      UPDATE public.notifications SET type = notification_type::text WHERE type IS NULL;
    END IF;
  END IF;

  -- 'related_type' column (frontend uses this, SQL had 'entity_type')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'related_type'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN related_type VARCHAR(50);
    -- Backfill from entity_type if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'entity_type'
    ) THEN
      UPDATE public.notifications SET related_type = entity_type WHERE related_type IS NULL;
    END IF;
  END IF;

  -- 'related_id' column (frontend uses this, SQL had 'entity_id')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'related_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN related_id UUID;
    -- Backfill from entity_id if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'entity_id'
    ) THEN
      UPDATE public.notifications SET related_id = entity_id WHERE related_id IS NULL;
    END IF;
  END IF;

  -- 'related_name' column (only in frontend, never existed in SQL)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'related_name'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN related_name VARCHAR(255);
  END IF;

  -- 'metadata' column (only in frontend, never existed in SQL)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;

  RAISE NOTICE '✅ Notifications schema updated - all frontend columns now exist';
END $$;

-- Step 2: Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_related ON public.notifications(related_type, related_id);

-- Step 3: Verify
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name IN ('type', 'related_type', 'related_id', 'related_name', 'metadata');
  
  IF col_count = 5 THEN
    RAISE NOTICE '✅ All 5 frontend columns verified in notifications table';
  ELSE
    RAISE WARNING '⚠️ Only % of 5 expected columns found', col_count;
  END IF;
END $$;
