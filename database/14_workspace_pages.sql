-- =====================================================
-- PHASE 5: WORKSPACE & PAGES (Notion-like Editor)
-- =====================================================
-- Workspace: contenedor de páginas
-- Pages: documentos jerárquicos con bloques
-- Blocks: contenido modular (texto, imagen, tabla, etc.)
-- =====================================================

-- ================== WORKSPACES ==================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  my_company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  
  -- Info básica
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- emoji o nombre de icono
  color VARCHAR(7), -- hex color
  
  -- Configuración
  is_public BOOLEAN DEFAULT FALSE,
  default_page_template VARCHAR(50), -- 'blank', 'task_list', 'meeting_notes', 'wiki'
  
  -- Orden
  "order" INTEGER DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workspaces_company ON workspaces(my_company_id);
CREATE INDEX idx_workspaces_created_by ON workspaces(created_by);

-- ================== PAGES ==================
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_page_id UUID REFERENCES pages(id) ON DELETE CASCADE, -- páginas anidadas
  
  -- Info básica
  title VARCHAR(500) NOT NULL DEFAULT 'Sin título',
  icon VARCHAR(50), -- emoji
  cover_url TEXT, -- imagen de portada
  
  -- Contenido
  -- Los bloques se guardan en tabla separada
  
  -- Configuración
  is_public BOOLEAN DEFAULT FALSE,
  is_template BOOLEAN DEFAULT FALSE,
  template_type VARCHAR(50), -- 'task_list', 'meeting_notes', 'wiki', etc.
  
  -- Permisos
  can_comment BOOLEAN DEFAULT TRUE,
  can_edit_by_others BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  last_edited_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Full-text search
  content_tsv TSVECTOR
);

CREATE INDEX idx_pages_workspace ON pages(workspace_id);
CREATE INDEX idx_pages_parent ON pages(parent_page_id);
CREATE INDEX idx_pages_created_by ON pages(created_by);
CREATE INDEX idx_pages_content_tsv ON pages USING GIN(content_tsv);

-- ================== BLOCKS ==================
CREATE TYPE block_type AS ENUM (
  'paragraph',
  'heading_1',
  'heading_2',
  'heading_3',
  'bulleted_list',
  'numbered_list',
  'todo',
  'toggle',
  'quote',
  'divider',
  'callout',
  'code',
  'image',
  'video',
  'file',
  'embed',
  'table',
  'table_row',
  'bookmark',
  'link_to_page'
);

CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  parent_block_id UUID REFERENCES blocks(id) ON DELETE CASCADE, -- para nested blocks (toggle, listas)
  
  -- Tipo y contenido
  type block_type NOT NULL DEFAULT 'paragraph',
  content JSONB, -- estructura flexible según tipo
  -- Ejemplos:
  -- paragraph: { "text": "...", "formatting": {...} }
  -- heading: { "text": "...", "level": 1 }
  -- todo: { "text": "...", "checked": false }
  -- image: { "url": "...", "caption": "...", "width": 100 }
  -- table: { "columns": 3, "rows": [...] }
  -- code: { "language": "javascript", "code": "..." }
  
  -- Orden y jerarquía
  "order" INTEGER NOT NULL DEFAULT 0,
  indent_level INTEGER DEFAULT 0, -- para listas anidadas
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blocks_page ON blocks(page_id);
CREATE INDEX idx_blocks_parent ON blocks(parent_block_id);
CREATE INDEX idx_blocks_order ON blocks(page_id, "order");
CREATE INDEX idx_blocks_type ON blocks(type);

-- ================== PAGE PERMISSIONS ==================
CREATE TYPE page_permission_level AS ENUM ('view', 'comment', 'edit', 'admin');

CREATE TABLE page_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level page_permission_level NOT NULL DEFAULT 'view',
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_page_permissions_page ON page_permissions(page_id);
CREATE INDEX idx_page_permissions_user ON page_permissions(user_id);

-- ================== PAGE COMMENTS ==================
CREATE TABLE page_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  block_id UUID REFERENCES blocks(id) ON DELETE CASCADE, -- comentario en bloque específico
  parent_comment_id UUID REFERENCES page_comments(id) ON DELETE CASCADE, -- threading
  
  -- Contenido
  content TEXT NOT NULL,
  mentioned_users UUID[], -- array de user IDs mencionados
  
  -- Resolución
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_page_comments_page ON page_comments(page_id);
CREATE INDEX idx_page_comments_block ON page_comments(block_id);
CREATE INDEX idx_page_comments_parent ON page_comments(parent_comment_id);

-- ================== PAGE VERSIONS (History) ==================
CREATE TABLE page_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  
  -- Snapshot del contenido
  title VARCHAR(500),
  blocks_snapshot JSONB, -- array de todos los bloques en ese momento
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_page_versions_page ON page_versions(page_id);
CREATE INDEX idx_page_versions_created_at ON page_versions(created_at DESC);

-- ================== TRIGGERS ==================

-- Actualizar updated_at en workspaces
CREATE OR REPLACE FUNCTION update_workspace_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_workspace_timestamp
BEFORE UPDATE ON workspaces
FOR EACH ROW EXECUTE FUNCTION update_workspace_timestamp();

-- Actualizar updated_at en pages
CREATE TRIGGER trigger_update_page_timestamp
BEFORE UPDATE ON pages
FOR EACH ROW EXECUTE FUNCTION update_workspace_timestamp();

-- Actualizar updated_at en blocks
CREATE TRIGGER trigger_update_block_timestamp
BEFORE UPDATE ON blocks
FOR EACH ROW EXECUTE FUNCTION update_workspace_timestamp();

-- Actualizar content_tsv en pages cuando cambian bloques
CREATE OR REPLACE FUNCTION update_page_tsv()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pages
  SET content_tsv = to_tsvector('spanish', 
    COALESCE(title, '') || ' ' || 
    (SELECT string_agg(content::text, ' ') FROM blocks WHERE page_id = NEW.page_id)
  )
  WHERE id = NEW.page_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_page_tsv_on_block_change
AFTER INSERT OR UPDATE ON blocks
FOR EACH ROW EXECUTE FUNCTION update_page_tsv();

-- Audit log para cambios importantes
CREATE OR REPLACE FUNCTION log_page_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    company_id,
    user_id,
    action,
    entity_type,
    entity_id,
    changes
  ) VALUES (
    (SELECT workspace_id FROM pages WHERE id = NEW.id),
    NEW.last_edited_by,
    TG_OP,
    'page',
    NEW.id,
    jsonb_build_object('title', NEW.title)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_page_changes
AFTER INSERT OR UPDATE ON pages
FOR EACH ROW EXECUTE FUNCTION log_page_changes();

-- ================== ROW LEVEL SECURITY ==================
-- TEMPORALMENTE DESHABILITADO PARA TESTING
-- HABILITAR EN PRODUCCIÓN

-- ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE page_permissions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE page_comments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE page_versions ENABLE ROW LEVEL SECURITY;

-- Workspaces: solo usuarios de la empresa (TEMPORALMENTE DESHABILITADO PARA TESTING)
-- CREATE POLICY workspaces_select_policy ON workspaces
-- FOR SELECT USING (
--   my_company_id IN (
--     SELECT company_id FROM roles WHERE user_id = auth.uid()
--   )
-- );

-- CREATE POLICY workspaces_insert_policy ON workspaces
-- FOR INSERT WITH CHECK (
--   my_company_id IN (
--     SELECT company_id FROM roles WHERE user_id = auth.uid()
--   )
-- );

-- CREATE POLICY workspaces_update_policy ON workspaces
-- FOR UPDATE USING (
--   my_company_id IN (
--     SELECT company_id FROM roles WHERE user_id = auth.uid()
--   )
-- );

-- Pages: según permisos o si es pública (TEMPORALMENTE DESHABILITADO PARA TESTING)
-- CREATE POLICY pages_select_policy ON pages
-- FOR SELECT USING (
--   is_public = TRUE OR
--   workspace_id IN (SELECT id FROM workspaces WHERE my_company_id IN (
--     SELECT company_id FROM roles WHERE user_id = auth.uid()
--   )) OR
--   id IN (SELECT page_id FROM page_permissions WHERE user_id = auth.uid())
-- );

-- CREATE POLICY pages_insert_policy ON pages
-- FOR INSERT WITH CHECK (
--   workspace_id IN (SELECT id FROM workspaces WHERE my_company_id IN (
--     SELECT company_id FROM roles WHERE user_id = auth.uid()
--   ))
-- );

-- CREATE POLICY pages_update_policy ON pages
-- FOR UPDATE USING (
--   created_by = auth.uid() OR
--   id IN (SELECT page_id FROM page_permissions WHERE user_id = auth.uid() AND permission_level IN ('edit', 'admin'))
-- );

-- Blocks: heredan permisos de la página (TEMPORALMENTE DESHABILITADO PARA TESTING)
-- CREATE POLICY blocks_select_policy ON blocks
-- FOR SELECT USING (
--   page_id IN (SELECT id FROM pages)
-- );

-- CREATE POLICY blocks_insert_policy ON blocks
-- FOR INSERT WITH CHECK (
--   page_id IN (SELECT id FROM pages)
-- );

-- CREATE POLICY blocks_update_policy ON blocks
-- FOR UPDATE USING (
--   page_id IN (SELECT id FROM pages WHERE 
--     created_by = auth.uid() OR
--     id IN (SELECT page_id FROM page_permissions WHERE user_id = auth.uid() AND permission_level IN ('edit', 'admin'))
--   )
-- );

-- ================== FUNCIONES AUXILIARES ==================

-- Obtener path completo de una página (breadcrumbs)
CREATE OR REPLACE FUNCTION get_page_path(page_uuid UUID)
RETURNS TABLE(id UUID, title VARCHAR, level INTEGER) AS $$
WITH RECURSIVE page_hierarchy AS (
  SELECT id, title, parent_page_id, 1 AS level
  FROM pages
  WHERE id = page_uuid
  
  UNION ALL
  
  SELECT p.id, p.title, p.parent_page_id, ph.level + 1
  FROM pages p
  JOIN page_hierarchy ph ON p.id = ph.parent_page_id
)
SELECT id, title, level
FROM page_hierarchy
ORDER BY level DESC;
$$ LANGUAGE sql;

-- Obtener todas las subpáginas recursivamente
CREATE OR REPLACE FUNCTION get_subpages(page_uuid UUID)
RETURNS TABLE(id UUID, title VARCHAR, depth INTEGER) AS $$
WITH RECURSIVE subpages AS (
  SELECT id, title, parent_page_id, 0 AS depth
  FROM pages
  WHERE parent_page_id = page_uuid
  
  UNION ALL
  
  SELECT p.id, p.title, p.parent_page_id, s.depth + 1
  FROM pages p
  JOIN subpages s ON p.parent_page_id = s.id
)
SELECT id, title, depth
FROM subpages
ORDER BY depth, title;
$$ LANGUAGE sql;

-- Duplicar página con todos sus bloques
CREATE OR REPLACE FUNCTION duplicate_page(
  source_page_id UUID,
  new_title VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_page_id UUID;
BEGIN
  -- Crear nueva página
  INSERT INTO pages (workspace_id, parent_page_id, title, icon, cover_url, is_public, created_by)
  SELECT workspace_id, parent_page_id, 
         COALESCE(new_title, title || ' (Copia)'), 
         icon, cover_url, is_public, auth.uid()
  FROM pages WHERE id = source_page_id
  RETURNING id INTO new_page_id;
  
  -- Copiar bloques
  INSERT INTO blocks (page_id, parent_block_id, type, content, "order", indent_level, created_by)
  SELECT new_page_id, parent_block_id, type, content, "order", indent_level, auth.uid()
  FROM blocks WHERE page_id = source_page_id;
  
  RETURN new_page_id;
END;
$$ LANGUAGE plpgsql;

-- ================== DATOS DE EJEMPLO (OPCIONAL) ==================

-- Crear workspace por defecto para cada empresa
-- INSERT INTO workspaces (my_company_id, name, description, icon, color)
-- SELECT id, 'Workspace General', 'Documentos y notas del equipo', '📝', '#FF9800'
-- FROM my_companies;

COMMENT ON TABLE workspaces IS 'Espacios de trabajo que contienen páginas (Notion-like)';
COMMENT ON TABLE pages IS 'Páginas/documentos jerárquicos con bloques de contenido';
COMMENT ON TABLE blocks IS 'Bloques modulares de contenido (texto, imagen, tabla, etc.)';
COMMENT ON TABLE page_permissions IS 'Permisos granulares por página y usuario';
COMMENT ON TABLE page_comments IS 'Comentarios en páginas o bloques específicos';
COMMENT ON TABLE page_versions IS 'Historial de versiones de páginas';
