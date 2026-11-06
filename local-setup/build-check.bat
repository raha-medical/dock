@echo off
REM Builds the backend and the tests and saves the compiler output to build.log (no password needed).
cd /d %~dp0
echo Building backend... (log: %~dp0build.log)
dotnet build backend\AlRahma.sln -nologo > build.log 2>&1
findstr /C:"error CS" /C:"Build succeeded" /C:"Build FAILED" build.log
echo.
echo Done. Full log: %~dp0build.log
pause
