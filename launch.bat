@echo off
title StockMarketAnalyzer Launcher
echo ===================================================
echo   Stock Market Analysis Platform - Launcher
echo ===================================================
echo.

REM Check backend environment
if not exist "backend\venv" (
    echo [WARNING] backend/venv directory not found.
    echo Please make sure you have created and set up the python virtual environment.
)

REM Check frontend node_modules
if not exist "frontend\node_modules" (
    echo [WARNING] frontend/node_modules directory not found.
    echo Running "npm install" in frontend directory first...
    cd frontend
    call npm install
    cd ..
)

echo Starting Backend Server in a new window...
start "Stock Market Backend" cmd /k "cd backend && venv\Scripts\python.exe run.py"

echo Starting Frontend Dev Server in a new window...
start "Stock Market Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo   All services launched!
echo.
echo   - Backend: http://127.0.0.1:8000
echo   - Swagger Docs: http://127.0.0.1:8000/docs
echo   - Frontend: http://localhost:5173
echo ===================================================
echo.
pause
