import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const order_id = searchParams.get('order_id');

  if (!order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('payment_links')
      .select('*')
      .eq('order_id', order_id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching payment link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
