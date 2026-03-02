-- ============================================
-- Verlyx Hub - Functions & Triggers
-- Execute after 02_rls.sql
-- ============================================

-- ============================================
-- AUTO UPDATE TIMESTAMPS TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_my_companies_updated_at 
  BEFORE UPDATE ON my_companies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at 
  BEFORE UPDATE ON contacts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at 
  BEFORE UPDATE ON deals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON projects 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON tasks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_links_updated_at 
  BEFORE UPDATE ON payment_links 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at 
  BEFORE UPDATE ON ai_conversations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'admin'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CALCULATE PROJECT PROGRESS
-- ============================================
CREATE OR REPLACE FUNCTION calculate_project_progress(project_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  progress_pct INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tasks 
  FROM tasks WHERE project_id = project_uuid;
  
  IF total_tasks = 0 THEN
    RETURN 0;
  END IF;
  
  SELECT COUNT(*) INTO completed_tasks 
  FROM tasks 
  WHERE project_id = project_uuid 
  AND status IN ('DONE', 'completed');
  
  progress_pct := ROUND((completed_tasks::DECIMAL / total_tasks::DECIMAL) * 100);
  
  RETURN progress_pct;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE PROJECT PROGRESS ON TASK CHANGE
-- ============================================
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    UPDATE projects 
    SET progress = calculate_project_progress(NEW.project_id)
    WHERE id = NEW.project_id;
  END IF;
  
  IF OLD IS NOT NULL AND OLD.project_id IS NOT NULL AND OLD.project_id != NEW.project_id THEN
    UPDATE projects 
    SET progress = calculate_project_progress(OLD.project_id)
    WHERE id = OLD.project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_progress_on_task
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_project_progress();

-- ============================================
-- GET DASHBOARD STATS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'projectsTotal', (SELECT COUNT(*) FROM projects WHERE user_id = p_user_id),
    'projectsInProgress', (SELECT COUNT(*) FROM projects WHERE user_id = p_user_id AND status IN ('active', 'in_progress')),
    'tasksTotal', (SELECT COUNT(*) FROM tasks WHERE user_id = p_user_id),
    'tasksPending', (SELECT COUNT(*) FROM tasks WHERE user_id = p_user_id AND status IN ('TODO', 'pending', 'IN_PROGRESS', 'in_progress')),
    'dealsTotal', (SELECT COUNT(*) FROM deals WHERE user_id = p_user_id),
    'dealsValue', (SELECT COALESCE(SUM(value), 0) FROM deals WHERE user_id = p_user_id AND stage IN ('CLOSED_WON', 'won')),
    'clientsTotal', (SELECT COUNT(*) FROM contacts WHERE user_id = p_user_id AND type = 'client')
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STORAGE BUCKET FOR DOCUMENTS
-- ============================================
-- Run this in Storage section or via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- SUCCESS
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Functions and triggers created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Summary:';
  RAISE NOTICE '  - Auto-update timestamps triggers';
  RAISE NOTICE '  - Auto-create profile on signup';
  RAISE NOTICE '  - Project progress calculation';
  RAISE NOTICE '  - Dashboard stats function';
  RAISE NOTICE '  - Storage bucket policies';
END $$;
