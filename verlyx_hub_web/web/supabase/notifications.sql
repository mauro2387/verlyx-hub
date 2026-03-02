-- ============================================
-- NOTIFICATIONS SYSTEM
-- ============================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  related_type VARCHAR(50),
  related_id UUID,
  related_name VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  
  CONSTRAINT notification_type_check CHECK (type IN ('task', 'project', 'payment', 'deal', 'system', 'reminder', 'mention', 'contact', 'deadline', 'message'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System can create notifications (using service role key)
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- NOTIFICATION PREFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  task_notifications BOOLEAN DEFAULT true,
  project_notifications BOOLEAN DEFAULT true,
  payment_notifications BOOLEAN DEFAULT true,
  deal_notifications BOOLEAN DEFAULT true,
  mention_notifications BOOLEAN DEFAULT true,
  reminder_notifications BOOLEAN DEFAULT true,
  notification_sound BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- RLS for notification preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW()
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$;

-- Function to get unread count
CREATE OR REPLACE FUNCTION get_unread_notifications_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_result
  FROM notifications
  WHERE user_id = auth.uid() AND is_read = false;
  
  RETURN count_result;
END;
$$;

-- Function to create notification (used by triggers)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_related_type VARCHAR DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_related_name VARCHAR DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id, type, title, message, action_url,
    related_type, related_id, related_name, metadata
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_action_url,
    p_related_type, p_related_id, p_related_name, p_metadata
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Function to delete old read notifications (cleanup job)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_old INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE is_read = true 
    AND read_at < NOW() - (days_old || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
