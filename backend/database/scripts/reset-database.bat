@echo off
REM Reset database to initial state with fresh mock data (Windows)
REM Usage: reset-database.bat [database_name]

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "DB_DIR=%SCRIPT_DIR%.."
set "SEEDS_DIR=%DB_DIR%\seeds"

REM Default database name
if "%1"=="" (
    set "DB_NAME=ho_yu_college.db"
) else (
    set "DB_NAME=%1"
)
set "DB_PATH=%DB_DIR%\%DB_NAME%"

echo ============================================
echo Ho Yu College - Database Reset
echo ============================================
echo.

REM Check if database exists
if not exist "%DB_PATH%" (
    echo ERROR: Database not found at: %DB_PATH%
    echo.
    echo Run init-sqlite.bat first to create the database
    pause
    exit /b 1
)

echo WARNING: This will DELETE all data and reset to mock data
echo Database: %DB_PATH%
echo.
set /p "REPLY=Are you sure you want to continue? (y/N) "

if /i not "%REPLY%"=="y" (
    echo Reset cancelled
    pause
    exit /b 0
)

echo.
echo Resetting database...
echo.

REM Clear existing data
echo 1. Clearing existing data...
sqlite3 "%DB_PATH%" "DELETE FROM games; DELETE FROM students; DELETE FROM teachers;"
echo    Data cleared

REM Re-insert mock data
echo 2. Inserting fresh mock data...
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
echo Database reset complete!
echo ============================================
echo.
pause
