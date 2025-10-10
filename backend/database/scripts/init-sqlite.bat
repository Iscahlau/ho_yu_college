@echo off
REM Initialize SQLite database with schema and mock data (Windows)
REM Usage: init-sqlite.bat [database_name]

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "DB_DIR=%SCRIPT_DIR%.."
set "SCHEMA_DIR=%DB_DIR%\schema"
set "SEEDS_DIR=%DB_DIR%\seeds"

REM Default database name
if "%1"=="" (
    set "DB_NAME=ho_yu_college.db"
) else (
    set "DB_NAME=%1"
)
set "DB_PATH=%DB_DIR%\%DB_NAME%"

echo ============================================
echo Ho Yu College - SQLite Database Setup
echo ============================================
echo.

REM Check if sqlite3 is installed
where sqlite3 >nul 2>&1
if errorlevel 1 (
    echo ERROR: sqlite3 is not installed
    echo.
    echo Download from: https://www.sqlite.org/download.html
    echo Extract sqlite3.exe to a directory in your PATH
    echo.
    pause
    exit /b 1
)

REM Remove existing database if it exists
if exist "%DB_PATH%" (
    echo WARNING: Database already exists at: %DB_PATH%
    set /p "REPLY=Do you want to remove it and create a fresh database? (y/N) "
    if /i not "!REPLY!"=="y" (
        echo Setup cancelled
        pause
        exit /b 0
    )
    del "%DB_PATH%"
    echo Removed existing database
)

echo Creating database: %DB_NAME%
echo.

REM Create database and apply schema
echo 1. Creating tables...
sqlite3 "%DB_PATH%" < "%SCHEMA_DIR%\01_create_tables.sql"
echo    Tables created

REM Insert mock data
echo 2. Inserting mock data...
sqlite3 "%DB_PATH%" < "%SEEDS_DIR%\02_insert_mock_data.sql"
echo    Mock data inserted

REM Verify data
echo.
echo 3. Verifying data...
for /f %%i in ('sqlite3 "%DB_PATH%" "SELECT COUNT(*) FROM teachers;"') do set TEACHER_COUNT=%%i
for /f %%i in ('sqlite3 "%DB_PATH%" "SELECT COUNT(*) FROM students;"') do set STUDENT_COUNT=%%i
for /f %%i in ('sqlite3 "%DB_PATH%" "SELECT COUNT(*) FROM games;"') do set GAME_COUNT=%%i

echo    - Teachers: %TEACHER_COUNT% records
echo    - Students: %STUDENT_COUNT% records
echo    - Games: %GAME_COUNT% records

echo.
echo ============================================
echo Database setup complete!
echo ============================================
echo.
echo Database location: %DB_PATH%
echo.
echo To connect with sqlite3 CLI:
echo   sqlite3 %DB_PATH%
echo.
echo To connect with DataGrip:
echo   1. Add new Data Source -^> SQLite
echo   2. Path: %DB_PATH%
echo   3. Test connection and apply
echo.
echo Test credentials:
echo   Students: STU001-STU010, password: 123
echo   Teachers: TCH001-TCH002, password: teacher123
echo   Admin: TCH003, password: admin123
echo.
pause
