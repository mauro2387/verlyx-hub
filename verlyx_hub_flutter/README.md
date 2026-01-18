# Verlyx Hub Flutter

Frontend multiplataforma de Verlyx Hub construido con Flutter y arquitectura limpia.

## 📋 Requisitos Previos

- Flutter SDK 3.24+
- Dart 3.2+
- Android Studio / Xcode (para mobile)
- Visual Studio 2022 (para Windows desktop)

## 🚀 Instalación

```bash
# Instalar dependencias
flutter pub get

# Copiar archivo de entorno
cp .env.example .env

# Editar .env con tus endpoints
```

## 🔧 Configuración

Edita el archivo `.env`:

```env
API_BASE_URL=http://localhost:3000/api
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## 🏃 Ejecutar

```bash
# Android
flutter run -d android

# iOS
flutter run -d ios

# Windows
flutter run -d windows

# Web
flutter run -d chrome
```

## 🧪 Testing

```bash
# Ejecutar tests
flutter test

# Con coverage
flutter test --coverage

# Tests específicos
flutter test test/features/auth/
```

## 🏗️ Build

### Android

```bash
# APK
flutter build apk --release

# App Bundle
flutter build appbundle --release
```

### iOS

```bash
flutter build ios --release
```

### Windows

```bash
flutter build windows --release
```

## 📁 Estructura

```
lib/
├── core/                    # Configuración y utilidades base
│   ├── config/
│   ├── network/
│   ├── router/
│   ├── storage/
│   └── theme/
├── features/                # Módulos por funcionalidad
│   ├── auth/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   ├── dashboard/
│   ├── crm/
│   └── ...
└── main.dart
```

## 🎨 Arquitectura

- **Clean Architecture**: Separación en capas (Domain, Data, Presentation)
- **MVVM**: Patrón de presentación
- **Riverpod**: State management
- **go_router**: Navegación declarativa

## 🔨 Code Generation

```bash
# Generar código (json_serializable, freezed, retrofit)
flutter pub run build_runner build --delete-conflicting-outputs

# Watch mode
flutter pub run build_runner watch
```

## 📝 Scripts Útiles

```bash
# Limpiar proyecto
flutter clean

# Actualizar dependencias
flutter pub upgrade

# Analizar código
flutter analyze

# Formatear código
dart format .
```

## 🎨 Assets

Los assets se encuentran en:

```
assets/
├── images/
├── icons/
└── fonts/
```

## 📚 Documentación

Ver [docs/](../../docs) para documentación de arquitectura completa.

## 🐛 Troubleshooting

### Error: "No Firebase App"
Asegúrate de haber inicializado Firebase en `main.dart`

### Error de build en Android
```bash
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
```

### Error de build en iOS
```bash
cd ios
pod deintegrate
pod install
cd ..
flutter clean
flutter pub get
```
