-- Eliminar perfil anterior si existe
DELETE FROM profiles WHERE email = 'owner@verlyx.com';

-- Crear perfil con las nuevas credenciales
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  '6b090291-8f5e-4526-b925-75909912607d',
  'maurohernandez5678@gmail.com',
  'Mauro Hernandez',
  'owner'
);

-- Verificar
SELECT * FROM profiles WHERE email = 'maurohernandez5678@gmail.com';
