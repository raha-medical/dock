@echo off
REM STAGING copy: database alrahma_staging, API 8089, frontend 3001, agent 9444, S3 9010 (bucket medical-staging).
REM Run Al-Rahma WITHOUT Docker: local PostgreSQL (13+, found automatically) + dotnet 8 + Next.js
REM API: http://localhost:8089   Frontend: http://localhost:3001   Agent simulator: http://localhost:9444
REM File storage (attachments, doctor photos): S3 on http://localhost:9010 when D:\Progect\_tools\weed.exe exists (data and s3.json in local-data\s3).
setlocal
cd /d %~dp0
call "%~dp0pg-env.bat" || (pause & goto end)
set "PSQL=%PGBIN%\psql.exe"
set "DBNAME=alrahma_staging"
REM Migration and schema files are UTF-8 (Arabic text). Without this, psql uses the console code page and the server rejects them.
set "PGCLIENTENCODING=UTF8"
echo.
echo  Al-Rahma - local run (no Docker)
if defined PGPASSWORD goto checkpw
echo  Type the password of your local PostgreSQL user "%PGUSER%" (the one you use in pgAdmin):
:askpw
set "PGPASSWORD="
set /p "PGPASSWORD=> "
if not defined PGPASSWORD (echo  Password is empty. Type it then press Enter.& goto askpw)
:checkpw
"%PSQL%" -w -d postgres -tAc "select 1" >nul 2>&1
if errorlevel 1 goto badpw
"%PSQL%" -w -d postgres -tAc "select 1 from pg_database where datname='%DBNAME%'" | findstr 1 >nul
if not errorlevel 1 goto dbready
echo Creating database %DBNAME% and applying schema_v5.sql ...
"%PSQL%" -w -d postgres -c "create database %DBNAME%"
"%PSQL%" -w -d %DBNAME% -v ON_ERROR_STOP=1 -q -f "backend\database\schema_v5.sql"
if errorlevel 1 goto schemafail
:dbready
REM Migrations: every file in backend\database\migrations is applied in order on each start (they are safe to repeat).
REM The files are UTF-8 with Arabic text: without PGCLIENTENCODING=UTF8, psql uses the console code page (WIN1252)
REM and the server rejects them. That is why 020 was silently skipped before (the error was hidden by >nul).
REM Any failure is shown with its message and stops the start, so the API never runs on a half-migrated database.
echo Applying database migrations (safe to repeat) ...
set "MIGFAIL="
set "MIGERR=%TEMP%\alrahma-staging-migration.err"
for %%f in ("backend\database\migrations\*.sql") do (
  "%PSQL%" -w -d %DBNAME% -q -v ON_ERROR_STOP=1 -f "%%~ff" >nul 2>"%MIGERR%"
  if errorlevel 1 (
    echo.
    echo  *** MIGRATION FAILED: %%~nxf ***
    type "%MIGERR%"
    set "MIGFAIL=%%~nxf"
  ) else (
    echo    ok  %%~nxf
  )
)
if defined MIGFAIL goto migfail
"%PSQL%" -w -d %DBNAME% -tAc "select count(*) from users" >nul 2>&1
if errorlevel 1 goto noschema

REM File storage: S3-compatible SeaweedFS (MinIO no longer publishes free Windows builds)
set "STORAGE_ON="
set "WEED=D:\Progect\_tools\weed.exe"
if exist "%WEED%" (
  set "STORAGE_ON=1"
  start "Al-Rahma STAGING File Storage :9010" cmd /k "cd /d %~dp0local-data\s3 && "%WEED%" server -ip=127.0.0.1 -dir=data -master.port=9334 -volume.port=18081 -filer.port=8889 -s3 -s3.port=9010 -s3.config=s3.json"
) else (
  echo  Note: %WEED% not found - uploading attachments and doctor photos will not work.
)

set "ASPNETCORE_ENVIRONMENT=Development"
set "ConnectionStrings__Default=Host=%PGHOST%;Port=%PGPORT%;Database=%DBNAME%;Username=%PGUSER%;Password=%PGPASSWORD%"
set "Jwt__SigningKey=local-dev-signing-key-change-me-0123456789abcdef"
set "Cors__Origins__0=http://localhost:3001"
set "Cors__Origins__1=http://127.0.0.1:3001"
set "Bootstrap__AdminUsername=admin"
set "Bootstrap__AdminPassword=Admin-Change-Me-2026"
set "Payments__PublicBaseUrl=http://localhost:3001"
set "Receipts__VerifyBaseUrl=http://localhost:3001/verify/"
set "Backup__Enabled=false"
set "Swagger__Enabled=true"
REM Sandbox OTP: no SMS provider yet, so the patient app shows the login code in a "Sandbox" box.
REM The API refuses this setting outside Development/Testing (Program.cs), so it can never reach production.
set "Otp__ExposeCodeInResponse=true"
set "Drawer__KeyFile=%~dp0local-data\keys\drawer-es256.pem"
if defined STORAGE_ON (
  set "Storage__ServiceUrl=http://localhost:9010"
  set "Storage__PublicUrl=http://localhost:9010"
  set "Storage__AccessKey=alrahma"
  set "Storage__SecretKey=alrahma_dev_minio"
  set "Storage__Bucket=medical-staging"
)
REM Gemini assistant (STAGING TESTING ONLY): put  set "GEMINI_API_KEY=..."  in local-env.bat (never in a repo, .env or appsettings).
REM Before any real patient the key MUST come from a Google Cloud project with billing enabled: on the free tier Google uses
REM prompts and replies to improve its products. Model: GEMINI_MODEL in local-env.bat, default gemini-3.5-flash-lite.
REM The key reaches the API window only (the API reads GEMINI_API_KEY when Assistant__ApiKey is empty) and is cleared
REM before the agent and frontend windows start, like PGPASSWORD. It is never printed.
set "Assistant__Provider="
set "Assistant__Model="
if not defined GEMINI_MODEL set "GEMINI_MODEL=gemini-3.5-flash-lite"
if defined GEMINI_API_KEY set "Assistant__Provider=gemini"
if defined GEMINI_API_KEY set "Assistant__Model=%GEMINI_MODEL%"
if defined GEMINI_API_KEY (echo  Assistant: Gemini, model %GEMINI_MODEL%) else (echo  Assistant: sandbox ^(no GEMINI_API_KEY in local-env.bat^))
start "Al-Rahma STAGING API :8089" cmd /k "cd /d %~dp0backend && dotnet run --project src\AlRahma.Api --urls http://localhost:8089"
set "GEMINI_API_KEY="
set "Assistant__Provider="
set "Assistant__Model="
set "PGPASSWORD="
set "ConnectionStrings__Default="
start "Al-Rahma STAGING Agent Simulator :9444" cmd /k "cd /d %~dp0dock\tools\agent-simulator && set AGENT_PORT=9444&& set API_URL=http://localhost:8089&& set AGENT_ORIGINS=http://localhost:3001,http://127.0.0.1:3001&& node agent-sim.mjs"
cd /d %~dp0frontend
call npm install --no-audit --no-fund
start "Al-Rahma STAGING Frontend :3001" cmd /k "npx next dev -p 3001"
echo Waiting for the API on http://localhost:8089/health ...
:waitapi
timeout /t 5 >nul
curl -s -o nul -w "%%{http_code}" http://localhost:8089/health | findstr 200 >nul
if errorlevel 1 goto waitapi
echo API is up. Opening the app...
start http://localhost:3001/staff/login
goto end
:badpw
echo Could not connect to PostgreSQL on %PGHOST%:%PGPORT% with that password. Is the PostgreSQL service running?
echo If this is the wrong server, set PGBIN and PGPORT in local-env.bat (see local-env.example.bat).
pause
goto end
:noschema
echo Database %DBNAME% exists but the table "users" is missing. Run backend\database\schema_v5.sql on it.
pause
goto end
:schemafail
echo Applying the schema failed. See the messages above.
pause
goto end
:migfail
echo.
echo  Database migration %MIGFAIL% failed (message above). The system was NOT started.
echo  Fix the migration or the database, then run start-native.bat again.
pause
endlocal
exit /b 1
:end
endlocal
