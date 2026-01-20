import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const type = searchParams.get('type');
    const read = searchParams.get('read');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    if (read === 'true') {
      query = query.eq('is_read', true);
    } else if (read === 'false') {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ notifications: data || [] });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      type,
      title,
      message,
      action_url,
      related_type,
      related_id,
      related_name,
      metadata,
    } = body;

    if (!user_id || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, type, title, message' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        message,
        action_url,
        related_type,
        related_id,
        related_name,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ notification: data }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
