@echo off
echo ========================================
echo   Verlyx Hub - One Click Setup
echo ========================================
echo.
echo Este script instalara:
echo   1. Chocolatey (gestor de paquetes)
echo   2. Flutter SDK
echo   3. Git (si no esta instalado)
echo.
echo IMPORTANTE: Ejecuta como Administrador
echo (Click derecho - Ejecutar como administrador)
echo.
pause

echo.
echo Instalando Chocolatey...
@"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "[System.Net.ServicePointManager]::SecurityProtocol = 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" && SET "PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin"

echo.
echo Refrescando variables de entorno...
call refreshenv

echo.
echo Instalando Flutter...
choco install flutter -y

echo.
echo Instalando Git (si no esta instalado)...
choco install git -y

echo.
echo ========================================
echo   Instalacion Completa!
echo ========================================
echo.
echo Proximos pasos:
echo.
echo 1. CIERRA esta ventana
echo 2. Abre una nueva PowerShell NORMAL (no como admin)
echo 3. Ejecuta: flutter doctor
echo 4. Ejecuta: cd "C:\Users\mauro\OneDrive\Desktop\Verlyx Hub"
echo 5. Ejecuta: .\run-verlyx.ps1 -Platform windows
echo.
pause
