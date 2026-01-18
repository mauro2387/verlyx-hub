-- =====================================================
-- FASE 3.1: Sistema de Tareas (Tasks)
-- =====================================================

-- Drop old version if exists (schema migration)
DROP TABLE IF EXISTS tasks CASCADE;

-- Crear enum de estado de tarea
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM (
    'TODO',           -- Por hacer
    'IN_PROGRESS',    -- En progreso
    'REVIEW',         -- En revisión
    'BLOCKED',        -- Bloqueada
    'DONE',           -- Completada
    'CANCELLED'       -- Cancelada
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Crear enum de prioridad de tarea
DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Crear tabla de tareas
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  
  -- Vinculación con otras entidades (al menos una debe existir)
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  client_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES client_organizations(id) ON DELETE SET NULL,
  
  -- Jerarquía (subtareas)
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Información básica
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status task_status DEFAULT 'TODO',
  priority task_priority DEFAULT 'MEDIUM',
  
  -- Asignación
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  assigned_users UUID[], -- Array de user IDs para múltiples asignados
  
  -- Fechas
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Estimación y seguimiento
  estimated_hours DECIMAL(10, 2),
  actual_hours DECIMAL(10, 2) DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  -- Bloqueo
  is_blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  
  -- Metadata
  tags VARCHAR(50)[],
  custom_fields JSONB DEFAULT '{}',
  attachments JSONB DEFAULT '[]', -- Array de {name, url, type, size}
  
  -- Checklist embebida (opcional)
  checklist JSONB DEFAULT '[]', -- Array de {text, completed, order}
  
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: al menos una relación debe existir
  CONSTRAINT at_least_one_relation CHECK (
    project_id IS NOT NULL OR 
    deal_id IS NOT NULL OR 
    client_id IS NOT NULL OR 
    organization_id IS NOT NULL
  )
);

-- Índices para performance
CREATE INDEX idx_tasks_my_company ON tasks(my_company_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_deal ON tasks(deal_id);
CREATE INDEX idx_tasks_client ON tasks(client_id);
CREATE INDEX idx_tasks_organization ON tasks(organization_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_tags ON tasks USING GIN(tags);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);

-- Trigger para updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar completed_at cuando cambia a DONE
CREATE OR REPLACE FUNCTION update_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'DONE' AND OLD.status != 'DONE' THEN
    NEW.completed_at := NOW();
    NEW.progress_percentage := 100;
  ELSIF NEW.status != 'DONE' AND OLD.status = 'DONE' THEN
    NEW.completed_at := NULL;
  END IF;
  
  IF NEW.status = 'BLOCKED' THEN
    NEW.is_blocked := true;
  ELSIF NEW.status != 'BLOCKED' THEN
    NEW.is_blocked := false;
    NEW.blocked_reason := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_task_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_completed_at();

-- Trigger para validar jerarquía (prevenir ciclos, máximo 5 niveles)
CREATE OR REPLACE FUNCTION validate_task_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
  v_level INTEGER;
  v_current_id UUID;
BEGIN
  IF NEW.parent_task_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Prevenir auto-referencia
  IF NEW.id = NEW.parent_task_id THEN
    RAISE EXCEPTION 'Una tarea no puede ser su propia padre';
  END IF;
  
  -- Verificar ciclos y contar niveles
  v_level := 0;
  v_current_id := NEW.parent_task_id;
  
  WHILE v_current_id IS NOT NULL AND v_level < 10 LOOP
    v_level := v_level + 1;
    
    -- Verificar ciclo
    IF v_current_id = NEW.id THEN
      RAISE EXCEPTION 'Ciclo detectado en la jerarquía de tareas';
    END IF;
    
    -- Máximo 5 niveles
    IF v_level > 5 THEN
      RAISE EXCEPTION 'Máximo 5 niveles de subtareas permitidos';
    END IF;
    
    -- Siguiente nivel
    SELECT parent_task_id INTO v_current_id
    FROM tasks
    WHERE id = v_current_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_task_hierarchy
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION validate_task_hierarchy();

-- Habilitar RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Política: Ver tareas de sus empresas
CREATE POLICY "Users can view tasks of their companies"
ON tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = tasks.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Crear tareas
CREATE POLICY "Users can create tasks"
ON tasks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = tasks.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Actualizar tareas
CREATE POLICY "Users can update tasks"
ON tasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = tasks.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Eliminar tareas
CREATE POLICY "Users can delete tasks"
ON tasks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = tasks.my_company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Función para obtener jerarquía de tareas (con subtareas)
CREATE OR REPLACE FUNCTION get_task_hierarchy(
  p_task_id UUID
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  status task_status,
  priority task_priority,
  level INTEGER,
  path UUID[]
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE task_tree AS (
    -- Nodo raíz
    SELECT 
      t.id,
      t.title,
      t.status,
      t.priority,
      0 as level,
      ARRAY[t.id] as path
    FROM tasks t
    WHERE t.id = p_task_id
    
    UNION ALL
    
    -- Subtareas
    SELECT 
      t.id,
      t.title,
      t.status,
      t.priority,
      tt.level + 1,
      tt.path || t.id
    FROM tasks t
    INNER JOIN task_tree tt ON t.parent_task_id = tt.id
  )
  SELECT * FROM task_tree ORDER BY level, title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de tareas
CREATE OR REPLACE FUNCTION get_tasks_stats(
  p_my_company_id UUID,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  status task_status,
  count BIGINT,
  total_estimated_hours DECIMAL,
  total_actual_hours DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.status,
    COUNT(*)::BIGINT,
    COALESCE(SUM(t.estimated_hours), 0) as total_estimated_hours,
    COALESCE(SUM(t.actual_hours), 0) as total_actual_hours
  FROM tasks t
  WHERE t.my_company_id = p_my_company_id
  AND (p_project_id IS NULL OR t.project_id = p_project_id)
  GROUP BY t.status
  ORDER BY 
    CASE t.status
      WHEN 'TODO' THEN 1
      WHEN 'IN_PROGRESS' THEN 2
      WHEN 'REVIEW' THEN 3
      WHEN 'BLOCKED' THEN 4
      WHEN 'DONE' THEN 5
      WHEN 'CANCELLED' THEN 6
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener tareas vencidas
CREATE OR REPLACE FUNCTION get_overdue_tasks(
  p_my_company_id UUID
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  due_date DATE,
  days_overdue INTEGER,
  assigned_to UUID,
  project_id UUID,
  priority task_priority
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.due_date,
    (CURRENT_DATE - t.due_date)::INTEGER as days_overdue,
    t.assigned_to,
    t.project_id,
    t.priority
  FROM tasks t
  WHERE t.my_company_id = p_my_company_id
  AND t.due_date < CURRENT_DATE
  AND t.status NOT IN ('DONE', 'CANCELLED')
  ORDER BY t.due_date ASC, t.priority DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger de auditoría para tasks
CREATE OR REPLACE FUNCTION audit_tasks_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object(
      'title', NEW.title,
      'status', NEW.status,
      'priority', NEW.priority,
      'assigned_to', NEW.assigned_to
    );
    
    PERFORM log_audit(
      NEW.my_company_id,
      NEW.created_by,
      'task',
      NEW.id,
      'CREATE'::audit_action,
      jsonb_build_object('after', v_changes)
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_changes := jsonb_build_object(
      'before', jsonb_build_object('title', OLD.title, 'status', OLD.status, 'assigned_to', OLD.assigned_to),
      'after', jsonb_build_object('title', NEW.title, 'status', NEW.status, 'assigned_to', NEW.assigned_to)
    );
    
    -- Log especial para cambio de estado
    IF OLD.status != NEW.status THEN
      PERFORM log_audit(
        NEW.my_company_id,
        auth.uid(),
        'task',
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
      'task',
      NEW.id,
      'UPDATE'::audit_action,
      v_changes
    );
    
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object(
      'title', OLD.title,
      'status', OLD.status
    );
    
    PERFORM log_audit(
      OLD.my_company_id,
      auth.uid(),
      'task',
      OLD.id,
      'DELETE'::audit_action,
      jsonb_build_object('before', v_changes)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_audit_tasks
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION audit_tasks_changes();

-- Comentarios
COMMENT ON TABLE tasks IS 'Tareas del sistema con soporte para subtareas recursivas';
COMMENT ON COLUMN tasks.parent_task_id IS 'ID de la tarea padre (para subtareas), máximo 5 niveles';
COMMENT ON COLUMN tasks.assigned_users IS 'Array de IDs de usuarios asignados para colaboración';
COMMENT ON COLUMN tasks.checklist IS 'Checklist embebida en formato JSONB';
COMMENT ON COLUMN tasks.attachments IS 'Archivos adjuntos en formato JSONB';
COMMENT ON FUNCTION get_task_hierarchy IS 'Obtiene la jerarquía completa de una tarea con todas sus subtareas';
COMMENT ON FUNCTION get_tasks_stats IS 'Estadísticas de tareas por estado con horas estimadas y reales';
COMMENT ON FUNCTION get_overdue_tasks IS 'Lista de tareas vencidas con días de retraso';
