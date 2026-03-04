-- =====================================================
-- Migration 44: Auto-archive won deals after midnight (Uruguay)
-- =====================================================
-- At midnight Uruguay time (UTC-3), all opportunities with
-- stage='won' that have been converted to client or project
-- are archived (is_active = FALSE).
--
-- This function can be called by pg_cron or a Supabase
-- Edge Function scheduled daily.
-- =====================================================

-- 1. Function to archive converted won deals
CREATE OR REPLACE FUNCTION public.archive_converted_won_deals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived_count INTEGER := 0;
  v_archived_ids UUID[];
BEGIN
  -- Archive opportunities that are:
  -- 1. stage = 'won' AND is_active = TRUE
  -- 2. AND either:
  --    a) Their linked contact (client_id) has type = 'client'
  --    b) OR there is a project linked to them (via projects.deal_id or client match)
  --    c) OR won_at is more than 24 hours ago (already processed by pipeline)
  WITH won_to_archive AS (
    SELECT o.id
    FROM opportunities o
    WHERE o.stage = 'won'
      AND o.is_active = TRUE
      AND (
        -- Contact was already converted to client
        EXISTS (
          SELECT 1 FROM contacts c
          WHERE c.id = o.client_id
            AND c.type = 'client'
        )
        -- OR a project was created from this opportunity
        OR EXISTS (
          SELECT 1 FROM projects p
          WHERE p.deal_id = o.id
        )
        -- OR won more than 24h ago (pipeline already ran)
        OR (o.won_at IS NOT NULL AND o.won_at < NOW() - INTERVAL '24 hours')
      )
  )
  UPDATE opportunities
  SET is_active = FALSE,
      updated_at = NOW()
  WHERE id IN (SELECT id FROM won_to_archive)
  RETURNING id INTO v_archived_ids;

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'archived_count', v_archived_count,
    'archived_ids', COALESCE(to_jsonb(v_archived_ids), '[]'::jsonb),
    'executed_at', NOW()
  );
END;
$$;

-- 2. Grant execute to authenticated users (for manual trigger from app)
GRANT EXECUTE ON FUNCTION public.archive_converted_won_deals() TO authenticated;

-- 3. If pg_cron is available, schedule at midnight Uruguay time (03:00 UTC)
-- Uncomment the following lines after enabling pg_cron in Supabase Dashboard:
-- SELECT cron.schedule(
--   'archive-won-deals-midnight',
--   '0 3 * * *',  -- 03:00 UTC = 00:00 Uruguay (UTC-3)
--   $$SELECT public.archive_converted_won_deals()$$
-- );

-- 4. Also archive lost deals older than 30 days
CREATE OR REPLACE FUNCTION public.archive_old_lost_deals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived_count INTEGER;
BEGIN
  UPDATE opportunities
  SET is_active = FALSE,
      updated_at = NOW()
  WHERE stage = 'lost'
    AND is_active = TRUE
    AND lost_at IS NOT NULL
    AND lost_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'archived_count', v_archived_count,
    'executed_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_old_lost_deals() TO authenticated;

-- Uncomment for pg_cron:
-- SELECT cron.schedule(
--   'archive-lost-deals-monthly',
--   '0 3 * * *',
--   $$SELECT public.archive_old_lost_deals()$$
-- );
