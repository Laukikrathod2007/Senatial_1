# SENTINEL — Start frontend dev server
# Run AFTER start-backend.ps1
# UI will open at: http://localhost:5173

Set-Location "$PSScriptRoot\frontend"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  SENTINEL Frontend - http://localhost:5173"        -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

npm run dev
