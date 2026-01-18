# Test Login Script
Write-Host "Testing Verlyx Hub API..." -ForegroundColor Cyan

# Wait for server to be ready
Write-Host "Waiting for server..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Test login
Write-Host "`nTesting Login..." -ForegroundColor Yellow
$body = @{
    email = "owner@verlyx.com"
    password = "Verlyx2024!"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method Post -Body $body -ContentType 'application/json'
    
    Write-Host "✓ Login successful!" -ForegroundColor Green
    Write-Host "`nAccess Token:" -ForegroundColor Cyan
    Write-Host $response.accessToken -ForegroundColor White
    Write-Host "`nUser Info:" -ForegroundColor Cyan
    Write-Host "Email: $($response.user.email)" -ForegroundColor White
    Write-Host "Role: $($response.user.role)" -ForegroundColor White
    
    # Test authenticated endpoint
    Write-Host "`nTesting authenticated endpoint..." -ForegroundColor Yellow
    $headers = @{
        Authorization = "Bearer $($response.accessToken)"
    }
    
    $me = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/me' -Method Get -Headers $headers
    Write-Host "✓ Authenticated request successful!" -ForegroundColor Green
    Write-Host "Welcome, $($me.fullName)!" -ForegroundColor White
    
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
