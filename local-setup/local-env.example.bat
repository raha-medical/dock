@echo off
REM Copy this file to local-env.bat (not committed) only if automatic detection picks the wrong PostgreSQL.
REM Example for a PC with PostgreSQL 15 on port 5433:
REM set "PGBIN=C:\Program Files\PostgreSQL\15\bin"
REM set "PGPORT=5433"
REM Optional: skip the password prompt on this PC only (never on a shared or production machine).
REM set "PGPASSWORD=..."
REM Optional, STAGING TESTING ONLY: Gemini key for the patient assistant (only the API window receives it).
REM Before any real patient, use a key from a Google Cloud project with billing enabled (free-tier prompts are used by Google).
REM set "GEMINI_API_KEY=..."
REM set "GEMINI_MODEL=gemini-3.5-flash-lite"
