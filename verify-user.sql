# ============================================
# Verificar y resetear password del usuario
# ============================================

-- 1. Verificar que el usuario existe en auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'owner@verlyx.com';

-- 2. Verificar que el perfil existe
SELECT id, email, full_name, role 
FROM profiles 
WHERE email = 'owner@verlyx.com';

-- 3. Si necesitas resetear el password, ve a:
-- Authentication → Users → owner@verlyx.com → "Send password reset email"
-- O usa "Edit user" para cambiar el password manualmente

-- 4. Alternativamente, elimina y recrea el usuario:
-- DELETE FROM profiles WHERE email = 'owner@verlyx.com';
-- Luego en Authentication UI:
--   - Delete user owner@verlyx.com
--   - Create new user con Email: owner@verlyx.com, Password: Verlyx2024!
--   - Auto Confirm User: ✓
-- Luego ejecuta el INSERT INTO profiles nuevamente
