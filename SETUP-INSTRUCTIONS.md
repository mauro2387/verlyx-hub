# 🚀 Instrucciones de Configuración - Verlyx Hub

## ⚠️ Estado Actual

El proyecto está **completamente estructurado** pero necesita configuración de servicios externos.

---

## 📋 Pre-requisitos

### 1. **Node.js** (Backend) ✅
- Versión: 18+ 
- Estado: ✅ **Instalado y funcionando**
- Dependencias: ✅ **Instaladas** (843 paquetes)

### 2. **Flutter** (Frontend) ❌
- Versión: 3.24+
- Estado: ❌ **NO instalado**
- Acción requerida: Instalar desde https://flutter.dev

### 3. **Supabase** (Base de datos) ⚠️
- Estado: ⚠️ **Requiere configuración**
- Acción requerida: Ver sección "Configurar Supabase" abajo

---

## 🔧 Configuración Paso a Paso

### Paso 1: Configurar Supabase

#### A. Crear proyecto en Supabase:
1. Ve a https://supabase.com
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto
4. Espera 2-3 minutos a que se aprovisione

#### B. Obtener credenciales:
1. En tu proyecto, ve a **Settings** → **API**
2. Copia estos valores:
   - **Project URL**: Tu URL de Supabase
   - **anon/public key**: Tu clave pública
   - **service_role key**: Tu clave de servicio (¡mantén secreta!)

#### C. Ejecutar el schema de base de datos:
1. En Supabase, ve a **SQL Editor**
2. Abre el archivo: `docs/database-schema.md`
3. Copia todo el contenido SQL
4. Pégalo en el editor SQL de Supabase
5. Haz clic en **Run**
6. ✅ Verás 15 tablas creadas

#### D. Configurar el archivo .env:
1. Abre: `verlyx_hub_backend/.env`
2. Reemplaza estas líneas:
```env
SUPABASE_URL=https://tu-proyecto.supabase.co          ← Tu URL aquí
SUPABASE_ANON_KEY=tu-anon-key-aqui                    ← Tu anon key aquí
SUPABASE_SERVICE_KEY=tu-service-role-key-aqui         ← Tu service key aquí
```

---

### Paso 2: Iniciar el Backend

```powershell
cd verlyx_hub_backend
npm run start:dev
```

**Deberías ver:**
```
[Nest] 12345  - 20/11/2024, 10:30:00   LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 20/11/2024, 10:30:01   LOG [RoutesResolver] CrmController {/api/crm/contacts}
[Nest] 12345  - 20/11/2024, 10:30:01   LOG [NestApplication] Nest application successfully started
```

**Verificar:**
- Swagger UI: http://localhost:3000/api/docs
- Health check: http://localhost:3000/api/health

---

### Paso 3: Instalar Flutter (si aún no lo tienes)

#### Windows:
1. Descarga: https://docs.flutter.dev/get-started/install/windows
2. Extrae el ZIP a `C:\src\flutter`
3. Agrega al PATH: `C:\src\flutter\bin`
4. Reinicia PowerShell
5. Verifica: `flutter doctor`

#### Configuración rápida:
```powershell
# Verificar instalación
flutter doctor

# Aceptar licencias de Android
flutter doctor --android-licenses

# Verificar todo está OK
flutter doctor -v
```

---

### Paso 4: Configurar el Frontend Flutter

#### A. Instalar dependencias:
```powershell
cd verlyx_hub_flutter
flutter pub get
```

#### B. Generar código (Retrofit, etc.):
```powershell
flutter pub run build_runner build --delete-conflicting-outputs
```

#### C. Configurar Supabase en Flutter:
1. Abre: `verlyx_hub_flutter/lib/core/config/app_config.dart`
2. Reemplaza:
```dart
static const supabaseUrl = 'https://tu-proyecto.supabase.co';
static const supabaseAnonKey = 'tu-anon-key-aqui';
```

---

### Paso 5: Ejecutar el Frontend

```powershell
# Ver dispositivos disponibles
flutter devices

# Ejecutar en Chrome (web)
flutter run -d chrome

# O en Windows desktop
flutter run -d windows

# O en Android emulator
flutter run -d emulator-5554
```

---

## 🧪 Probar el Sistema

### 1. Login inicial:
- **Email**: `owner@verlyx.com`
- **Password**: `Verlyx2024!`

### 2. Probar el módulo CRM:
1. En el drawer, selecciona **CRM**
2. Toca el botón **+ Nuevo Contacto**
3. Completa el formulario
4. Guarda
5. Verifica que aparece en la lista
6. Toca el contacto para ver detalles
7. Edita el contacto
8. Prueba los filtros

---

## 🐛 Solución de Problemas

### Error: "supabaseUrl is required"
**Solución**: Configura las variables de entorno en `.env` (ver Paso 1D)

### Error: "flutter: command not found"
**Solución**: Instala Flutter y agrégalo al PATH (ver Paso 3)

### Error: "Could not resolve host: supabase.co"
**Solución**: Verifica tu conexión a internet

### Error de compilación en Flutter
**Solución**: 
```powershell
flutter clean
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

### Backend no inicia
**Solución**:
```powershell
cd verlyx_hub_backend
rm -r node_modules
rm package-lock.json
npm install
npm run start:dev
```

---

## 📚 Documentación Adicional

Una vez configurado todo, consulta:

- **Arquitectura**: `docs/architecture.md`
- **Base de datos**: `docs/database-schema.md`
- **CRM completo**: `docs/CRM-MODULE-COMPLETE.md`
- **Pagos**: `docs/payments-module.md`
- **IA**: `docs/ai-module.md`
- **Guía rápida**: `docs/QUICKSTART.md`
- **Comandos**: `docs/COMMANDS.md`

---

## ✅ Checklist de Configuración

- [ ] Node.js instalado (v18+)
- [ ] Dependencias del backend instaladas (`npm install`)
- [ ] Cuenta de Supabase creada
- [ ] Proyecto de Supabase creado
- [ ] Schema SQL ejecutado en Supabase
- [ ] Variables de entorno configuradas en `.env`
- [ ] Backend iniciando correctamente
- [ ] Swagger UI accesible en http://localhost:3000/api/docs
- [ ] Flutter instalado (v3.24+)
- [ ] Dependencias de Flutter instaladas (`flutter pub get`)
- [ ] Código generado con build_runner
- [ ] Frontend ejecutándose
- [ ] Login exitoso con credenciales de prueba
- [ ] Módulo CRM funcionando

---

## 🎯 Siguiente Paso

Una vez completada la configuración, puedes:

1. **Probar el CRM** completamente funcional
2. **Implementar más módulos** usando el CRM como referencia
3. **Integrar MercadoPago** para pagos
4. **Agregar OpenAI** para el asistente IA
5. **Desarrollar los módulos de proyectos** (PulsarMoon/Verlyx)

---

## 🆘 ¿Necesitas Ayuda?

Si encuentras problemas:

1. Revisa los logs del backend en la terminal
2. Usa `flutter doctor` para diagnosticar problemas de Flutter
3. Verifica que todas las variables de entorno estén correctas
4. Consulta la documentación en la carpeta `docs/`

---

**¡Estás a solo unos pasos de tener Verlyx Hub funcionando! 🚀**
