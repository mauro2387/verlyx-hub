# Sistema de Notificaciones - Verlyx Hub

## 🚀 Descripción

Sistema completo de notificaciones conectado a Supabase con funciones en tiempo real, filtros avanzados y notificaciones tipo badge en el sidebar.

## ✨ Características

- **Notificaciones en tiempo real**: Actualizaciones instantáneas usando Supabase Realtime
- **10 tipos de notificaciones**: task, project, payment, deal, system, reminder, mention, contact, deadline, message
- **Badge de contador**: Indicador visual de notificaciones sin leer en el sidebar
- **Filtros avanzados**: Por tipo y estado (leídas/sin leer)
- **Modal de detalles**: Vista completa de cada notificación
- **Acciones rápidas**: Marcar como leída, eliminar, ver detalle
- **API REST completa**: Endpoints para todas las operaciones CRUD
- **Helpers predefinidos**: Plantillas para crear notificaciones comunes

## 📦 Archivos Creados

### Base de Datos
```
supabase/
├── notifications.sql          # Schema, RLS, funciones helper
└── sample_notifications.sql   # Datos de prueba
```

### Backend (API Routes)
```
src/app/api/notifications/
├── route.ts                   # GET (list) y POST (create)
├── [id]/route.ts             # PATCH (mark read) y DELETE
├── mark-all-read/route.ts    # POST (mark all as read)
└── count/route.ts            # GET (unread count)
```

### Frontend
```
src/app/notifications/page.tsx    # Página principal (100% conectada a DB)
src/lib/notifications.ts          # Helper functions y templates
src/components/layout/sidebar.tsx # Badge de contador actualizado
```

## 🗄️ Tabla de Notificaciones

### Estructura
```sql
notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  type VARCHAR(50),                    -- task, project, payment, etc.
  title VARCHAR(255),
  message TEXT,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  action_url TEXT,                     -- Link para "Ver detalle"
  related_type VARCHAR(50),            -- Tipo de entidad relacionada
  related_id UUID,                     -- ID de entidad relacionada
  related_name VARCHAR(255),           -- Nombre para mostrar
  metadata JSONB DEFAULT '{}',         -- Datos extra
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

### Índices
- `user_id` + `read` (para queries de sin leer)
- `user_id` + `created_at` (para ordenamiento)
- `type` (para filtros)

### RLS (Row Level Security)
✅ Los usuarios solo ven sus propias notificaciones  
✅ Solo pueden actualizar/eliminar las propias  
✅ Service role puede crear notificaciones para cualquiera

## 🔧 Setup e Instalación

### 1. Ejecutar SQL en Supabase

```bash
# En Supabase SQL Editor, ejecutar en orden:
1. supabase/notifications.sql           # Crea tablas, RLS, funciones
2. supabase/sample_notifications.sql    # (Opcional) Datos de prueba
```

**⚠️ Importante**: En `sample_notifications.sql`, reemplazar `'YOUR_USER_ID_HERE'` con tu user ID real:

```sql
-- Obtener tu user ID:
SELECT id, email FROM auth.users;

-- Copiar el UUID y pegarlo en la línea 4 de sample_notifications.sql
DECLARE
  user_uuid UUID := 'tu-uuid-aqui';
```

### 2. Variables de Entorno

Asegurate de tener en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

### 3. Instalar dependencias (si es necesario)

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 4. Reiniciar servidor

```bash
npm run dev
```

## 📖 Uso

### Crear Notificación desde el Código

#### Opción 1: Usar Templates Predefinidos

```typescript
import { NotificationTemplates } from '@/lib/notifications';

// Tarea asignada
await NotificationTemplates.taskAssigned(
  userId, 
  'Revisar diseños', 
  'Proyecto E-commerce'
);

// Pago recibido
await NotificationTemplates.paymentReceived(
  userId,
  5000,
  'USD',
  'ACME Corp'
);

// Deadline próximo
await NotificationTemplates.projectDeadline(
  userId,
  'Sistema CRM',
  3 // días restantes
);

// Usuario mencionado
await NotificationTemplates.userMentioned(
  userId,
  'Carlos López',
  'comentario en tarea "Implementar API"'
);

// Recordatorio personalizado
await NotificationTemplates.reminder(
  userId,
  'Reunión programada',
  'Llamada con TechStart Inc en 1 hora',
  '/calendar'
);
```

#### Opción 2: Crear Manualmente

```typescript
import { createNotification } from '@/lib/notifications';

await createNotification({
  userId: 'user-uuid-here',
  type: 'task',
  title: 'Nueva tarea asignada',
  message: 'Se te asignó la tarea "Configurar servidor"',
  actionUrl: '/tasks/123',
  relatedType: 'task',
  relatedId: 'task-uuid',
  relatedName: 'Configurar servidor',
  metadata: {
    priority: 'high',
    projectId: 'project-uuid',
  },
});
```

### Desde API Directamente

```bash
# Crear notificación
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "type": "payment",
    "title": "Pago recibido",
    "message": "Pago de USD 1,000",
    "action_url": "/payments"
  }'

# Listar notificaciones
curl "http://localhost:3000/api/notifications?user_id=user-uuid&read=false"

# Marcar como leída
curl -X PATCH http://localhost:3000/api/notifications/notif-uuid \
  -H "Content-Type: application/json" \
  -d '{ "read": true, "user_id": "user-uuid" }'

# Eliminar
curl -X DELETE "http://localhost:3000/api/notifications/notif-uuid?user_id=user-uuid"

# Marcar todas como leídas
curl -X POST http://localhost:3000/api/notifications/mark-all-read \
  -H "Content-Type: application/json" \
  -d '{ "user_id": "user-uuid" }'

# Contar sin leer
curl "http://localhost:3000/api/notifications/count?user_id=user-uuid"
```

## 🎨 Tipos de Notificaciones

| Tipo | Icon | Color | Uso |
|------|------|-------|-----|
| `task` | ✓ | Púrpura | Tareas asignadas, completadas |
| `project` | 📁 | Azul | Updates de proyectos |
| `payment` | 💰 | Verde | Pagos recibidos, pendientes |
| `deal` | 🤝 | Naranja | Cambios en oportunidades |
| `system` | ⚙️ | Gris | Actualizaciones del sistema |
| `reminder` | 🔔 | Amarillo | Recordatorios, próximos eventos |
| `mention` | @ | Índigo | Menciones en comentarios |
| `contact` | 👤 | Teal | Nuevos contactos, updates |
| `deadline` | ⏰ | Rojo | Fechas límite próximas |
| `message` | 💬 | Azul | Mensajes directos |

## 🔄 Realtime Updates

El sistema usa Supabase Realtime para actualizaciones instantáneas:

- **En la página de notificaciones**: Se suscribe a cambios en la tabla
- **En el sidebar**: El badge se actualiza automáticamente cuando hay cambios

No necesitas hacer nada especial, funciona automáticamente.

## 🎯 Funciones Helper en la Base de Datos

### `mark_notification_read(notification_id)`
Marca una notificación como leída

```sql
SELECT mark_notification_read('notif-uuid');
```

### `mark_all_notifications_read()`
Marca todas las notificaciones del usuario como leídas

```sql
SELECT mark_all_notifications_read();
```

### `get_unread_notifications_count()`
Obtiene el conteo de notificaciones sin leer

```sql
SELECT get_unread_notifications_count();
```

### `create_notification(...)`
Crea una nueva notificación (usar desde funciones PL/pgSQL)

```sql
SELECT create_notification(
  'user-uuid',
  'task',
  'Nueva tarea',
  'Descripción de la tarea',
  '/tasks',
  'task',
  'task-uuid',
  'Nombre de la tarea',
  '{"priority": "high"}'::jsonb
);
```

### `cleanup_old_notifications(days_old)`
Limpia notificaciones leídas antiguas

```sql
-- Eliminar notificaciones leídas de hace más de 30 días
SELECT cleanup_old_notifications(30);
```

## 🔐 Seguridad

- **RLS habilitado**: Solo acceso a notificaciones propias
- **Service role**: Solo el backend puede crear notificaciones para otros usuarios
- **Validación de tipos**: CHECK constraint en tipos permitidos
- **Soft delete**: Las notificaciones se eliminan permanentemente (no soft delete por ahora)

## 📊 Filtros y Búsqueda

La página de notificaciones incluye:

- **Por estado**: Todas, Sin leer, Leídas
- **Por tipo**: Filtro por cada tipo de notificación
- **Contadores en vivo**: Actualización automática de contadores
- **Ordenamiento**: Más recientes primero

## 🚨 Próximas Mejoras

- [ ] Preferencias de notificaciones por usuario
- [ ] Notificaciones push del navegador
- [ ] Email notifications
- [ ] Agrupar notificaciones similares
- [ ] Búsqueda y filtros avanzados
- [ ] Archivado de notificaciones
- [ ] Configuración de quiet hours
- [ ] Webhooks para notificaciones externas

## 🐛 Troubleshooting

### No aparecen notificaciones

1. Verifica que ejecutaste `notifications.sql` en Supabase
2. Verifica tu user ID: `SELECT id, email FROM auth.users;`
3. Crea notificaciones de prueba con `sample_notifications.sql`

### Badge no se actualiza

1. Verifica que Supabase Realtime esté habilitado en tu proyecto
2. Chequea la consola del navegador por errores de suscripción
3. Verifica que las variables de entorno estén correctas

### Errores de permisos

1. Verifica que RLS esté habilitado: `SELECT * FROM notifications` debería funcionar
2. Si usas Service Role Key, asegúrate de estar usando el backend (no frontend)

### Error "relation notifications does not exist"

Ejecuta `notifications.sql` en el SQL Editor de Supabase.

## 📝 Ejemplos de Integración

### Crear notificación al completar tarea

```typescript
// En tu archivo de tareas
import { NotificationTemplates } from '@/lib/notifications';

async function completeTask(taskId: string, userId: string) {
  // ... lógica para completar tarea ...
  
  // Notificar
  await NotificationTemplates.taskCompleted(
    userId,
    taskName,
    projectName
  );
}
```

### Notificar sobre pagos

```typescript
// En tu webhook de pagos
await NotificationTemplates.paymentReceived(
  companyOwnerId,
  payment.amount,
  payment.currency,
  payment.client_name
);
```

### Sistema de menciones

```typescript
// Detectar @menciones en comentarios
const mentions = extractMentions(commentText); // ['@user1', '@user2']

for (const mention of mentions) {
  const userId = await getUserIdByUsername(mention);
  await NotificationTemplates.userMentioned(
    userId,
    currentUser.name,
    `comentario en "${taskName}"`
  );
}
```

---

**Creado por**: Verlyx Hub Team  
**Fecha**: Enero 2026  
**Versión**: 1.0.0
