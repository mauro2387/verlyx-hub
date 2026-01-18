-- =====================================================
-- FASE 1.3: Invitaciones y Equipos
-- Tabla: invitations
-- =====================================================

-- Crear enum de estado de invitación
CREATE TYPE invitation_status AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED'
);

-- Crear tabla de invitaciones
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES my_companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'GUEST',
  token VARCHAR(255) UNIQUE NOT NULL,
  status invitation_status NOT NULL DEFAULT 'PENDING',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  accepted_by UUID REFERENCES auth.users(id),
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_invitations_company_id ON invitations(company_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);

-- Trigger para updated_at
CREATE TRIGGER trigger_update_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_company_users_updated_at();

-- Habilitar RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Política: Los dueños pueden ver invitaciones de sus empresas
CREATE POLICY "Owners can view invitations of their companies"
ON invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = invitations.company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Los dueños pueden crear invitaciones
CREATE POLICY "Owners can create invitations"
ON invitations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = invitations.company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Los dueños pueden actualizar invitaciones
CREATE POLICY "Owners can update invitations"
ON invitations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = invitations.company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Política: Los dueños pueden eliminar invitaciones
CREATE POLICY "Owners can delete invitations"
ON invitations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM my_companies
    WHERE my_companies.id = invitations.company_id
    AND my_companies.owner_user_id = auth.uid()
  )
);

-- Función para generar token único de invitación
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS VARCHAR AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Función para crear invitación
CREATE OR REPLACE FUNCTION create_invitation(
  p_company_id UUID,
  p_email VARCHAR,
  p_role user_role,
  p_invited_by UUID,
  p_message TEXT DEFAULT NULL,
  p_expires_in_days INTEGER DEFAULT 7
)
RETURNS UUID AS $$
DECLARE
  v_invitation_id UUID;
  v_token VARCHAR;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Verificar que el usuario que invita es dueño de la empresa
  IF NOT EXISTS (
    SELECT 1 FROM my_companies
    WHERE id = p_company_id
    AND owner_user_id = p_invited_by
  ) THEN
    RAISE EXCEPTION 'User is not owner of this company';
  END IF;
  
  -- Verificar que el email no sea ya miembro
  IF EXISTS (
    SELECT 1 FROM company_users cu
    JOIN auth.users u ON u.id = cu.user_id
    WHERE cu.company_id = p_company_id
    AND u.email = p_email
    AND cu.is_active = true
  ) THEN
    RAISE EXCEPTION 'User is already a member of this company';
  END IF;
  
  -- Cancelar invitaciones pendientes previas para este email
  UPDATE invitations
  SET status = 'CANCELLED'::invitation_status,
      updated_at = NOW()
  WHERE company_id = p_company_id
  AND email = p_email
  AND status = 'PENDING'::invitation_status;
  
  -- Generar token y fecha de expiración
  v_token := generate_invitation_token();
  v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
  
  -- Crear invitación
  INSERT INTO invitations (
    company_id,
    email,
    role,
    token,
    invited_by,
    message,
    expires_at
  ) VALUES (
    p_company_id,
    p_email,
    p_role,
    v_token,
    p_invited_by,
    p_message,
    v_expires_at
  ) RETURNING id INTO v_invitation_id;
  
  RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para aceptar invitación
CREATE OR REPLACE FUNCTION accept_invitation(
  p_token VARCHAR,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_invitation RECORD;
  v_user_email VARCHAR;
BEGIN
  -- Obtener email del usuario
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;
  
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Buscar invitación
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = p_token
  AND status = 'PENDING'::invitation_status
  AND expires_at > NOW()
  AND email = v_user_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- Verificar que no sea ya miembro
  IF EXISTS (
    SELECT 1 FROM company_users
    WHERE company_id = v_invitation.company_id
    AND user_id = p_user_id
    AND is_active = true
  ) THEN
    -- Actualizar invitación como aceptada
    UPDATE invitations
    SET status = 'ACCEPTED'::invitation_status,
        accepted_by = p_user_id,
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = v_invitation.id;
    
    RETURN true;
  END IF;
  
  -- Agregar usuario a la empresa
  INSERT INTO company_users (
    company_id,
    user_id,
    role,
    invited_by
  ) VALUES (
    v_invitation.company_id,
    p_user_id,
    v_invitation.role,
    v_invitation.invited_by
  );
  
  -- Actualizar invitación como aceptada
  UPDATE invitations
  SET status = 'ACCEPTED'::invitation_status,
      accepted_by = p_user_id,
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = v_invitation.id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para rechazar invitación
CREATE OR REPLACE FUNCTION reject_invitation(
  p_token VARCHAR,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_email VARCHAR;
BEGIN
  -- Obtener email del usuario
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;
  
  -- Actualizar invitación
  UPDATE invitations
  SET status = 'REJECTED'::invitation_status,
      accepted_by = p_user_id,
      updated_at = NOW()
  WHERE token = p_token
  AND status = 'PENDING'::invitation_status
  AND email = v_user_email;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para expirar invitaciones antiguas (ejecutar con cron)
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE invitations
  SET status = 'EXPIRED'::invitation_status,
      updated_at = NOW()
  WHERE status = 'PENDING'::invitation_status
  AND expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
