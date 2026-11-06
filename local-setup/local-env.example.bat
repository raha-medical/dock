@echo off
REM Copy this file to local-env.bat (not committed) only if automatic detection picks the wrong PostgreSQL.
REM Example for a PC with PostgreSQL 15 on port 5433:
REM set "PGBIN=C:\Program Files\PostgreSQL\15\bin"
REM set "PGPORT=5433"
REM Optional: skip the password prompt on this PC only (never on a shared or production machine).
REM set "PGPASSWORD=..."
