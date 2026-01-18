-- Script to create sample notifications for testing
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from auth.users

DO $$
DECLARE
  user_uuid UUID := 'YOUR_USER_ID_HERE'; -- Change this!
BEGIN
  -- Task notifications
  INSERT INTO notifications (user_id, type, title, message, action_url, related_type, related_name)
  VALUES 
    (user_uuid, 'task', 'Tarea asignada', 'Se te ha asignado la tarea "Revisar diseños UI" en el proyecto E-commerce Premium', '/tasks', 'project', 'E-commerce Premium'),
    (user_uuid, 'task', 'Tarea completada', 'María González completó la tarea "Configurar servidor"', '/tasks', 'task', 'Configurar servidor');

  -- Payment notifications
  INSERT INTO notifications (user_id, type, title, message, action_url, related_type, related_name)
  VALUES 
    (user_uuid, 'payment', 'Pago recibido', 'Se ha recibido un pago de USD 5,000 de ACME Corp', '/payments', 'payment', 'ACME Corp'),
    (user_uuid, 'payment', 'Recordatorio de pago', 'El pago de TechStart Inc está pendiente desde hace 5 días', '/payments', 'client', 'TechStart Inc');

  -- Deal notifications
  INSERT INTO notifications (user_id, type, title, message, action_url, related_type, related_name)
  VALUES 
    (user_uuid, 'deal', 'Oportunidad actualizada', 'La oportunidad "Proyecto App Móvil" ha pasado a etapa de Propuesta', '/deals', 'deal', 'Proyecto App Móvil'),
    (user_uuid, 'deal', 'Nueva oportunidad', 'Se ha creado una nueva oportunidad valorada en USD 15,000', '/deals', 'deal', 'Website Corporativo');

  -- Project notifications
  INSERT INTO notifications (user_id, type, title, message, action_url, related_type, related_name)
  VALUES 
    (user_uuid, 'deadline', 'Deadline próximo', 'El proyecto "Sistema CRM" tiene deadline en 3 días', '/projects', 'project', 'Sistema CRM'),
    (user_uuid, 'project', 'Proyecto iniciado', 'El proyecto "Tienda Online" ha sido iniciado', '/projects', 'project', 'Tienda Online');

  -- Reminder notifications
  INSERT INTO notifications (user_id, type, title, message, action_url)
  VALUES 
    (user_uuid, 'reminder', 'Reunión programada', 'Reunión con TechStart Inc en 1 hora', '/calendar'),
    (user_uuid, 'reminder', 'Seguimiento pendiente', 'Realizar seguimiento a la propuesta enviada a Comercio Global', '/deals');

  -- Mention notifications
  INSERT INTO notifications (user_id, type, title, message, action_url)
  VALUES 
    (user_uuid, 'mention', 'Te mencionaron', 'Carlos López te mencionó en un comentario de la tarea "Implementar API"', '/tasks'),
    (user_uuid, 'mention', 'Comentario nuevo', 'Ana Martínez te mencionó en el proyecto "Website Corporativo"', '/projects');

  -- System notifications
  INSERT INTO notifications (user_id, type, title, message)
  VALUES 
    (user_uuid, 'system', 'Actualización del sistema', 'Verlyx Hub se ha actualizado a la versión 2.5.0 con nuevas funcionalidades', NULL),
    (user_uuid, 'system', 'Mantenimiento programado', 'Habrá mantenimiento programado el próximo domingo de 2:00 AM a 4:00 AM', NULL);

  -- Contact notifications
  INSERT INTO notifications (user_id, type, title, message, action_url, related_type, related_name)
  VALUES 
    (user_uuid, 'contact', 'Nuevo contacto', 'Nuevo contacto agregado: Juan Pérez (desde formulario web)', '/contacts', 'contact', 'Juan Pérez'),
    (user_uuid, 'contact', 'Contacto actualizado', 'La información de ACME Corp ha sido actualizada', '/contacts', 'contact', 'ACME Corp');

  -- Message notifications
  INSERT INTO notifications (user_id, type, title, message, action_url)
  VALUES 
    (user_uuid, 'message', 'Mensaje de María González', 'Hola, necesito revisar los contratos pendientes...', '/messages'),
    (user_uuid, 'message', 'Mensaje de Carlos López', 'Ya terminé la revisión del diseño, ¿podemos hacer...', '/messages');

  RAISE NOTICE 'Created 18 sample notifications for user %', user_uuid;
END $$;

-- To get your user ID, run:
-- SELECT id, email FROM auth.users;
