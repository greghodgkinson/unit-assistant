@echo off
setlocal enabledelayedexpansion

REM Docker deployment script for Windows using Docker Desktop
REM This script builds and runs the learning assistant application

echo 🚀 Starting deployment of Unit Assistant...

REM Configuration
set IMAGE_NAME=unit-assistant
set CONTAINER_NAME=unit-assistant-app
set PORT=3001
set STORAGE_DIR=%USERPROFILE%\.learning-assistant

REM Create storage directory if it doesn't exist
echo 📁 Setting up storage directory...
if not exist "%STORAGE_DIR%" (
    echo    Creating storage directory: %STORAGE_DIR%
    mkdir "%STORAGE_DIR%"
) else (
    echo    Storage directory already exists: %STORAGE_DIR%
)

REM Check if docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Docker is not installed or not in PATH. Please install Docker Desktop first.
    echo    You can download it from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Stop and remove existing container if it exists
echo 🛑 Stopping existing container (if running)...
for /f %%i in ('docker ps -q -f name=%CONTAINER_NAME% 2^>nul') do (
    echo    Stopping container: %CONTAINER_NAME%
    docker stop %CONTAINER_NAME%
)

for /f %%i in ('docker ps -a -q -f name=%CONTAINER_NAME% 2^>nul') do (
    echo    Removing container: %CONTAINER_NAME%
    docker rm %CONTAINER_NAME%
)

REM Build the Docker image
echo 🔨 Building Docker image: %IMAGE_NAME%
docker build -t %IMAGE_NAME% .
if errorlevel 1 (
    echo ❌ Failed to build Docker image!
    pause
    exit /b 1
)

REM Run the new container
echo 🏃 Starting new container...
docker run -d --name %CONTAINER_NAME% -p %PORT%:3001 -v "%STORAGE_DIR%:/app/storage" --restart unless-stopped %IMAGE_NAME%
if errorlevel 1 (
    echo ❌ Failed to start container!
    pause
    exit /b 1
)

REM Check if container is running
timeout /t 2 /nobreak >nul
for /f %%i in ('docker ps -q -f name=%CONTAINER_NAME% 2^>nul') do set CONTAINER_RUNNING=%%i

if defined CONTAINER_RUNNING (
    echo ✅ Deployment successful!
    echo 🌐 Application is running at: http://localhost:%PORT%
    echo 📊 Container status:
    docker ps -f name=%CONTAINER_NAME%
) else (
    echo ❌ Deployment failed! Container is not running.
    echo 📋 Container logs:
    docker logs %CONTAINER_NAME%
    pause
    exit /b 1
)

echo.
echo 🔧 Useful commands:
echo    View logs:    docker logs %CONTAINER_NAME%
echo    Stop app:     docker stop %CONTAINER_NAME%
echo    Restart app:  docker restart %CONTAINER_NAME%
echo    Remove app:   docker rm -f %CONTAINER_NAME%
echo.
pause