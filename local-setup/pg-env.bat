@echo off
REM Finds the local PostgreSQL for start-native.bat and run-tests.bat (called by them, not run directly).
REM Order: values already set in local-env.bat -> newest installed PostgreSQL 17..13 -> its port from postgresql.conf.
REM Sets PGBIN (folder with psql.exe), PGPORT, PGHOST, PGUSER. PostgreSQL 9.6 and older are skipped: the schema needs 13+.
if exist "%~dp0local-env.bat" call "%~dp0local-env.bat"
if not defined PGHOST set "PGHOST=localhost"
if not defined PGUSER set "PGUSER=postgres"
REM psql reads the UTF-8 migration files (Arabic text) correctly only with a UTF-8 client encoding.
if not defined PGCLIENTENCODING set "PGCLIENTENCODING=UTF8"
if defined PGBIN goto havebin
for %%v in (17 16 15 14 13) do (
  if not defined PGBIN if exist "C:\Program Files\PostgreSQL\%%v\bin\psql.exe" (
    set "PGBIN=C:\Program Files\PostgreSQL\%%v\bin"
    set "PGDATA_CONF=C:\Program Files\PostgreSQL\%%v\data\postgresql.conf"
  )
)
:havebin
if not defined PGBIN (
  echo  PostgreSQL 13 or newer was not found in "C:\Program Files\PostgreSQL".
  echo  Install PostgreSQL 16, or set PGBIN and PGPORT in local-env.bat ^(see local-env.example.bat^).
  exit /b 1
)
if defined PGPORT goto done
set "PGPORT=5432"
if not defined PGDATA_CONF goto done
if not exist "%PGDATA_CONF%" goto done
REM postgresql.conf line looks like: port = 5433    # comment
for /f "tokens=2 delims==#" %%p in ('findstr /r /c:"^ *port *=" "%PGDATA_CONF%"') do for /f "tokens=1" %%q in ("%%p") do set "PGPORT=%%q"
:done
echo  PostgreSQL: "%PGBIN%"  port %PGPORT%
exit /b 0
