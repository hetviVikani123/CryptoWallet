@echo off
REM Quick Deployment Script for Windows

echo ================================
echo Crypto Wallet Deployment Script
echo ================================
echo.

REM Check if Docker is running
docker info > nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [1/5] Checking environment file...
if not exist .env (
    echo WARNING: .env file not found!
    echo Creating from .env.example...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please edit .env file with your credentials before continuing!
    echo.
    pause
)

echo [2/5] Building Docker images...
docker-compose build --no-cache
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo [3/5] Starting services...
docker-compose up -d
if errorlevel 1 (
    echo ERROR: Failed to start services!
    pause
    exit /b 1
)

echo [4/5] Waiting for services to be healthy...
timeout /t 10 /nobreak > nul

echo [5/5] Checking health...
curl -s http://localhost:5000/health > nul
if errorlevel 1 (
    echo WARNING: Backend health check failed
) else (
    echo Backend: OK
)

curl -s http://localhost:3001/ > nul
if errorlevel 1 (
    echo WARNING: Frontend health check failed
) else (
    echo Frontend: OK
)

echo.
echo ================================
echo Deployment Complete!
echo ================================
echo.
echo Services:
echo   Frontend: http://localhost:3001
echo   Backend:  http://localhost:5000
echo   Nginx:    http://localhost:80
echo.
echo Admin Credentials:
echo   Email:    admin@gmail.com
echo   Password: Admin@123
echo.
echo View logs:    docker-compose logs -f
echo Stop services: docker-compose down
echo.
pause
