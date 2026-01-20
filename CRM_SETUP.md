# Configuración Completa del Módulo CRM

## ✅ Estado Actual
El módulo CRM está **completamente implementado** con las siguientes funcionalidades:
- ✅ Listar contactos con paginación infinita
- ✅ Crear nuevos contactos
- ✅ Editar contactos existentes
- ✅ Eliminar contactos
- ✅ Ver detalles completos de contactos
- ✅ Filtrar por tipo y estado
- ✅ Buscar contactos

## 📋 Pasos para Activar el CRM

### 1. Configurar la Base de Datos en Supabase

Ve a tu dashboard de Supabase y ejecuta el script SQL ubicado en:
```
verlyx_hub_backend/supabase/setup_contacts_table.sql
```

Este script:
- Crea la tabla `contacts` con todos los campos necesarios
- Configura los índices para mejor rendimiento
- Establece las políticas RLS (Row Level Security) para permitir CRUD
- Actualiza tu usuario a rol `admin`

**Importante:** Reemplaza `test@gmail.com` en la última línea del script con tu email real.

### 2. Verificar el Backend

El backend ya está completamente configurado en:
- **Controller:** `src/modules/crm/contacts.controller.ts`
- **Service:** `src/modules/crm/contacts.service.ts`

**Endpoints disponibles:**
- `GET /api/crm/contacts` - Listar contactos
- `GET /api/crm/contacts/:id` - Obtener un contacto
- `POST /api/crm/contacts` - Crear contacto
- `PATCH /api/crm/contacts/:id` - Actualizar contacto
- `DELETE /api/crm/contacts/:id` - Eliminar contacto
- `GET /api/crm/contacts/stats` - Estadísticas

### 3. El Frontend ya está listo

La app Flutter tiene todas las pantallas implementadas:
- **Lista de contactos:** `lib/features/crm/presentation/screens/crm_screen.dart`
- **Formulario:** `lib/features/crm/presentation/screens/contact_form_screen.dart`
- **Detalle:** `lib/features/crm/presentation/screens/contact_detail_screen.dart`

## 🚀 Cómo Usar

### Desde la App Móvil:

1. **Ver contactos:** 
   - Ve a la pantalla CRM desde el dashboard
   - Desliza hacia abajo para refrescar
   - Scroll infinito para cargar más

2. **Crear contacto:**
   - Toca el botón "Nuevo Contacto" (floating action button)
   - Completa el formulario
   - Solo el nombre es obligatorio
   - Selecciona tipo (Lead/Cliente/Socio/Comerciante)
   - Selecciona estado (Nuevo/Contactado/etc.)

3. **Editar contacto:**
   - Toca un contacto para ver detalles
   - Toca el ícono de editar (✏️) en el AppBar
   - Modifica los campos
   - Guarda los cambios

4. **Eliminar contacto:**
   - Ve al detalle del contacto
   - Toca el ícono de eliminar (🗑️)
   - Confirma la eliminación

5. **Filtrar contactos:**
   - Toca el ícono de filtro en la lista
   - Selecciona tipo y/o estado
   - Los resultados se filtran automáticamente

## 🔧 Hot Reload

Después de ejecutar el script SQL:
1. El backend no necesita reinicio (los cambios son en la BD)
2. En la app, simplemente presiona `r` en la terminal de Flutter para hot reload
3. Si hay problemas, presiona `R` para hot restart

## 📝 Tipos y Estados Disponibles

### Tipos de Contacto:
- **Lead:** Prospecto potencial
- **Client:** Cliente activo
- **Partner:** Socio de negocio
- **Merchant:** Comerciante

### Estados del Contacto:
- **Nuevo:** Recién agregado
- **Contactado:** Ya se hizo primer contacto
- **Calificado:** Lead calificado para conversión
- **Negociación:** En proceso de cierre
- **Ganado:** Cliente convertido
- **Perdido:** Oportunidad perdida
- **Inactivo:** Sin actividad reciente

## 🔐 Permisos

Los permisos del CRM se controlan mediante roles:
- **Owner:** Puede crear, editar y eliminar cualquier contacto
- **Admin:** Puede crear y editar contactos
- **User:** Solo puede ver contactos (por defecto)

Tu usuario actual será actualizado a `admin` al ejecutar el script SQL.

## 🐛 Troubleshooting

### Error: "Failed to create contact"
- Verifica que ejecutaste el script SQL
- Confirma que las políticas RLS están activas
- Revisa que el token JWT sea válido

### No se muestran contactos
- La tabla puede estar vacía (es normal la primera vez)
- Crea tu primer contacto usando el botón "+"

### Error 403: Forbidden
- Tu usuario no tiene el rol adecuado
- Ejecuta la última línea del script SQL con tu email

### Backend no responde
- Verifica que `npm run start:dev` está corriendo
- Confirma la URL en `.env.dart` (debe ser tu IP local)

## 📊 Próximos Pasos

Con el CRM funcionando, puedes:
1. Agregar más módulos (Proyectos, Pagos, Tareas, etc.)
2. Implementar notificaciones push
3. Agregar exportación de contactos
4. Integrar con servicios externos (email marketing)
5. Desplegar el backend en la nube (Vercel/Railway)

## 🎉 ¡Listo!

Después de ejecutar el script SQL, el CRM debería funcionar completamente. Prueba creando tu primer contacto desde la app móvil.
