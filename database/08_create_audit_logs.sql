-- =====================================================
-- FASE 1.4: Auditoría y Logs
-- Tabla: audit_logs
-- =====================================================

-- Crear enum de acciones
CREATE TYPE audit_action AS ENUM (
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'PERMISSION_CHANGE',
  'ROLE_CHANGE',
  'INVITE_SENT',
  'INVITE_ACCEPTED',
  'MEMBER_ADDED',
  'MEMBER_REMOVED',
  'EXPORT',
  'IMPORT',
  'STATUS_CHANGE',
  'OTHER'
);

-- Crear tabla de audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES my_companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type VARCHAR(100), -- 'client', 'project', 'task', 'document', 'invoice', etc
  entity_id UUID,
  action audit_action NOT NULL,
  changes JSONB, -- Objeto con before/after
  metadata JSONB DEFAULT '{}', -- Información adicional
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Habilitar RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver logs de sus empresas
CREATE POLICY "Users can view audit logs of their companies"
ON audit_logs
FOR SELECT
USING (
  company_id IS NULL -- Logs globales (login, logout)
  OR EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = audit_logs.company_id
    AND my_companies.owner_user_id = auth.uid()
  )
  OR user_id = auth.uid() -- Ver sus propios logs
);

-- Política: Solo el sistema puede insertar logs (via SECURITY DEFINER functions)
CREATE POLICY "System can insert audit logs"
ON audit_logs
FOR INSERT
WITH CHECK (true);

-- No permitir UPDATE ni DELETE de logs (inmutables)
-- Las políticas de RLS por defecto negarán estas operaciones

-- Función helper para registrar logs
CREATE OR REPLACE FUNCTION log_audit(
  p_company_id UUID,
  p_user_id UUID,
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_action audit_action,
  p_changes JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    company_id,
    user_id,
    entity_type,
    entity_id,
    action,
    changes,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    p_company_id,
    p_user_id,
    p_entity_type,
    p_entity_id,
    p_action,
    p_changes,
    COALESCE(p_metadata, '{}'::jsonb),
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function para auditar cambios en my_companies
CREATE OR REPLACE FUNCTION audit_my_companies_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(
      NEW.id,
      NEW.owner_user_id,
      'my_company',
      NEW.id,
      'CREATE'::audit_action,
      jsonb_build_object('after', to_jsonb(NEW))
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Solo registrar si hubo cambios significativos
    v_changes := jsonb_build_object(
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    );
    
    PERFORM log_audit(
      NEW.id,
      NEW.owner_user_id,
      'my_company',
      NEW.id,
      'UPDATE'::audit_action,
      v_changes
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(
      OLD.id,
      OLD.owner_user_id,
      'my_company',
      OLD.id,
      'DELETE'::audit_action,
      jsonb_build_object('before', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger a my_companies
CREATE TRIGGER trigger_audit_my_companies
  AFTER INSERT OR UPDATE OR DELETE ON my_companies
  FOR EACH ROW
  EXECUTE FUNCTION audit_my_companies_changes();

-- Trigger function para auditar cambios en projects
CREATE OR REPLACE FUNCTION audit_projects_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB;
  v_company_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(
      NEW.my_company_id,
      NEW.created_by,
      'project',
      NEW.id,
      'CREATE'::audit_action,
      jsonb_build_object('after', to_jsonb(NEW))
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_changes := jsonb_build_object(
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    );
    
    -- Detectar cambio de estado
    IF OLD.status != NEW.status THEN
      PERFORM log_audit(
        NEW.my_company_id,
        auth.uid(),
        'project',
        NEW.id,
        'STATUS_CHANGE'::audit_action,
        jsonb_build_object(
          'field', 'status',
          'from', OLD.status,
          'to', NEW.status
        )
      );
    END IF;
    
    PERFORM log_audit(
      NEW.my_company_id,
      auth.uid(),
      'project',
      NEW.id,
      'UPDATE'::audit_action,
      v_changes
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(
      OLD.my_company_id,
      auth.uid(),
      'project',
      OLD.id,
      'DELETE'::audit_action,
      jsonb_build_object('before', to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger a projects
CREATE TRIGGER trigger_audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION audit_projects_changes();

-- Trigger function para auditar cambios en company_users
CREATE OR REPLACE FUNCTION audit_company_users_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit(
      NEW.company_id,
      NEW.invited_by,
      'company_user',
      NEW.id,
      'MEMBER_ADDED'::audit_action,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'role', NEW.role
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detectar cambio de rol
    IF OLD.role != NEW.role THEN
      PERFORM log_audit(
        NEW.company_id,
        auth.uid(),
        'company_user',
        NEW.id,
        'ROLE_CHANGE'::audit_action,
        jsonb_build_object(
          'user_id', NEW.user_id,
          'from', OLD.role,
          'to', NEW.role
        )
      );
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit(
      OLD.company_id,
      auth.uid(),
      'company_user',
      OLD.id,
      'MEMBER_REMOVED'::audit_action,
      jsonb_build_object(
        'user_id', OLD.user_id,
        'role', OLD.role
      )
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger a company_users
CREATE TRIGGER trigger_audit_company_users
  AFTER INSERT OR UPDATE OR DELETE ON company_users
  FOR EACH ROW
  EXECUTE FUNCTION audit_company_users_changes();

-- Función para obtener historial de una entidad específica
CREATE OR REPLACE FUNCTION get_entity_history(
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  action audit_action,
  changes JSONB,
  user_email VARCHAR,
  user_name VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.action,
    al.changes,
    u.email as user_email,
    u.raw_user_meta_data->>'name' as user_name,
    al.created_at
  FROM audit_logs al
  LEFT JOIN auth.users u ON u.id = al.user_id
  WHERE al.entity_type = p_entity_type
  AND al.entity_id = p_entity_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar logs antiguos (ejecutar con cron, mantener últimos 90 días)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
  p_days_to_keep INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
