-- ============================================
-- STEP 1: Crear perfil para el usuario Owner
-- Ejecutar DESPUÉS de crear el usuario en Authentication
-- ============================================

-- Reemplaza 'TU-UUID-AQUI' con el UUID del usuario que acabas de crear
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  '62523c83-af3f-4a4d-8758-5d4da0ea7e5e',  -- UUID del usuario
  'owner@verlyx.com',
  'Mauro - Owner',
  'owner'
);

-- Verificar que se creó correctamente
SELECT * FROM profiles WHERE email = 'owner@verlyx.com';
