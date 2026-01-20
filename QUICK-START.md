# 🚀 Verlyx Hub - Guía Rápida de Uso

## 📱 Plataformas Soportadas
- ✅ **Windows** (PC Desktop)
- ✅ **Android** (Móvil/Tablet)
- ✅ **iOS** (iPhone/iPad)
- ✅ **Linux** (Desktop)
- ✅ **macOS** (Desktop)
- ❌ **Web** (NO soportado - solo nativo)

---

## 🎯 Inicio Rápido (3 Pasos)

### 1️⃣ Instalar Flutter
```powershell
# Opción A: Con instalador automático
.\install-flutter.bat

# Opción B: Manual (ver FLUTTER-SETUP.md para más opciones)
choco install flutter -y
```

### 2️⃣ Iniciar Backend (en otra terminal)
```powershell
cd verlyx_hub_backend
npm run start:dev
```

### 3️⃣ Ejecutar App
```powershell
# Windows Desktop (RECOMENDADO para desarrollo)
.\run-verlyx.ps1 -Platform windows

# Android (requiere emulador o dispositivo físico)
.\run-verlyx.ps1 -Platform android

# O manualmente:
cd verlyx_hub_flutter
flutter run -d windows
```

---

## 🖥️ Ejecutar en Windows (Desktop)

### Desarrollo
```powershell
.\run-verlyx.ps1 -Platform windows -Mode debug
```

### Producción (más rápido)
```powershell
.\run-verlyx.ps1 -Platform windows -Mode release
```

### Build Standalone
```powershell
.\build-verlyx.ps1 -Target windows
# Ejecutable: verlyx_hub_flutter\build\windows\x64\runner\Release\verlyx_hub.exe
```

---

## 📱 Ejecutar en Android

### Pre-requisitos
```powershell
# Instalar Android Studio
choco install androidstudio -y

# Aceptar licencias
flutter doctor --android-licenses

# Verificar dispositivos
flutter devices
```

### Con Emulador
```powershell
# Listar emuladores
flutter emulators

# Iniciar emulador
flutter emulators --launch <emulator_id>

# Ejecutar app
.\run-verlyx.ps1 -Platform android
```

### Con Dispositivo Físico
1. Habilita **Opciones de Desarrollador** en Android
2. Activa **Depuración USB**
3. Conecta por USB
4. Ejecuta:
```powershell
flutter devices  # Verifica que aparezca tu dispositivo
.\run-verlyx.ps1 -Platform android
```

### Build APK
```powershell
.\build-verlyx.ps1 -Target android-apk
# APKs: verlyx_hub_flutter\build\app\outputs\flutter-apk\
# Instala en cualquier Android copiando el .apk
```

### Build App Bundle (Google Play)
```powershell
.\build-verlyx.ps1 -Target android-aab
# AAB: verlyx_hub_flutter\build\app\outputs\bundle\release\app-release.aab
```

---

## 🍎 Ejecutar en iOS (requiere macOS)

### Desarrollo
```bash
# En macOS
cd verlyx_hub_flutter
flutter run -d ios
```

### Build App Store
```bash
flutter build ios --release
# Luego usa Xcode para subir a App Store
```

---

## 🐧 Ejecutar en Linux

```powershell
# Desarrollo
flutter run -d linux

# Build
.\build-verlyx.ps1 -Target linux
```

---

## 💻 Comandos Útiles

### Ver Dispositivos Disponibles
```powershell
flutter devices
```

### Hot Reload (durante desarrollo)
```
r  # Hot reload
R  # Hot restart
q  # Quit
```

### Limpiar Cache
```powershell
cd verlyx_hub_flutter
flutter clean
flutter pub get
```

### Actualizar Flutter
```powershell
flutter upgrade
```

### Ver Logs en Tiempo Real
```powershell
# Android
adb logcat | Select-String "flutter"

# General
flutter logs
```

---

## 📦 Builds de Producción

### Build Todo
```powershell
.\build-verlyx.ps1 -Target all
```

### Builds Individuales
```powershell
.\build-verlyx.ps1 -Target windows        # Windows .exe
.\build-verlyx.ps1 -Target android-apk    # Android APK
.\build-verlyx.ps1 -Target android-aab    # Android App Bundle
.\build-verlyx.ps1 -Target linux          # Linux binary
```

### Ubicación de Builds
```
verlyx_hub_flutter/build/
├── windows/x64/runner/Release/
│   └── verlyx_hub.exe              (Windows)
├── app/outputs/flutter-apk/
│   ├── app-armeabi-v7a-release.apk (Android ARM 32-bit)
│   ├── app-arm64-v8a-release.apk   (Android ARM 64-bit)
│   └── app-x86_64-release.apk      (Android x64)
└── app/outputs/bundle/release/
    └── app-release.aab              (Google Play Store)
```

---

## 🔧 Solución de Problemas

### "flutter: command not found"
```powershell
# Reabrir PowerShell después de instalar Flutter
# O agregar manualmente al PATH:
$env:PATH += ";C:\flutter\bin"  # O C:\src\flutter\bin
```

### Error de permisos en Android
```powershell
# Revocar y otorgar permisos USB
adb kill-server
adb start-server
adb devices
```

### Backend no conecta
```powershell
# Verificar que backend esté corriendo:
curl http://localhost:3000/api/auth/me

# Si no responde, iniciar:
cd verlyx_hub_backend
npm run start:dev
```

### Build falla en Windows
```powershell
# Instalar Visual Studio 2022 con C++ Desktop Development
choco install visualstudio2022community --package-parameters "--add Microsoft.VisualStudio.Workload.NativeDesktop" -y
```

### App se cierra inmediatamente
```powershell
# Verificar archivo .env existe:
cd verlyx_hub_flutter
cat .env

# Debe contener:
# SUPABASE_URL=...
# SUPABASE_ANON_KEY=...
# API_BASE_URL=...
```

---

## 🎨 Estructura de la App

```
verlyx_hub_flutter/
├── lib/
│   ├── main.dart                    # Punto de entrada
│   ├── core/
│   │   ├── config/                  # Configuración
│   │   ├── router/                  # Navegación
│   │   └── theme/                   # Temas y estilos
│   └── features/
│       ├── auth/                    # Autenticación
│       ├── crm/                     # Gestión de contactos
│       ├── projects/                # Gestión de proyectos
│       ├── payments/                # Pagos y suscripciones
│       ├── ai/                      # Asistente IA
│       └── tasks/                   # Gestión de tareas
├── android/                         # Config Android
├── ios/                             # Config iOS
├── windows/                         # Config Windows
├── linux/                           # Config Linux
└── macos/                           # Config macOS
```

---

## 📊 Estado del Proyecto

### ✅ Completado
- Backend NestJS funcional (puerto 3000)
- Base de datos Supabase (14 tablas)
- App Flutter con Clean Architecture
- Soporte multiplataforma (Windows, Android, iOS, Linux, macOS)
- Módulos: Auth, CRM, Projects, Payments, AI, Tasks

### 🚧 En Progreso
- Instalación de Flutter SDK
- Primera ejecución de la app
- Pruebas en dispositivos reales

### 📋 Próximo
- Implementar módulos restantes
- Tests end-to-end
- Publicar en stores

---

## 📞 Comandos de Ayuda

```powershell
# Ayuda general de Flutter
flutter --help

# Ayuda de run
flutter run --help

# Ayuda de build
flutter build --help

# Estado de instalación
flutter doctor -v

# Ver script de run
Get-Help .\run-verlyx.ps1 -Detailed
```

---

## 🎯 Flujo de Trabajo Típico

```powershell
# 1. Iniciar backend (Terminal 1)
cd verlyx_hub_backend
npm run start:dev

# 2. Ejecutar app (Terminal 2)
cd "C:\Users\mauro\OneDrive\Desktop\Verlyx Hub"
.\run-verlyx.ps1 -Platform windows

# 3. Desarrollar con hot reload
# La app se recarga automáticamente al guardar cambios en lib/

# 4. Cuando esté listo, build de producción
.\build-verlyx.ps1 -Target windows
```

---

## 🌟 Tips de Desarrollo

1. **Hot Reload**: Presiona `r` en la terminal para recargar cambios sin reiniciar
2. **DevTools**: Accede a Flutter DevTools con `flutter pub global activate devtools`
3. **Logs**: Usa `print()` en Dart para debug en la consola
4. **Inspector**: Presiona `i` en la terminal para abrir el widget inspector
5. **Performance**: Usa `-Mode profile` para testing de rendimiento

---

## 🚀 Próximos Pasos

1. ✅ Instalar Flutter: `.\install-flutter.bat`
2. ✅ Iniciar backend: `cd verlyx_hub_backend && npm run start:dev`
3. ✅ Ejecutar app: `.\run-verlyx.ps1 -Platform windows`
4. 🔄 Probar login con tus credenciales de Supabase
5. 🔄 Explorar módulo CRM
6. 🔄 Build de producción cuando esté listo

---

## 📚 Más Información

- **FLUTTER-SETUP.md**: Guía detallada de instalación
- **SETUP-INSTRUCTIONS.md**: Configuración completa del proyecto
- **docs/QUICKSTART.md**: Tutorial de 15 minutos
- **docs/API-REFERENCE.md**: Documentación del API
