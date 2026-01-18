# ========================================
# Verlyx Hub - One Click PowerShell Setup
# EJECUTA COMO ADMINISTRADOR
# ========================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Verlyx Hub - Setup Automático" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (!$isAdmin) {
    Write-Host "❌ ERROR: Este script debe ejecutarse como Administrador" -ForegroundColor Red
    Write-Host "`nPor favor:" -ForegroundColor Yellow
    Write-Host "1. Click derecho en PowerShell" -ForegroundColor White
    Write-Host "2. 'Ejecutar como administrador'" -ForegroundColor White
    Write-Host "3. Ejecuta este script nuevamente`n" -ForegroundColor White
    pause
    exit 1
}

Write-Host "✓ Ejecutando como Administrador`n" -ForegroundColor Green

# Install Chocolatey
Write-Host "Paso 1/3: Instalando Chocolatey..." -ForegroundColor Yellow
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    try {
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        Write-Host "✓ Chocolatey instalado`n" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error instalando Chocolatey: $_" -ForegroundColor Red
        pause
        exit 1
    }
} else {
    Write-Host "✓ Chocolatey ya está instalado`n" -ForegroundColor Green
}

# Refresh environment
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Install Flutter
Write-Host "Paso 2/3: Instalando Flutter..." -ForegroundColor Yellow
Write-Host "(Esto puede tomar 10-15 minutos)`n" -ForegroundColor Yellow
try {
    choco install flutter -y
    Write-Host "`n✓ Flutter instalado`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Error instalando Flutter: $_" -ForegroundColor Red
    Write-Host "`nIntenta instalación manual:" -ForegroundColor Yellow
    Write-Host "https://flutter.dev/docs/get-started/install/windows`n" -ForegroundColor White
    pause
    exit 1
}

# Install Git (if not present)
Write-Host "Paso 3/3: Verificando Git..." -ForegroundColor Yellow
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Instalando Git..." -ForegroundColor Yellow
    choco install git -y
    Write-Host "✓ Git instalado`n" -ForegroundColor Green
} else {
    Write-Host "✓ Git ya está instalado`n" -ForegroundColor Green
}

# Refresh environment again
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ✓ Instalación Completa!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Flutter instalado exitosamente!" -ForegroundColor Green
Write-Host "`nPróximos pasos:" -ForegroundColor Yellow
Write-Host "1. CIERRA esta ventana de PowerShell" -ForegroundColor White
Write-Host "2. Abre una NUEVA PowerShell (normal, no como admin)" -ForegroundColor White
Write-Host "3. Ejecuta: flutter doctor -v" -ForegroundColor White
Write-Host "4. Navega al proyecto:" -ForegroundColor White
Write-Host '   cd "C:\Users\mauro\OneDrive\Desktop\Verlyx Hub"' -ForegroundColor Cyan
Write-Host "5. Ejecuta la app:" -ForegroundColor White
Write-Host "   .\run-verlyx.ps1 -Platform windows`n" -ForegroundColor Cyan

Write-Host "Para Android (opcional):" -ForegroundColor Yellow
Write-Host "6. choco install androidstudio -y" -ForegroundColor Cyan
Write-Host "7. flutter doctor --android-licenses" -ForegroundColor Cyan
Write-Host "8. .\run-verlyx.ps1 -Platform android`n" -ForegroundColor Cyan

Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor Gray
pause
