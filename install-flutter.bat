@echo off
echo ========================================
echo   Verlyx Hub - Flutter Quick Setup
echo ========================================
echo.

REM Check if Flutter exists
if exist "C:\flutter\bin\flutter.bat" (
    echo Flutter ya esta instalado!
    goto :configure
)

echo Descargando Flutter SDK...
echo NOTA: Esta descarga puede tomar 10-15 minutos dependiendo de tu conexion
echo.

REM Create directory
if not exist "C:\flutter" mkdir C:\flutter

REM Download using bitsadmin (built-in Windows)
echo Iniciando descarga con BITS (descarga en segundo plano)...
bitsadmin /transfer "FlutterDownload" /priority FOREGROUND https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.24.5-stable.zip C:\flutter_windows.zip

if errorlevel 1 (
    echo.
    echo ERROR: Descarga fallida con BITS
    echo.
    echo Por favor descarga manualmente:
    echo 1. Ve a: https://flutter.dev/docs/get-started/install/windows
    echo 2. Descarga el archivo ZIP
    echo 3. Extrae a C:\flutter
    echo 4. Ejecuta este script nuevamente
    pause
    exit /b 1
)

echo.
echo Extrayendo Flutter...
powershell -command "Expand-Archive -Path 'C:\flutter_windows.zip' -DestinationPath 'C:\' -Force"
del C:\flutter_windows.zip

:configure
echo.
echo Configurando PATH...
setx PATH "%PATH%;C:\flutter\bin" /M 2>nul
if errorlevel 1 (
    echo Agregando a PATH de usuario...
    setx PATH "%PATH%;C:\flutter\bin"
)

echo.
echo Ejecutando Flutter Doctor...
C:\flutter\bin\flutter doctor -v

echo.
echo ========================================
echo   Instalacion Completa!
echo ========================================
echo.
echo Flutter instalado en: C:\flutter
echo.
echo IMPORTANTE: Cierra y reabre PowerShell/CMD para usar Flutter
echo.
echo Proximos pasos:
echo 1. Abre una nueva terminal
echo 2. cd "C:\Users\mauro\OneDrive\Desktop\Verlyx Hub\verlyx_hub_flutter"
echo 3. flutter pub get
echo 4. flutter run -d windows
echo.
pause
