-- ELIMINAR TABLAS SI EXISTEN (para recrear desde cero)
DROP TABLE IF EXISTS ai_messages CASCADE;
DROP TABLE IF EXISTS ai_conversations CASCADE;
DROP FUNCTION IF EXISTS update_ai_conversation_timestamp() CASCADE;

-- Tabla para conversaciones de IA
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  context_type VARCHAR(50) DEFAULT 'general', -- 'general', 'project', 'task', 'pdf', etc.
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para mensajes dentro de conversaciones
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user' o 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor performance
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_updated_at ON ai_conversations(updated_at DESC);
CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created_at ON ai_messages(created_at);

-- RLS Policies
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios solo pueden ver sus propias conversaciones
CREATE POLICY "Users can view their own conversations"
ON ai_conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Los usuarios pueden crear sus propias conversaciones
CREATE POLICY "Users can create their own conversations"
ON ai_conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Los usuarios pueden actualizar sus propias conversaciones
CREATE POLICY "Users can update their own conversations"
ON ai_conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Los usuarios pueden eliminar sus propias conversaciones
CREATE POLICY "Users can delete their own conversations"
ON ai_conversations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Los usuarios pueden ver mensajes de sus conversaciones
CREATE POLICY "Users can view messages from their conversations"
ON ai_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ai_conversations
    WHERE ai_conversations.id = ai_messages.conversation_id
    AND ai_conversations.user_id = auth.uid()
  )
);

-- Policy: Los usuarios pueden crear mensajes en sus conversaciones
CREATE POLICY "Users can create messages in their conversations"
ON ai_messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ai_conversations
    WHERE ai_conversations.id = ai_messages.conversation_id
    AND ai_conversations.user_id = auth.uid()
  )
);

-- Trigger para actualizar updated_at en conversaciones
CREATE OR REPLACE FUNCTION update_ai_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON ai_messages
FOR EACH ROW
EXECUTE FUNCTION update_ai_conversation_timestamp();

-- Comentarios para documentación
COMMENT ON TABLE ai_conversations IS 'Almacena conversaciones de IA con contexto opcional';
COMMENT ON TABLE ai_messages IS 'Almacena mensajes individuales dentro de cada conversación';
COMMENT ON COLUMN ai_conversations.context_type IS 'Tipo de contexto: general, project, task, pdf, document';
