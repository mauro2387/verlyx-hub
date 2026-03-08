import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // 1. Generate pending recurring incomes
  const { data: recurringData, error: recurringError } = await supabaseAdmin.rpc('generate_recurring_incomes');
  results.recurringIncomes = recurringError
    ? { error: recurringError.message }
    : { generated: Array.isArray(recurringData) ? recurringData.length : 0 };

  // 2. Archive won deals (>24h) and lost deals (>30 days)
  const { data: archiveData, error: archiveError } = await supabaseAdmin.rpc('archive_converted_won_deals');
  results.archivedDeals = archiveError
    ? { error: archiveError.message }
    : { archived: archiveData };

  // 3. Archive old lost deals
  const { data: lostData, error: lostError } = await supabaseAdmin.rpc('archive_old_lost_deals');
  results.archivedLostDeals = lostError
    ? { error: lostError.message }
    : { archived: lostData };

  return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), results });
}
