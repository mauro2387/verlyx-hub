# Script para aplicar la migración del sistema financiero a Supabase
# Ejecutar: .\apply-financial-migration.ps1

Write-Host "🚀 Aplicando migración del sistema financiero a Supabase..." -ForegroundColor Cyan

$SUPABASE_URL = "https://pyxvabojpgrdwgntjgxe.supabase.co"
$SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5eHZhYm9qcGdyZHdnbnRqZ3hlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4OTY3MSwiZXhwIjoyMDg0MDY1NjcxfQ.dLy9w3l7L4O0AB1ZbOFbh5FD80p3UKGRtx3iWR41_u4"

# Leer el archivo SQL
$sqlFile = "database\20_create_financial_system.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Error: No se encontró el archivo $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Leyendo archivo SQL..." -ForegroundColor Yellow
$sqlContent = Get-Content $sqlFile -Raw

Write-Host "📤 Enviando a Supabase..." -ForegroundColor Yellow

# Ejecutar directamente el SQL
try {
    $headers = @{
        "apikey" = $SUPABASE_KEY
        "Authorization" = "Bearer $SUPABASE_KEY"
        "Content-Type" = "application/json"
    }
    
    # Usar el endpoint de SQL directo
    $response = Invoke-WebRequest `
        -Uri "$SUPABASE_URL/rest/v1/" `
        -Method POST `
        -Headers $headers `
        -Body $sqlContent `
        -ErrorAction Stop
    
    Write-Host "✅ Migración aplicada exitosamente!" -ForegroundColor Green
    Write-Host ""
    
    # Ahora ejecutar las funciones para crear datos por defecto
    Write-Host "📝 Creando categorías por defecto..." -ForegroundColor Yellow
    $categoryQuery = "SELECT create_default_categories();"
    $categoryBody = @{ query = $categoryQuery } | ConvertTo-Json
    
    Invoke-RestMethod `
        -Uri "$SUPABASE_URL/rest/v1/rpc/query" `
        -Method POST `
        -Headers $headers `
        -Body $categoryBody | Out-Null
    
    Write-Host "✅ Categorías creadas" -ForegroundColor Green
    
    Write-Host "🏦 Creando cuentas por defecto..." -ForegroundColor Yellow
    $accountQuery = "SELECT create_default_accounts();"
    $accountBody = @{ query = $accountQuery } | ConvertTo-Json
    
    Invoke-RestMethod `
        -Uri "$SUPABASE_URL/rest/v1/rpc/query" `
        -Method POST `
        -Headers $headers `
        -Body $accountBody | Out-Null
    
    Write-Host "✅ Cuentas creadas" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 ¡Sistema financiero listo para usar!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error al aplicar migración:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    Write-Host ""
    Write-Host "📋 Aplícalo manualmente:" -ForegroundColor Yellow
    Write-Host "1. Ve a: https://supabase.com/dashboard/project/pyxvabojpgrdwgntjgxe/editor" -ForegroundColor Cyan
    Write-Host "2. Click en SQL Editor" -ForegroundColor Cyan
    Write-Host "3. Copia y pega el contenido de database\20_create_financial_system.sql" -ForegroundColor Cyan
    Write-Host "4. Click en RUN" -ForegroundColor Cyan
    Write-Host "5. Ejecuta: SELECT create_default_categories()" -ForegroundColor Cyan
    Write-Host "6. Ejecuta: SELECT create_default_accounts()" -ForegroundColor Cyan
}
