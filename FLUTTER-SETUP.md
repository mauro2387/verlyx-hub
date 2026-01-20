# 📱 Verlyx Hub - Instalación Flutter para Móvil y PC

## 🎯 Objetivo
Instalar Flutter para ejecutar Verlyx Hub en:
- 📱 **Móvil**: Android e iOS
- 💻 **PC**: Windows, macOS, Linux
- ❌ **NO WEB**: Solo aplicaciones nativas

---

## 🚀 Método 1: Instalación Rápida con Chocolatey (RECOMENDADO)

### Paso 1: Instalar Chocolatey
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### Paso 2: Instalar Flutter con Chocolatey
```powershell
choco install flutter -y
```

### Paso 3: Verificar instalación
```powershell
flutter doctor -v
```

---

## 🔧 Método 2: Instalación Manual

### Opción A: Descarga desde el navegador

1. **Descargar Flutter**
   - Ve a: https://docs.flutter.dev/get-started/install/windows
   - Descarga: `flutter_windows_3.24.5-stable.zip` (1.5GB)
   - Guarda en: `C:\src\`

2. **Extraer ZIP**
   ```powershell
   Expand-Archive -Path "C:\src\flutter_windows_3.24.5-stable.zip" -DestinationPath "C:\src" -Force
   ```

3. **Agregar al PATH**
   - Abre "Editar las variables de entorno del sistema"
   - Variables de entorno → Path → Editar
   - Agregar: `C:\src\flutter\bin`
   - Aceptar y reiniciar PowerShell

### Opción B: Git Clone (Más rápido)

```powershell
cd C:\src
git clone https://github.com/flutter/flutter.git -b stable
$env:PATH += ";C:\src\flutter\bin"
[Environment]::SetEnvironmentVariable("Path", $env:PATH, "User")
flutter doctor
```

---

## 📦 Dependencias Necesarias

### Para Windows Desktop
```powershell
# Visual Studio 2022 con C++ Desktop Development
choco install visualstudio2022community --package-parameters "--add Microsoft.VisualStudio.Workload.NativeDesktop" -y
```

### Para Android
```powershell
# Android Studio
choco install androidstudio -y

# Después ejecuta:
flutter doctor --android-licenses
```

### Para iOS (solo en macOS)
```bash
# Xcode desde App Store
xcode-select --install
sudo xcodebuild -license accept
```

---

## ✅ Verificación Post-Instalación

```powershell
# Ver estado de Flutter
flutter doctor -v

# Listar dispositivos disponibles
flutter devices

# Verificar versión
flutter --version
```

---

## 🎨 Configurar Verlyx Hub Flutter

Una vez Flutter esté instalado:

```powershell
cd "C:\Users\mauro\OneDrive\Desktop\Verlyx Hub\verlyx_hub_flutter"

# Instalar dependencias
flutter pub get

# Generar código con build_runner
flutter pub run build_runner build --delete-conflicting-outputs

# Ejecutar en Windows Desktop
flutter run -d windows

# O ejecutar en Android
flutter run -d android

# Ver dispositivos disponibles
flutter devices
```

---

## 🏃‍♂️ Ejecutar la App

### Windows Desktop
```powershell
flutter run -d windows
```

### Android (con emulador o dispositivo físico)
```powershell
# Listar emuladores
flutter emulators

# Iniciar emulador
flutter emulators --launch <emulator_id>

# Ejecutar app
flutter run -d android
```

### Release Build (Producción)

#### Windows
```powershell
flutter build windows --release
# Ejecutable en: build\windows\runner\Release\verlyx_hub.exe
```

#### Android APK
```powershell
flutter build apk --release
# APK en: build\app\outputs\flutter-apk\app-release.apk
```

#### Android App Bundle (Para Play Store)
```powershell
flutter build appbundle --release
# AAB en: build\app\outputs\bundle\release\app-release.aab
```

---

## 🐛 Solución de Problemas

### Error: "flutter not found"
```powershell
# Actualizar PATH en sesión actual
$env:PATH = "C:\src\flutter\bin;$env:PATH"
```

### Error: "Android licenses not accepted"
```powershell
flutter doctor --android-licenses
# Presiona 'y' para aceptar todas
```

### Error: "Visual Studio not found"
```powershell
# Instalar Visual Studio 2022
choco install visualstudio2022community --package-parameters "--add Microsoft.VisualStudio.Workload.NativeDesktop" -y
```

### Performance lenta
```powershell
# Habilitar desktop y limpiar cache
flutter config --enable-windows-desktop
flutter clean
flutter pub get
```

---

## 📊 Estado Actual del Proyecto

### ✅ Completado
- Backend NestJS funcional en puerto 3000
- Base de datos Supabase con 14 tablas
- Código Flutter completo con Clean Architecture
- Módulos: Auth, CRM, Projects, Payments, AI, Tasks

### ⏳ Pendiente
- Instalar Flutter SDK
- Ejecutar app en Windows/Android
- Probar flujo completo de autenticación
- Build de producción

---

## 🎯 Próximos Pasos

1. **Instalar Flutter** (elegir Método 1 o 2)
2. **Ejecutar `flutter doctor`** para verificar
3. **Navegar a `verlyx_hub_flutter`**
4. **`flutter pub get`** para dependencias
5. **`flutter run -d windows`** para probar

---

## 📞 Soporte

Si encuentras errores:
1. Ejecuta `flutter doctor -v`
2. Copia la salida completa
3. Revisa los mensajes de error específicos
4. Consulta: https://docs.flutter.dev/get-started/install
