@echo off
setlocal enabledelayedexpansion

title OMS (Organization Management System) Launcher

echo ==========================================
echo   OMS Launcher - Frontend and Backend
echo ==========================================
echo.

rem Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js v18 or higher and try again.
    pause
    exit /b 1
)

rem Check Backend node_modules
if not exist "backend\node_modules" (
    echo [INFO] Backend node_modules not found. Installing dependencies...
    cd backend
    call npm install
    cd ..
)

rem Check Frontend node_modules
if not exist "frontend\node_modules" (
    echo [INFO] Frontend node_modules not found. Installing dependencies...
    cd frontend
    call npm install
    cd ..
)

rem Check Backend .env
if not exist "backend\.env" (
    echo [WARNING] Backend .env file not found!
    if exist "backend\.env.example" (
        echo [INFO] Creating backend\.env from .env.example...
        copy "backend\.env.example" "backend\.env" >nul
        echo [SUCCESS] Created backend\.env
    ) else (
        echo [ERROR] backend\.env.example not found. Please create backend\.env manually.
    )
)

rem Check Frontend .env
if not exist "frontend\.env" (
    echo [WARNING] Frontend .env file not found!
    if exist "frontend\.env.example" (
        echo [INFO] Creating frontend\.env from .env.example...
        copy "frontend\.env.example" "frontend\.env" >nul
        echo [SUCCESS] Created frontend\.env
    ) else (
        echo [ERROR] frontend\.env.example not found. Please create frontend\.env manually.
    )
)

echo.
echo [INFO] Starting Backend in a new window...
start "OMS Backend Server" cmd /k "cd backend && npm run dev"

echo [INFO] Starting Frontend in a new window...
start "OMS Frontend Client" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo   OMS is starting up!
echo   - Backend: http://localhost:5000
echo   - Frontend: http://localhost:5173
echo ==========================================
echo.
pause
