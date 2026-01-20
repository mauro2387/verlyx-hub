# Test Projects API - Comprehensive Testing Script
# Este script prueba todos los endpoints de la API de Projects mejorada

$baseUrl = "http://localhost:3000/api"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Testing Enhanced Projects API" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Get all companies to obtain company IDs
Write-Host "1. Getting all companies..." -ForegroundColor Yellow
try {
    $companiesResponse = Invoke-RestMethod -Uri "$baseUrl/companies" -Method Get
    Write-Host "✓ Companies retrieved successfully" -ForegroundColor Green
    $companiesResponse.data | ForEach-Object {
        Write-Host "  - $($_.name) (ID: $($_.id))" -ForegroundColor Gray
    }
    
    # Store first company ID for testing
    $companyId = $companiesResponse.data[0].id
    Write-Host "`nUsing Company ID: $companyId for testing`n" -ForegroundColor Magenta
} catch {
    Write-Host "✗ Failed to get companies: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Create a test project
Write-Host "2. Creating test project..." -ForegroundColor Yellow
$newProject = @{
    companyId = $companyId
    name = "Proyecto de Prueba - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    description = "Proyecto de prueba para validar funcionalidad completa"
    status = "planning"
    priority = "high"
    budget = 10000
    spentAmount = 0
    currency = "USD"
    startDate = (Get-Date).ToString("yyyy-MM-dd")
    dueDate = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
    progressPercentage = 0
    tags = @("test", "api", "development")
} | ConvertTo-Json

try {
    $projectResponse = Invoke-RestMethod -Uri "$baseUrl/projects" -Method Post -Body $newProject -ContentType "application/json"
    Write-Host "✓ Project created successfully" -ForegroundColor Green
    Write-Host "  Project ID: $($projectResponse.id)" -ForegroundColor Gray
    Write-Host "  Name: $($projectResponse.name)" -ForegroundColor Gray
    Write-Host "  Status: $($projectResponse.status)" -ForegroundColor Gray
    Write-Host "  Budget: $($projectResponse.budget) $($projectResponse.currency)" -ForegroundColor Gray
    
    $projectId = $projectResponse.id
} catch {
    Write-Host "✗ Failed to create project: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Get all projects
Write-Host "`n3. Getting all projects..." -ForegroundColor Yellow
try {
    $allProjects = Invoke-RestMethod -Uri "$baseUrl/projects" -Method Get
    Write-Host "✓ Projects retrieved: $($allProjects.meta.total) total" -ForegroundColor Green
    Write-Host "  Page: $($allProjects.meta.page) of $($allProjects.meta.totalPages)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to get projects: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Get projects filtered by company
Write-Host "`n4. Getting projects filtered by company..." -ForegroundColor Yellow
try {
    $companyProjects = Invoke-RestMethod -Uri "$baseUrl/projects?companyId=$companyId" -Method Get
    Write-Host "✓ Company projects retrieved: $($companyProjects.meta.total) projects" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to filter by company: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Get projects by status
Write-Host "`n5. Getting projects by status (planning)..." -ForegroundColor Yellow
try {
    $statusProjects = Invoke-RestMethod -Uri "$baseUrl/projects?status=planning" -Method Get
    Write-Host "✓ Projects with status 'planning': $($statusProjects.meta.total)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to filter by status: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Get project stats
Write-Host "`n6. Getting project statistics..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/projects/stats" -Method Get
    Write-Host "✓ Statistics retrieved successfully" -ForegroundColor Green
    Write-Host "  Total Projects: $($stats.total)" -ForegroundColor Gray
    Write-Host "  Active: $($stats.active)" -ForegroundColor Gray
    Write-Host "  Completed: $($stats.completed)" -ForegroundColor Gray
    Write-Host "  Cancelled: $($stats.cancelled)" -ForegroundColor Gray
    Write-Host "  Total Budget: $($stats.totalBudget) USD" -ForegroundColor Gray
    Write-Host "  Total Spent: $($stats.totalSpent) USD" -ForegroundColor Gray
    Write-Host "  Overdue: $($stats.overdue)" -ForegroundColor Gray
    Write-Host "  Avg Progress: $([math]::Round($stats.averageProgress, 2))%" -ForegroundColor Gray
    
    if ($stats.profitability) {
        Write-Host "  Profitability: $($stats.profitability) USD ($([math]::Round($stats.profitabilityPercentage, 2))%)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Failed to get stats: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Get single project by ID
Write-Host "`n7. Getting single project by ID..." -ForegroundColor Yellow
try {
    $singleProject = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId" -Method Get
    Write-Host "✓ Project retrieved successfully" -ForegroundColor Green
    Write-Host "  Name: $($singleProject.name)" -ForegroundColor Gray
    Write-Host "  Status: $($singleProject.status)" -ForegroundColor Gray
    Write-Host "  Progress: $($singleProject.progressPercentage)%" -ForegroundColor Gray
    
    if ($singleProject.profitability) {
        Write-Host "  Profitability: $($singleProject.profitability) USD" -ForegroundColor Gray
    }
    
    if ($singleProject.isOverdue) {
        Write-Host "  ⚠️ PROJECT IS OVERDUE" -ForegroundColor Red
    } elseif ($singleProject.daysRemaining) {
        Write-Host "  Days Remaining: $($singleProject.daysRemaining)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Failed to get project: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Update project status (valid transition)
Write-Host "`n8. Updating project status (planning -> in_progress)..." -ForegroundColor Yellow
$updateStatus = @{
    status = "in_progress"
    progressPercentage = 15
} | ConvertTo-Json

try {
    $updatedProject = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId" -Method Patch -Body $updateStatus -ContentType "application/json"
    Write-Host "✓ Project status updated successfully" -ForegroundColor Green
    Write-Host "  New Status: $($updatedProject.status)" -ForegroundColor Gray
    Write-Host "  Progress: $($updatedProject.progressPercentage)%" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to update status: $($_.Exception.Message)" -ForegroundColor Red
}

# 9. Update project budget tracking
Write-Host "`n9. Updating budget tracking..." -ForegroundColor Yellow
$updateBudget = @{
    spentAmount = 2500
    progressPercentage = 35
} | ConvertTo-Json

try {
    $updatedProject = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId" -Method Patch -Body $updateBudget -ContentType "application/json"
    Write-Host "✓ Budget updated successfully" -ForegroundColor Green
    Write-Host "  Spent: $($updatedProject.spentAmount) USD" -ForegroundColor Gray
    Write-Host "  Budget: $($updatedProject.budget) USD" -ForegroundColor Gray
    Write-Host "  Progress: $($updatedProject.progressPercentage)%" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to update budget: $($_.Exception.Message)" -ForegroundColor Red
}

# 10. Test invalid status transition (should fail)
Write-Host "`n10. Testing invalid status transition (in_progress -> done, should fail)..." -ForegroundColor Yellow
$invalidTransition = @{
    status = "done"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId" -Method Patch -Body $invalidTransition -ContentType "application/json"
    Write-Host "✗ Invalid transition was allowed (UNEXPECTED)" -ForegroundColor Red
} catch {
    Write-Host "✓ Invalid transition blocked correctly (EXPECTED)" -ForegroundColor Green
    Write-Host "  Error: $($_.ErrorDetails.Message)" -ForegroundColor Gray
}

# 11. Valid status transition to review
Write-Host "`n11. Updating status to review..." -ForegroundColor Yellow
$reviewTransition = @{
    status = "review"
    progressPercentage = 90
} | ConvertTo-Json

try {
    $updatedProject = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId" -Method Patch -Body $reviewTransition -ContentType "application/json"
    Write-Host "✓ Project moved to review" -ForegroundColor Green
    Write-Host "  Status: $($updatedProject.status)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to move to review: $($_.Exception.Message)" -ForegroundColor Red
}

# 12. Complete the project
Write-Host "`n12. Completing the project..." -ForegroundColor Yellow
$completeProject = @{
    status = "done"
    progressPercentage = 100
} | ConvertTo-Json

try {
    $updatedProject = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId" -Method Patch -Body $completeProject -ContentType "application/json"
    Write-Host "✓ Project completed successfully" -ForegroundColor Green
    Write-Host "  Status: $($updatedProject.status)" -ForegroundColor Gray
    Write-Host "  Completion Date: $($updatedProject.completionDate)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to complete project: $($_.Exception.Message)" -ForegroundColor Red
}

# 13. Archive the project
Write-Host "`n13. Archiving the project..." -ForegroundColor Yellow
$archiveProject = @{
    isArchived = $true
} | ConvertTo-Json

try {
    $updatedProject = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId" -Method Patch -Body $archiveProject -ContentType "application/json"
    Write-Host "✓ Project archived successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to archive project: $($_.Exception.Message)" -ForegroundColor Red
}

# 14. Delete the test project
Write-Host "`n14. Deleting test project..." -ForegroundColor Yellow
try {
    $deleteResult = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId" -Method Delete
    Write-Host "✓ Project deleted successfully" -ForegroundColor Green
    Write-Host "  Message: $($deleteResult.message)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to delete project: $($_.Exception.Message)" -ForegroundColor Red
}

# Final summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Testing Complete!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Summary of tested features:" -ForegroundColor Green
Write-Host "  ✓ Company filtering" -ForegroundColor Gray
Write-Host "  ✓ Status transitions with validation" -ForegroundColor Gray
Write-Host "  ✓ Budget tracking and profitability" -ForegroundColor Gray
Write-Host "  ✓ Progress percentage tracking" -ForegroundColor Gray
Write-Host "  ✓ Comprehensive statistics" -ForegroundColor Gray
Write-Host "  ✓ Date calculations (overdue, days remaining)" -ForegroundColor Gray
Write-Host "  ✓ Auto completion date" -ForegroundColor Gray
Write-Host "  ✓ Archive functionality" -ForegroundColor Gray
Write-Host "  ✓ CRUD operations" -ForegroundColor Gray
