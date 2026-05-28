# StockMarketAnalyzer - PowerShell Launcher
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  StockMarketAnalyzer - Launcher" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Check backend environment
if (-not (Test-Path "backend\venv")) {
    Write-Host "[WARNING] backend/venv directory not found." -ForegroundColor Yellow
    Write-Host "Please make sure you have created and set up the python virtual environment." -ForegroundColor Yellow
}

# Check frontend node_modules
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "[WARNING] frontend/node_modules directory not found." -ForegroundColor Yellow
    Write-Host "Running 'npm install' in frontend directory first..." -ForegroundColor Gray
    cd frontend
    npm install
    cd ..
}

# Launch Backend
Write-Host "Starting Backend Server in a new window..." -ForegroundColor Green
Start-Process cmd -ArgumentList "/k", "cd backend && venv\Scripts\python.exe run.py"

# Launch Frontend
Write-Host "Starting Frontend Dev Server in a new window..." -ForegroundColor Green
Start-Process cmd -ArgumentList "/k", "cd frontend && npm run dev"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  All services launched!" -ForegroundColor Green
Write-Host ""
Write-Host "  - Backend: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  - Swagger Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host -Prompt "Press Enter to exit this launcher..."
