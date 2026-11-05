@echo off
REM Run Al-Rahma locally: Docker backend (API on 8088) + Next.js frontend (3000)
cd /d %~dp0
docker info >nul 2>&1
if not errorlevel 1 goto dockerok
echo Starting Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
:waitdocker
timeout /t 5 >nul
docker info >nul 2>&1
if errorlevel 1 goto waitdocker
:dockerok
start "Al-Rahma Backend" cmd /k "cd /d %~dp0alrahma-backend-final && docker compose up --build"
cd /d %~dp0alrahma-frontend
if not exist node_modules call npm install
start "Al-Rahma Frontend" cmd /k "npx next dev -p 3000"
echo Waiting for the API on http://localhost:8088/health ...
:waitapi
timeout /t 5 >nul
curl -s -o nul -w "%%{http_code}" http://localhost:8088/health | findstr 200 >nul
if errorlevel 1 goto waitapi
start http://localhost:3000/staff/login
