# Verlyx Hub - Super App de Gestión Empresarial

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Flutter](https://img.shields.io/badge/Flutter-3.24+-02569B?logo=flutter)
![NestJS](https://img.shields.io/badge/NestJS-10+-E0234E?logo=nestjs)
![Web](https://img.shields.io/badge/Web-Ready-4285F4?logo=googlechrome)

**Verlyx Hub** es una super-app interna de gestión empresarial que centraliza la administración de múltiples negocios (Verlyx Ecosystem, PulsarMoon) en una sola plataforma multiplataforma con IA integrada y sistema de pagos.

## 🎯 Características Principales

- **CRM Unificado**: Gestión centralizada de clientes, leads, comercios y partners
- **Multi-negocio**: PulsarMoon (agencia), Verlyx Buildings, Verlyx Tourism
- **Sistema de Pagos**: Links de pago y débitos automáticos (MercadoPago)
- **Asistente IA**: GPT-5.1 integrado para propuestas, análisis y automatización
- **Gestión de Proyectos**: Seguimiento de proyectos, tareas y documentos
- **Panel Financiero**: Ingresos, gastos, suscripciones y métricas
- **Multiplataforma**: Android, iOS, Windows, macOS, Linux y **Web** 🌐

## 🏗️ Arquitectura

```
verlyx-hub/
├── verlyx_hub_flutter/     # Frontend Flutter (Clean Architecture + Riverpod)
├── verlyx_hub_backend/     # Backend NestJS + PostgreSQL (Supabase)
├── docs/                   # Documentación técnica y diagramas
└── .github/workflows/      # CI/CD pipelines
```

### Stack Tecnológico

**Frontend:**
- Flutter 3.24+ (Dart)
- Riverpod (State Management)
- go_router (Navegación)
- Clean Architecture + MVVM

**Backend:**
- NestJS 10+ (Node.js/TypeScript)
- Supabase (PostgreSQL + Auth + Storage)
- JWT Authentication
- OpenAPI/Swagger

**Servicios Externos:**
- OpenAI GPT-5.1 (o equivalente)
- MercadoPago API (Pagos)
- Firebase Cloud Messaging (Notificaciones)

## 🚀 Inicio Rápido

### Prerrequisitos

- Flutter SDK 3.24+
- Node.js 20+
- PostgreSQL 15+ o cuenta Supabase
- Git

### Configuración del Proyecto

1. **Clonar el repositorio:**
```bash
git clone <repository-url>
cd verlyx-hub
```

2. **Configurar Backend:**
```bash
cd verlyx_hub_backend
npm install
cp .env.example .env
# Editar .env con tus credenciales
npm run start:dev
```

3. **Configurar Flutter:**
```bash
cd verlyx_hub_flutter
flutter pub get
cp .env.example .env
# Editar .env con tus endpoints
flutter run -d windows  # o android/ios
```

4. **Ejecutar en Web:** 🌐
```bash
cd verlyx_hub_flutter
flutter run -d chrome
```

O usar el script de PowerShell:
```powershell
.\run-web.ps1           # Desarrollo
.\run-web.ps1 -Build    # Build de producción
```

> 📖 Ver [WEB-DEPLOYMENT.md](WEB-DEPLOYMENT.md) para guía completa de despliegue web.

### Variables de Entorno

**Backend (.env):**
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4-turbo

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=your_mp_token
MERCADOPAGO_PUBLIC_KEY=your_mp_public_key

# Environment
NODE_ENV=development
PORT=3000
```

**Flutter (.env):**
```env
API_BASE_URL=http://localhost:3000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

## 📦 Estructura del Proyecto

### Frontend (Flutter)

```
verlyx_hub_flutter/
├── lib/
│   ├── core/                    # Configuración base
│   │   ├── constants/
│   │   ├── theme/
│   │   ├── utils/
│   │   └── network/
│   ├── features/                # Módulos por feature
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── crm/
│   │   ├── pulsarmoon/
│   │   ├── verlyx/
│   │   ├── payments/
│   │   ├── ai_assistant/
│   │   ├── tasks/
│   │   └── documents/
│   └── main.dart
└── test/
```

### Backend (NestJS)

```
verlyx_hub_backend/
├── src/
│   ├── common/                  # Shared utilities
│   ├── config/                  # Configuration
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── crm/
│   │   ├── projects/
│   │   ├── payments/
│   │   ├── ai/
│   │   └── documents/
│   └── main.ts
└── test/
```

## 🗄️ Base de Datos

Ver [docs/database-schema.md](./docs/database-schema.md) para el esquema completo.

**Tablas principales:**
- `profiles` - Usuarios y roles
- `contacts` - CRM (clientes/leads)
- `companies` - Empresas y edificios
- `projects` - Proyectos (PulsarMoon/Verlyx)
- `payments` - Transacciones
- `subscriptions` - Pagos recurrentes
- `ai_conversations` - Historial IA
- `tasks` - Tareas y agenda
- `documents` - Archivos adjuntos

## 🧪 Testing

**Backend:**
```bash
npm run test              # Unit tests
npm run test:e2e          # Integration tests
npm run test:cov          # Coverage
```

**Flutter:**
```bash
flutter test              # Unit & Widget tests
flutter test --coverage   # Con coverage
```

## 🚢 Deployment

### Backend (Producción)

```bash
# Build
npm run build

# Deploy con Docker
docker build -t verlyx-hub-backend .
docker run -p 3000:3000 --env-file .env.prod verlyx-hub-backend
```

### Flutter (Builds)

**Android:**
```bash
flutter build apk --release
flutter build appbundle --release
```

**iOS:**
```bash
flutter build ios --release
```

**Windows:**
```bash
flutter build windows --release
```

## 📚 Documentación

- [Arquitectura del Sistema](./docs/architecture.md)
- [Esquema de Base de Datos](./docs/database-schema.md)
- [API Documentation](./docs/api-docs.md) (Swagger: http://localhost:3000/api)
- [Guía de Contribución](./docs/CONTRIBUTING.md)
- [Módulo de Pagos](./docs/payments-module.md)
- [Módulo de IA](./docs/ai-module.md)

## 🔐 Seguridad

- Autenticación JWT con refresh tokens
- Roles y permisos (Owner, Admin, Staff)
- HTTPS obligatorio en producción
- Tokens de pago nunca almacenados (solo IDs externos)
- Variables sensibles en `.env` (nunca en repo)
- Rate limiting en endpoints críticos

## 🛣️ Roadmap

### Fase 1 - Fundaciones ✅
- [x] Setup de proyectos
- [x] Autenticación básica
- [x] Dashboard inicial

### Fase 2 - Core Modules (En Progreso)
- [ ] CRM completo
- [ ] Módulo PulsarMoon
- [ ] Módulo Verlyx

### Fase 3 - Pagos
- [ ] Links de pago
- [ ] Integración MercadoPago
- [ ] Webhooks

### Fase 4 - IA
- [ ] Servicio AI backend
- [ ] Chat integrado
- [ ] Generación de propuestas

### Fase 5 - Suscripciones
- [ ] Débitos automáticos
- [ ] Gestión de suscripciones

### Fase 6 - Optimización
- [ ] UI escritorio refinada
- [ ] Notificaciones push
- [ ] Tests completos

## 👥 Equipo

- **Owner/Product Manager**: Gestión de negocios
- **Flutter Developer**: Frontend multiplataforma
- **Backend Developer**: NestJS + Integraciones
- **DevOps**: CI/CD y deployment

## 📄 Licencia

Proprietary - Uso interno exclusivo

## 📞 Soporte

Para issues internos y consultas técnicas, contactar al equipo de desarrollo.

---

**Verlyx Hub** - Centralizando el futuro de tus negocios 🚀
