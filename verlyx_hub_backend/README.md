# Verlyx Hub Backend

API Backend del sistema Verlyx Hub construido con NestJS, Supabase y TypeScript.

## 📋 Requisitos Previos

- Node.js 20+
- npm o yarn
- Cuenta de Supabase
- PostgreSQL 15+ (o usar Supabase)

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Copiar archivo de entorno
cp .env.example .env

# Editar .env con tus credenciales
```

## 🔧 Configuración

Edita el archivo `.env` con tus valores:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m

# OpenAI
OPENAI_API_KEY=sk-your-key

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=your-token
```

## 🏃 Ejecutar

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod

# Debug
npm run start:debug
```

El servidor estará disponible en `http://localhost:3000`

Documentación Swagger: `http://localhost:3000/api/docs`

## 🧪 Testing

```bash
# Tests unitarios
npm run test

# Tests e2e
npm run test:e2e

# Coverage
npm run test:cov
```

## 📁 Estructura

```
src/
├── common/              # Utilidades compartidas
│   ├── decorators/
│   ├── guards/
│   └── supabase/
├── config/              # Configuración
├── modules/             # Módulos funcionales
│   ├── auth/
│   ├── crm/
│   ├── projects/
│   ├── payments/
│   ├── ai/
│   └── ...
└── main.ts
```

## 📝 Scripts

- `npm run start` - Iniciar en modo normal
- `npm run start:dev` - Iniciar en modo desarrollo (hot reload)
- `npm run start:prod` - Iniciar en modo producción
- `npm run build` - Compilar TypeScript
- `npm run test` - Ejecutar tests
- `npm run lint` - Linter
- `npm run format` - Formatear código

## 🐳 Docker

```bash
# Build
docker build -t verlyx-hub-backend .

# Run
docker run -p 3000:3000 --env-file .env verlyx-hub-backend
```

## 📚 Documentación

Ver [docs/](../../docs) en la raíz del proyecto para documentación completa.
