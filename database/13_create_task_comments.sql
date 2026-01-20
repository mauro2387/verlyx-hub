-- =====================================================
-- FASE 3.2: Comentarios de Tareas (Task Comments)
-- =====================================================

-- Drop old version if exists (schema migration)
DROP TABLE IF EXISTS task_comments CASCADE;

-- Crear tabla de comentarios de tareas
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  
  -- Contenido
  content TEXT NOT NULL,
  content_html TEXT, -- Versión renderizada con menciones
  
  -- Autor
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Menciones (@usuario)
  mentioned_users UUID[], -- Array de user IDs mencionados en el comentario
  
  -- Archivos adjuntos
  attachments JSONB DEFAULT '[]', -- Array de {name, url, type, size, uploadedAt}
  
  -- Respuestas (threading)
  parent_comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
  
  -- Reacciones
  reactions JSONB DEFAULT '{}', -- {emoji: [user_ids]}
  
  -- Metadata
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_task_comments_task ON task_comments(task_id);
CREATE INDEX idx_task_comments_user ON task_comments(user_id);
CREATE INDEX idx_task_comments_parent ON task_comments(parent_comment_id);
CREATE INDEX idx_task_comments_created ON task_comments(created_at DESC);
CREATE INDEX idx_task_comments_my_company ON task_comments(my_company_id);

-- Trigger para updated_at
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para marcar como editado
CREATE OR REPLACE FUNCTION mark_comment_as_edited()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    NEW.is_edited := true;
    NEW.edited_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mark_comment_edited
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION mark_comment_as_edited();

-- Habilitar RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Política: Ver comentarios de sus empresas
CREATE POLICY "Users can view task comments of their companies"
ON task_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = task_comments.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Crear comentarios
CREATE POLICY "Users can create task comments"
ON task_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = task_comments.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
  AND task_comments.user_id = auth.uid()
);

-- Política: Actualizar solo sus propios comentarios
CREATE POLICY "Users can update their own comments"
ON task_comments
FOR UPDATE
USING (
  task_comments.user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = task_comments.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Eliminar solo sus propios comentarios
CREATE POLICY "Users can delete their own comments"
ON task_comments
FOR DELETE
USING (
  task_comments.user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = task_comments.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Función para obtener comentarios con información de usuario
CREATE OR REPLACE FUNCTION get_task_comments_with_users(
  p_task_id UUID
)
RETURNS TABLE (
  id UUID,
  task_id UUID,
  content TEXT,
  content_html TEXT,
  user_id UUID,
  user_email TEXT,
  parent_comment_id UUID,
  attachments JSONB,
  reactions JSONB,
  is_edited BOOLEAN,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  reply_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.id,
    tc.task_id,
    tc.content,
    tc.content_html,
    tc.user_id,
    au.email as user_email,
    tc.parent_comment_id,
    tc.attachments,
    tc.reactions,
    tc.is_edited,
    tc.edited_at,
    tc.created_at,
    (SELECT COUNT(*) FROM task_comments replies WHERE replies.parent_comment_id = tc.id) as reply_count
  FROM task_comments tc
  LEFT JOIN auth.users au ON au.id = tc.user_id
  WHERE tc.task_id = p_task_id
  AND tc.parent_comment_id IS NULL
  ORDER BY tc.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener respuestas de un comentario
CREATE OR REPLACE FUNCTION get_comment_replies(
  p_parent_comment_id UUID
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  content_html TEXT,
  user_id UUID,
  user_email TEXT,
  attachments JSONB,
  reactions JSONB,
  is_edited BOOLEAN,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.id,
    tc.content,
    tc.content_html,
    tc.user_id,
    au.email as user_email,
    tc.attachments,
    tc.reactions,
    tc.is_edited,
    tc.edited_at,
    tc.created_at
  FROM task_comments tc
  LEFT JOIN auth.users au ON au.id = tc.user_id
  WHERE tc.parent_comment_id = p_parent_comment_id
  ORDER BY tc.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para agregar reacción a un comentario
CREATE OR REPLACE FUNCTION add_comment_reaction(
  p_comment_id UUID,
  p_emoji TEXT,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_reactions JSONB;
  v_user_reactions JSONB;
BEGIN
  -- Obtener reacciones actuales
  SELECT reactions INTO v_reactions
  FROM task_comments
  WHERE id = p_comment_id;
  
  -- Si no hay reacciones, inicializar
  IF v_reactions IS NULL OR v_reactions = '{}'::jsonb THEN
    v_reactions := '{}'::jsonb;
  END IF;
  
  -- Obtener usuarios que ya reaccionaron con este emoji
  v_user_reactions := v_reactions->p_emoji;
  
  IF v_user_reactions IS NULL THEN
    v_user_reactions := '[]'::jsonb;
  END IF;
  
  -- Agregar usuario si no está en la lista
  IF NOT v_user_reactions ? p_user_id::text THEN
    v_user_reactions := v_user_reactions || jsonb_build_array(p_user_id);
  END IF;
  
  -- Actualizar reacciones
  v_reactions := jsonb_set(v_reactions, ARRAY[p_emoji], v_user_reactions);
  
  -- Guardar en base de datos
  UPDATE task_comments
  SET reactions = v_reactions
  WHERE id = p_comment_id;
  
  RETURN v_reactions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para remover reacción de un comentario
CREATE OR REPLACE FUNCTION remove_comment_reaction(
  p_comment_id UUID,
  p_emoji TEXT,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_reactions JSONB;
  v_user_reactions JSONB;
  v_new_user_reactions JSONB;
BEGIN
  -- Obtener reacciones actuales
  SELECT reactions INTO v_reactions
  FROM task_comments
  WHERE id = p_comment_id;
  
  IF v_reactions IS NULL OR v_reactions = '{}'::jsonb THEN
    RETURN '{}'::jsonb;
  END IF;
  
  -- Obtener usuarios que reaccionaron con este emoji
  v_user_reactions := v_reactions->p_emoji;
  
  IF v_user_reactions IS NULL THEN
    RETURN v_reactions;
  END IF;
  
  -- Remover usuario de la lista
  SELECT jsonb_agg(value)
  INTO v_new_user_reactions
  FROM jsonb_array_elements(v_user_reactions) as value
  WHERE value::text != ('"' || p_user_id::text || '"');
  
  -- Si quedaron usuarios, actualizar; si no, remover el emoji
  IF v_new_user_reactions IS NOT NULL AND jsonb_array_length(v_new_user_reactions) > 0 THEN
    v_reactions := jsonb_set(v_reactions, ARRAY[p_emoji], v_new_user_reactions);
  ELSE
    v_reactions := v_reactions - p_emoji;
  END IF;
  
  -- Guardar en base de datos
  UPDATE task_comments
  SET reactions = v_reactions
  WHERE id = p_comment_id;
  
  RETURN v_reactions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger de auditoría para task_comments
CREATE OR REPLACE FUNCTION audit_task_comments_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object(
      'task_id', NEW.task_id,
      'user_id', NEW.user_id,
      'has_attachments', jsonb_array_length(NEW.attachments) > 0
    );
    
    PERFORM log_audit(
      NEW.my_company_id,
      NEW.user_id,
      'task_comment',
      NEW.id,
      'CREATE'::audit_action,
      jsonb_build_object('after', v_changes)
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_changes := jsonb_build_object(
      'is_edited', NEW.is_edited
    );
    
    PERFORM log_audit(
      NEW.my_company_id,
      auth.uid(),
      'task_comment',
      NEW.id,
      'UPDATE'::audit_action,
      v_changes
    );
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'task_id', OLD.task_id
    );
    
    PERFORM log_audit(
      OLD.my_company_id,
      auth.uid(),
      'task_comment',
      OLD.id,
      'DELETE'::audit_action,
      jsonb_build_object('before', v_changes)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_audit_task_comments
  AFTER INSERT OR UPDATE OR DELETE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION audit_task_comments_changes();

-- Vista para actividad reciente de comentarios
CREATE OR REPLACE VIEW recent_task_comments AS
SELECT 
  tc.id,
  tc.task_id,
  t.title as task_title,
  tc.content,
  tc.user_id,
  au.email as user_email,
  tc.parent_comment_id,
  tc.is_edited,
  tc.created_at,
  tc.my_company_id
FROM task_comments tc
LEFT JOIN tasks t ON t.id = tc.task_id
LEFT JOIN auth.users au ON au.id = tc.user_id
ORDER BY tc.created_at DESC
LIMIT 100;

-- Comentarios
COMMENT ON TABLE task_comments IS 'Comentarios y discusiones en tareas con soporte para threading y menciones';
COMMENT ON COLUMN task_comments.mentioned_users IS 'Array de IDs de usuarios mencionados con @usuario';
COMMENT ON COLUMN task_comments.parent_comment_id IS 'ID del comentario padre para respuestas threading';
COMMENT ON COLUMN task_comments.reactions IS 'Reacciones emoji en formato {emoji: [user_ids]}';
COMMENT ON FUNCTION get_task_comments_with_users IS 'Obtiene comentarios principales con info de usuario y conteo de respuestas';
COMMENT ON FUNCTION get_comment_replies IS 'Obtiene todas las respuestas de un comentario';
COMMENT ON FUNCTION add_comment_reaction IS 'Agrega una reacción emoji de un usuario a un comentario';
COMMENT ON FUNCTION remove_comment_reaction IS 'Remueve una reacción emoji de un usuario de un comentario';
