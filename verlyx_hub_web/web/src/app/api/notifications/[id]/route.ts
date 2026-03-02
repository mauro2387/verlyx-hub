import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PATCH - Mark notification as read/unread
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { read, user_id } = body;

    if (typeof read !== 'boolean' || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: read (boolean), user_id' },
        { status: 400 }
      );
    }

    const updateData: any = { is_read: read };
    if (read) {
      updateData.read_at = new Date().toISOString();
    } else {
      updateData.read_at = null;
    }

    const { data, error } = await supabase
      .from('notifications')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ notification: data });
  } catch (error: any) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
