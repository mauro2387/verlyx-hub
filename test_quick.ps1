# Quick Test for Projects API
$baseUrl = "http://localhost:3000/api"

Write-Host "Testing Projects API..." -ForegroundColor Cyan

# 1. Get companies
Write-Host "`n1. Getting companies..." -ForegroundColor Yellow
$companies = Invoke-RestMethod -Uri "$baseUrl/companies" -Method Get
Write-Host "OK - Found $($companies.data.Count) companies" -ForegroundColor Green
$companies.data | Select-Object -First 3 | ForEach-Object { Write-Host "  - $($_.name)" -ForegroundColor Gray }

# Store company ID
$companyId = $companies.data[0].id
Write-Host "`nUsing: $($companies.data[0].name) ($companyId)" -ForegroundColor Magenta

# 2. Create project
Write-Host "`n2. Creating test project..." -ForegroundColor Yellow
$newProject = @{
    companyId = $companyId
    name = "Test Project $(Get-Date -Format 'HH:mm:ss')"
    description = "Testing enhanced API"
    status = "planning"
    priority = "high"
    budget = 10000
    spentAmount = 0
    startDate = (Get-Date).ToString("yyyy-MM-dd")
    dueDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
    tags = @("test", "api")
} | ConvertTo-Json

$project = Invoke-RestMethod -Uri "$baseUrl/projects" -Method Post -Body $newProject -ContentType "application/json"
Write-Host "OK - Created: $($project.name)" -ForegroundColor Green
Write-Host "  ID: $($project.id)" -ForegroundColor Gray
$projectId = $project.id

# 3. Get all projects
Write-Host "`n3. Getting all projects..." -ForegroundColor Yellow
$all = Invoke-RestMethod -Uri "$baseUrl/projects" -Method Get
Write-Host "OK - Total: $($all.meta.total)" -ForegroundColor Green

# 4. Get by company
Write-Host "`n4. Filtering by company..." -ForegroundColor Yellow
$filtered = Invoke-RestMethod -Uri "$baseUrl/projects?companyId=$companyId" -Method Get
Write-Host "OK - Found: $($filtered.meta.total)" -ForegroundColor Green

# 5. Get stats
Write-Host "`n5. Getting statistics..." -ForegroundColor Yellow
$stats = Invoke-RestMethod -Uri "$baseUrl/projects/stats" -Method Get
Write-Host "OK - Stats retrieved" -ForegroundColor Green
Write-Host "  Total: $($stats.total)" -ForegroundColor Gray
Write-Host "  Active: $($stats.active)" -ForegroundColor Gray
Write-Host "  Budget: $($stats.totalBudget) USD" -ForegroundColor Gray
Write-Host "  Spent: $($stats.totalSpent) USD" -ForegroundColor Gray

# 6. Update status
Write-Host "`n6. Updating status..." -ForegroundColor Yellow
$update = @{ status = "in_progress"; progressPercentage = 25 } | ConvertTo-Json
$updated = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId" -Method Patch -Body $update -ContentType "application/json"
Write-Host "OK - New status: $($updated.status)" -ForegroundColor Green

# 7. Update budget
Write-Host "`n7. Updating budget..." -ForegroundColor Yellow
$budgetUpdate = @{ spentAmount = 2500 } | ConvertTo-Json
$updated2 = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId" -Method Patch -Body $budgetUpdate -ContentType "application/json"
Write-Host "OK - Spent: $($updated2.spentAmount)" -ForegroundColor Green

# 8. Get single with metrics
Write-Host "`n8. Getting project with metrics..." -ForegroundColor Yellow
$single = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId" -Method Get
Write-Host "OK - Project retrieved" -ForegroundColor Green
if ($single.profitability) {
    Write-Host "  Profitability: $($single.profitability) USD" -ForegroundColor Gray
}
if ($single.daysRemaining) {
    Write-Host "  Days remaining: $($single.daysRemaining)" -ForegroundColor Gray
}

# 9. Delete
Write-Host "`n9. Deleting test project..." -ForegroundColor Yellow
$deleted = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId" -Method Delete
Write-Host "OK - $($deleted.message)" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "All tests passed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
