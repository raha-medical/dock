@echo off
REM Reference copy: secret values replaced with CHANGE_ME. The working copy is in the local work folder root.
REM Run Al-Rahma WITHOUT Docker: local PostgreSQL (13+, found automatically) + dotnet 8 + Next.js
REM API: http://localhost:8088   Frontend: http://localhost:3000   Agent simulator: http://localhost:9443
REM File storage (attachments, doctor photos): S3 on http://localhost:9000 when D:\Progect\_tools\weed.exe exists (data and s3.json stay in tools\s3).
setlocal
cd /d %~dp0
call "%~dp0pg-env.bat" || (pause & goto end)
set "PSQL=%PGBIN%\psql.exe"
set "DBNAME=alrahma_db"
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
"%PSQL%" -w -d %DBNAME% -v ON_ERROR_STOP=1 -q -f "alrahma-backend-final\database\schema_v5.sql"
if errorlevel 1 goto schemafail
:dbready
echo Applying database migrations (safe to repeat) ...
for %%f in ("alrahma-backend-final\database\migrations\*.sql") do "%PSQL%" -w -d %DBNAME% -q -v ON_ERROR_STOP=1 -f "%%~ff" >nul
"%PSQL%" -w -d %DBNAME% -tAc "select count(*) from users" >nul 2>&1
if errorlevel 1 goto noschema

REM File storage: S3-compatible SeaweedFS (MinIO no longer publishes free Windows builds)
set "STORAGE_ON="
set "WEED=D:\Progect\_tools\weed.exe"
if exist "%WEED%" (
  set "STORAGE_ON=1"
  start "Al-Rahma File Storage :9000" cmd /k "cd /d %~dp0tools\s3 && "%WEED%" server -ip=127.0.0.1 -dir=data -master.port=9333 -volume.port=18080 -filer.port=8888 -s3 -s3.port=9000 -s3.config=s3.json"
) else (
  echo  Note: %WEED% not found - uploading attachments and doctor photos will not work.
)

set "ASPNETCORE_ENVIRONMENT=Development"
set "ConnectionStrings__Default=Host=%PGHOST%;Port=%PGPORT%;Database=%DBNAME%;Username=%PGUSER%;Password=%PGPASSWORD%"
set "Jwt__SigningKey=CHANGE_ME_AT_LEAST_32_CHARACTERS_LONG"
set "Cors__Origins__0=http://localhost:3000"
set "Cors__Origins__1=http://127.0.0.1:3000"
set "Bootstrap__AdminUsername=admin"
set "Bootstrap__AdminPassword=CHANGE_ME"
set "Payments__PublicBaseUrl=http://localhost:3000"
set "Receipts__VerifyBaseUrl=http://localhost:3000/verify/"
set "Backup__Enabled=false"
set "Swagger__Enabled=true"
REM Sandbox OTP: no SMS provider yet, so the patient app shows the login code in a "Sandbox" box.
REM The API refuses this setting outside Development/Testing (Program.cs), so it can never reach production.
set "Otp__ExposeCodeInResponse=true"
set "Drawer__KeyFile=%~dp0DB\keys\drawer-es256.pem"
if defined STORAGE_ON (
  set "Storage__ServiceUrl=http://localhost:9000"
  set "Storage__PublicUrl=http://localhost:9000"
  set "Storage__AccessKey=alrahma"
  set "Storage__SecretKey=CHANGE_ME"
  set "Storage__Bucket=medical"
)
start "Al-Rahma API :8088" cmd /k "cd /d %~dp0alrahma-backend-final && dotnet run --project src\AlRahma.Api --urls http://localhost:8088"
set "PGPASSWORD="
set "ConnectionStrings__Default="
start "Al-Rahma Agent Simulator :9443" cmd /k "cd /d %~dp0dock\tools\agent-simulator && node agent-sim.mjs"
cd /d %~dp0alrahma-frontend
call npm install --no-audit --no-fund
start "Al-Rahma Frontend :3000" cmd /k "npx next dev -p 3000"
echo Waiting for the API on http://localhost:8088/health ...
:waitapi
timeout /t 5 >nul
curl -s -o nul -w "%%{http_code}" http://localhost:8088/health | findstr 200 >nul
if errorlevel 1 goto waitapi
echo API is up. Opening the app...
start http://localhost:3000/staff/login
goto end
:badpw
echo Could not connect to PostgreSQL on %PGHOST%:%PGPORT% with that password. Is the PostgreSQL service running?
echo If this is the wrong server, set PGBIN and PGPORT in local-env.bat (see local-env.example.bat).
pause
goto end
:noschema
echo Database %DBNAME% exists but the table "users" is missing. Run alrahma-backend-final\database\schema_v5.sql on it.
pause
goto end
:schemafail
echo Applying the schema failed. See the messages above.
pause
:end
endlocal
