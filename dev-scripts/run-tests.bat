@echo off
REM Backend integration tests on the local PostgreSQL (13+, found automatically; each run creates its own temporary database).
REM Needs the .NET 8 SDK or runtime (the test server does not run on .NET 10 alone).
REM Usage: run-tests.bat            (all tests)
REM        run-tests.bat Concurrency (only tests whose name contains the word)
REM Close the "Al-Rahma API :8088" window first: the build cannot overwrite the running API's files (MSB3027).
setlocal
cd /d %~dp0
call "%~dp0pg-env.bat" || (pause & goto end)
dotnet --list-runtimes | findstr /c:"Microsoft.AspNetCore.App 8." >nul
if errorlevel 1 (echo  .NET 8 is not installed. Install it with: winget install Microsoft.DotNet.SDK.8& pause & goto end)
set "PGPW=%PGPASSWORD%"
if defined PGPW goto run
echo Type the password of your local PostgreSQL user "%PGUSER%":
:askpw
set "PGPW="
set /p "PGPW=> "
if not defined PGPW (echo  Password is empty. Type it then press Enter.& goto askpw)
:run
set "TEST_DATABASE_URL=Host=%PGHOST%;Port=%PGPORT%;Username=%PGUSER%;Password=%PGPW%"
set "PGPW="
set "FARGS="
if not "%~1"=="" set "FARGS=--filter FullyQualifiedName~%~1"
echo Running tests... (log: %~dp0tests.log)
dotnet test alrahma-backend-final\tests\AlRahma.Api.Tests --logger "console;verbosity=normal" %FARGS% > tests.log 2>&1
set "TEST_DATABASE_URL="
findstr /C:"Passed!" /C:"Failed!" /C:"error CS" /C:"[FAIL]" tests.log
echo.
echo Full log: %~dp0tests.log
pause
:end
endlocal
