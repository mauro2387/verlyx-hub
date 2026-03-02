import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('user_id', user_id)
      .eq('is_read', false)
      .select();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      marked_count: data?.length || 0 
    });
  } catch (error: any) {
    console.error('Error marking all as read:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
