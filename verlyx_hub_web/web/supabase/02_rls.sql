-- ============================================
-- Verlyx Hub - Row Level Security Policies
-- Execute after 01_schema.sql
-- ============================================

-- ============================================
-- PROFILES RLS
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Allow insert for new users (triggered by auth)
CREATE POLICY "Enable insert for authenticated users only" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- ============================================
-- MY COMPANIES RLS
-- ============================================
ALTER TABLE my_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own companies" 
ON my_companies FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own companies" 
ON my_companies FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companies" 
ON my_companies FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own companies" 
ON my_companies FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- CONTACTS RLS
-- ============================================
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts" 
ON contacts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own contacts" 
ON contacts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts" 
ON contacts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts" 
ON contacts FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- DEALS RLS
-- ============================================
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deals" 
ON deals FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own deals" 
ON deals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deals" 
ON deals FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own deals" 
ON deals FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- PROJECTS RLS
-- ============================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" 
ON projects FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" 
ON projects FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
ON projects FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
ON projects FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- TASKS RLS
-- ============================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" 
ON tasks FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "Users can create own tasks" 
ON tasks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" 
ON tasks FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "Users can delete own tasks" 
ON tasks FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- PAYMENT LINKS RLS
-- ============================================
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment links" 
ON payment_links FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payment links" 
ON payment_links FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment links" 
ON payment_links FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment links" 
ON payment_links FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- SUBSCRIPTIONS RLS
-- ============================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" 
ON subscriptions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions" 
ON subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" 
ON subscriptions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" 
ON subscriptions FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- DOCUMENTS RLS
-- ============================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" 
ON documents FOR SELECT 
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create own documents" 
ON documents FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" 
ON documents FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" 
ON documents FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- NOTIFICATIONS RLS
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" 
ON notifications FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- AI CONVERSATIONS RLS
-- ============================================
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai conversations" 
ON ai_conversations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own ai conversations" 
ON ai_conversations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai conversations" 
ON ai_conversations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai conversations" 
ON ai_conversations FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- AI MESSAGES RLS
-- ============================================
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from own conversations" 
ON ai_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM ai_conversations 
    WHERE ai_conversations.id = ai_messages.conversation_id 
    AND ai_conversations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in own conversations" 
ON ai_messages FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ai_conversations 
    WHERE ai_conversations.id = conversation_id 
    AND ai_conversations.user_id = auth.uid()
  )
);
