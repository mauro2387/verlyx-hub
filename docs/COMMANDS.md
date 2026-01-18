# Comandos Útiles - Verlyx Hub

Referencia rápida de comandos para desarrollo diario.

## 🎯 Backend (NestJS)

### Desarrollo

```bash
# Iniciar en modo desarrollo (hot reload)
npm run start:dev

# Iniciar en modo debug
npm run start:debug

# Build para producción
npm run build

# Iniciar producción
npm run start:prod
```

### Testing

```bash
# Ejecutar todos los tests
npm run test

# Tests en modo watch
npm run test:watch

# Tests con coverage
npm run test:cov

# Tests e2e
npm run test:e2e
```

### Code Quality

```bash
# Linter
npm run lint

# Fix lint errors
npm run lint -- --fix

# Formatear código
npm run format
```

### Base de Datos

```bash
# Conectar a PostgreSQL (si usas local)
psql -U postgres -d verlyx_hub

# Backup de DB
pg_dump -U postgres verlyx_hub > backup.sql

# Restaurar backup
psql -U postgres verlyx_hub < backup.sql
```

### Docker

```bash
# Build imagen
docker build -t verlyx-hub-backend .

# Ejecutar contenedor
docker run -p 3000:3000 --env-file .env verlyx-hub-backend

# Ver logs
docker logs <container-id>

# Detener contenedor
docker stop <container-id>
```

## 📱 Frontend (Flutter)

### Desarrollo

```bash
# Instalar dependencias
flutter pub get

# Ejecutar en Windows
flutter run -d windows

# Ejecutar en Android
flutter run -d android

# Ejecutar en iOS
flutter run -d ios

# Ejecutar en Web
flutter run -d chrome

# Hot restart
# En la terminal donde corre Flutter, presiona 'R'

# Hot reload
# Presiona 'r'
```

### Build

```bash
# Android APK
flutter build apk --release

# Android App Bundle
flutter build appbundle --release

# iOS
flutter build ios --release

# Windows
flutter build windows --release

# Web
flutter build web --release
```

### Testing

```bash
# Ejecutar todos los tests
flutter test

# Tests con coverage
flutter test --coverage

# Tests específicos
flutter test test/features/auth/

# Ver coverage en HTML
genhtml coverage/lcov.info -o coverage/html
# Luego abrir coverage/html/index.html
```

### Code Generation

```bash
# Generar código una vez
flutter pub run build_runner build --delete-conflicting-outputs

# Watch mode (regenera automáticamente)
flutter pub run build_runner watch --delete-conflicting-outputs

# Limpiar archivos generados
flutter pub run build_runner clean
```

### Code Quality

```bash
# Analizar código
flutter analyze

# Formatear código
dart format .

# Fix imports
dart fix --apply
```

### Limpieza

```bash
# Limpiar proyecto
flutter clean

# Limpiar + reinstalar
flutter clean && flutter pub get

# Limpiar todo (incluso build_runner)
flutter clean
rm -rf .dart_tool/
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

### Gestión de Dependencias

```bash
# Actualizar dependencias
flutter pub upgrade

# Ver dependencias outdated
flutter pub outdated

# Agregar paquete
flutter pub add nombre_paquete

# Agregar paquete de dev
flutter pub add --dev nombre_paquete

# Remover paquete
flutter pub remove nombre_paquete
```

## 🗄️ Supabase

### CLI Commands

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Inicializar proyecto local
supabase init

# Iniciar Supabase local
supabase start

# Detener Supabase local
supabase stop

# Ver status
supabase status

# Crear migration
supabase migration new nombre_de_migracion

# Aplicar migrations
supabase db push

# Reset DB
supabase db reset
```

### SQL Queries Útiles

```sql
-- Ver todos los usuarios
SELECT * FROM auth.users;

-- Ver perfiles
SELECT * FROM profiles;

-- Ver contactos recientes
SELECT * FROM contacts ORDER BY created_at DESC LIMIT 10;

-- Estadísticas de pagos
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount) as total
FROM payments
GROUP BY status;

-- Proyectos activos
SELECT * FROM projects WHERE status = 'active';

-- Ver conversaciones IA recientes
SELECT 
  c.*,
  COUNT(m.id) as message_count
FROM ai_conversations c
LEFT JOIN ai_messages m ON m.conversation_id = c.id
GROUP BY c.id
ORDER BY c.created_at DESC
LIMIT 10;
```

## 🔄 Git

```bash
# Ver estado
git status

# Crear nueva rama
git checkout -b feature/nombre-feature

# Commit
git add .
git commit -m "feat: descripción del cambio"

# Push
git push origin nombre-rama

# Pull latest
git pull origin main

# Merge main en tu rama
git checkout tu-rama
git merge main

# Ver cambios
git diff

# Ver log
git log --oneline --graph --all
```

### Convenciones de Commits

```bash
# Formato: tipo(scope): descripción

# Tipos:
feat:     # Nueva funcionalidad
fix:      # Bug fix
docs:     # Cambios en documentación
style:    # Formato, punto y coma, etc (no cambios de código)
refactor: # Refactorización de código
test:     # Agregar o actualizar tests
chore:    # Mantenimiento, dependencias, etc

# Ejemplos:
git commit -m "feat(auth): agregar login con Google"
git commit -m "fix(payments): corregir webhook de MercadoPago"
git commit -m "docs(readme): actualizar guía de instalación"
```

## 🐳 Docker Compose

Si usas docker-compose (crear archivo `docker-compose.yml`):

```bash
# Iniciar todos los servicios
docker-compose up

# Iniciar en background
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Rebuild imágenes
docker-compose build

# Restart un servicio específico
docker-compose restart backend
```

## 📊 Herramientas de Desarrollo

### VS Code

```bash
# Abrir proyecto
code .

# Abrir archivo específico
code ruta/al/archivo.dart

# Instalar extensiones recomendadas
code --install-extension Dart-Code.flutter
code --install-extension Dart-Code.dart-code
```

### Postman / Thunder Client

```bash
# Importar colección
# Usar el archivo .postman_collection.json del proyecto

# Endpoints para probar:
POST http://localhost:3000/api/auth/login
GET  http://localhost:3000/api/auth/me
GET  http://localhost:3000/api/crm/contacts
POST http://localhost:3000/api/payments/payment-links
```

## 🔍 Debugging

### Backend (NestJS)

```bash
# Iniciar con debugger
npm run start:debug

# Luego en VS Code:
# 1. Ir a Run and Debug (Ctrl+Shift+D)
# 2. Seleccionar "Attach to Node"
# 3. F5 para iniciar debugger
```

### Flutter

```bash
# Ejecutar en debug mode
flutter run

# Ver logs
flutter logs

# Inspeccionar widgets (DevTools)
flutter pub global activate devtools
flutter pub global run devtools

# Profile performance
flutter run --profile
```

## 📈 Monitoreo

### Ver logs en tiempo real

**Backend:**
```bash
# Logs completos
npm run start:dev | tee logs.txt

# Solo errores
npm run start:dev 2>&1 | grep ERROR
```

**Flutter:**
```bash
# Logs de Flutter
flutter logs

# Logs de Android (si usas Android)
adb logcat
```

### Verificar salud del sistema

```bash
# Health check del backend
curl http://localhost:3000/api/health

# Ver uso de recursos
docker stats

# Ver procesos de Node
ps aux | grep node
```

## 🚀 Deploy

### Backend

```bash
# Build
npm run build

# Copiar archivos al servidor
scp -r dist/ user@server:/path/to/app/

# Iniciar en servidor (con PM2)
pm2 start dist/main.js --name verlyx-hub-backend
pm2 save
pm2 startup
```

### Flutter

```bash
# Android - Generar release
flutter build apk --release

# El APK estará en:
# build/app/outputs/flutter-apk/app-release.apk

# Windows
flutter build windows --release

# Los archivos estarán en:
# build/windows/runner/Release/
```

## 🛠️ Mantenimiento

```bash
# Actualizar Node
nvm install 20
nvm use 20

# Actualizar Flutter
flutter upgrade

# Actualizar npm
npm install -g npm@latest

# Limpiar cache de npm
npm cache clean --force

# Limpiar cache de Flutter
flutter clean
flutter pub cache repair
```

## 📝 Notas

- Siempre hacer `git pull` antes de empezar a trabajar
- Correr tests antes de hacer commit
- Revisar logs del backend cuando algo falle en Flutter
- Usar hot reload ('r') en lugar de hot restart ('R') siempre que sea posible
- Hacer commits pequeños y frecuentes

---

**Pro tip**: Crea alias en tu shell para comandos frecuentes:

```bash
# En .bashrc o .zshrc:
alias frun='flutter run -d windows'
alias ftest='flutter test'
alias fclean='flutter clean && flutter pub get'
alias backend='cd verlyx_hub_backend && npm run start:dev'
```
