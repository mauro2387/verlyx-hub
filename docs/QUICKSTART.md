# Guía de Inicio Rápido - Verlyx Hub

Esta guía te ayudará a levantar el proyecto Verlyx Hub en tu entorno local en menos de 15 minutos.

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- ✅ **Node.js 20+** ([Descargar](https://nodejs.org/))
- ✅ **Flutter 3.24+** ([Instalar](https://docs.flutter.dev/get-started/install))
- ✅ **Git** ([Descargar](https://git-scm.com/))
- ✅ **VS Code** o tu editor preferido
- ✅ **Cuenta de Supabase** ([Crear cuenta gratis](https://supabase.com))

## 🚀 Paso 1: Clonar el Repositorio

```bash
git clone <repository-url>
cd verlyx-hub
```

## 🗄️ Paso 2: Configurar Supabase

### 2.1. Crear Proyecto en Supabase

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Crea un nuevo proyecto
3. Guarda las credenciales:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`

### 2.2. Ejecutar Script de Base de Datos

1. En Supabase, ve a **SQL Editor**
2. Copia y pega el contenido de `docs/database-schema.md` (sección SQL)
3. Ejecuta el script completo

### 2.3. Crear Usuario de Prueba

En el SQL Editor de Supabase:

```sql
-- Crear usuario en auth.users (hazlo desde la UI de Supabase Auth)
-- O usa el SQL Editor:

INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  'owner@verlyx.com',
  crypt('Password123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- Luego crea el perfil
INSERT INTO profiles (id, email, full_name, role)
SELECT 
  id,
  'owner@verlyx.com',
  'Owner Verlyx',
  'owner'
FROM auth.users
WHERE email = 'owner@verlyx.com';
```

**Nota**: Es más fácil crear el usuario desde la UI de Supabase:
- Ve a **Authentication** → **Users** → **Add user**
- Email: `owner@verlyx.com`
- Password: `Password123!`
- Auto-confirm: Sí

## 🔧 Paso 3: Configurar Backend

```bash
# Ir a la carpeta del backend
cd verlyx_hub_backend

# Instalar dependencias
npm install

# Copiar archivo de entorno
cp .env.example .env
```

### 3.1. Editar `.env`

Abre `verlyx_hub_backend/.env` y configura:

```env
# Supabase (copiar desde tu proyecto)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_KEY=eyJxxx...

# JWT (genera claves aleatorias)
JWT_SECRET=tu-clave-secreta-super-segura-cambiala
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=otra-clave-secreta-diferente
JWT_REFRESH_EXPIRES_IN=7d

# App
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# OpenAI (opcional para MVP, conseguir en https://platform.openai.com)
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_MODEL=gpt-4-turbo

# MercadoPago (opcional para MVP, conseguir en https://www.mercadopago.com.uy/developers)
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx
MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx
MERCADOPAGO_WEBHOOK_SECRET=tu-webhook-secret

# CORS
CORS_ORIGIN=http://localhost:*,http://localhost:3000
```

### 3.2. Iniciar Backend

```bash
# Modo desarrollo (con hot reload)
npm run start:dev
```

✅ **Verificar**: Abre http://localhost:3000/api/docs - Deberías ver la documentación Swagger

## 📱 Paso 4: Configurar Flutter

```bash
# Ir a la carpeta de Flutter
cd ../verlyx_hub_flutter

# Instalar dependencias
flutter pub get

# Copiar archivo de entorno
cp .env.example .env
```

### 4.1. Editar `.env`

Abre `verlyx_hub_flutter/.env` y configura:

```env
# API (debe coincidir con el backend)
API_BASE_URL=http://localhost:3000/api

# Supabase (mismo que el backend)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...

# App
APP_NAME=Verlyx Hub
APP_ENV=development
```

### 4.2. Generar Código

```bash
# Generar código para json_serializable, retrofit, etc.
flutter pub run build_runner build --delete-conflicting-outputs
```

### 4.3. Ejecutar App

#### Opción A: Windows Desktop

```bash
flutter run -d windows
```

#### Opción B: Android (con emulador o dispositivo)

```bash
flutter run -d android
```

#### Opción C: Web

```bash
flutter run -d chrome
```

## 🎉 Paso 5: Probar la Aplicación

1. La app debería abrirse en la pantalla de **Splash**
2. Automáticamente te redirigirá a **Login**
3. Ingresa las credenciales:
   - **Email**: `owner@verlyx.com`
   - **Password**: `Password123!`
4. Deberías ver el **Dashboard**

## 🐛 Troubleshooting

### Error: "Cannot connect to backend"

**Solución**:
- Verifica que el backend esté corriendo en `http://localhost:3000`
- En Android emulador, usa `http://10.0.2.2:3000/api` en lugar de `localhost`
- Revisa los logs del backend: `npm run start:dev`

### Error: "Invalid credentials" al hacer login

**Solución**:
- Verifica que el usuario exista en Supabase Auth
- Asegúrate de que el email esté confirmado
- Revisa que el perfil se haya creado en la tabla `profiles`

### Error de build en Flutter

**Solución**:
```bash
flutter clean
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

### Errores de TypeScript en Backend

**Solución**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Backend no encuentra módulos

**Solución**: Los módulos stub están vacíos. No te preocupes, es normal en esta fase inicial.

## 📁 Estructura del Proyecto

```
verlyx-hub/
├── verlyx_hub_backend/      # Backend NestJS
│   ├── src/
│   │   ├── modules/         # Módulos funcionales
│   │   ├── common/          # Utilidades compartidas
│   │   └── main.ts
│   └── package.json
│
├── verlyx_hub_flutter/      # Frontend Flutter
│   ├── lib/
│   │   ├── core/            # Configuración base
│   │   ├── features/        # Módulos por feature
│   │   └── main.dart
│   └── pubspec.yaml
│
├── docs/                    # Documentación
│   ├── architecture.md
│   ├── database-schema.md
│   ├── payments-module.md
│   └── ai-module.md
│
└── README.md
```

## 🔄 Próximos Pasos

### Fase 1: Completar CRM

1. Implementar endpoints de CRM en backend
2. Crear pantallas de lista y detalle en Flutter
3. Agregar funcionalidad de crear/editar contactos

### Fase 2: Módulo de Proyectos

1. Endpoints CRUD de proyectos
2. Gestión de tareas
3. Vistas de proyectos por negocio

### Fase 3: Integración de Pagos

1. Configurar MercadoPago
2. Implementar generación de links
3. Setup de webhooks

### Fase 4: Asistente IA

1. Configurar OpenAI
2. Implementar chat básico
3. Generación de propuestas

## 📚 Recursos Adicionales

- [Documentación de NestJS](https://docs.nestjs.com)
- [Documentación de Flutter](https://docs.flutter.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Clean Architecture en Flutter](https://resocoder.com/flutter-clean-architecture-tdd/)

## 💬 Soporte

Si encuentras problemas:

1. Revisa esta guía nuevamente
2. Consulta la documentación en `docs/`
3. Revisa los logs del backend y Flutter
4. Contacta al equipo de desarrollo

---

**¡Feliz desarrollo! 🚀**
