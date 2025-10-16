# Mock Server Setup and Excel Upload Testing Guide

This comprehensive guide provides step-by-step instructions for setting up and running a mock server with a local database for local development and testing, specifically for the Excel upload functionality for students, teachers, and games.

## 📋 Table of Contents

- [Overview](#overview)
- [Environment Requirements](#environment-requirements)
- [Quick Start](#quick-start)
- [Detailed Setup Instructions](#detailed-setup-instructions)
- [Database Configuration](#database-configuration)
- [Running the Mock Server](#running-the-mock-server)
- [Excel Upload Feature](#excel-upload-feature)
- [Testing and Verification](#testing-and-verification)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The mock server simulates the backend AWS infrastructure locally, allowing you to:
- Develop and test frontend features without AWS deployment
- Upload Excel/CSV files for students, teachers, and games
- Test authentication endpoints
- Track game interactions and clicks
- Work with a local database (SQLite or PostgreSQL)

**Key Features:**
- ✅ Full REST API implementation matching production
- ✅ Excel/CSV upload processing (up to 4,000 records)
- ✅ Local SQLite or PostgreSQL database
- ✅ Pre-populated mock data (10 students, 3 teachers, 20 games)
- ✅ Hot-reload for rapid development
- ✅ CORS enabled for frontend integration

## 🔧 Environment Requirements

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Node.js** | v18+ (v20.19.5 recommended) | Runtime environment |
| **npm** | v10+ | Package manager |
| **SQLite** | v3.x | Local database (Option 1) |
| **Docker** | v20+ | PostgreSQL setup (Option 2) |
| **Git** | Latest | Version control |

### Check Your Environment

```bash
# Check Node.js version
node --version
# Expected: v18.x.x or higher

# Check npm version
npm --version
# Expected: v10.x.x or higher

# Check if SQLite is installed
sqlite3 --version
# Expected: 3.x.x

# Check if Docker is installed (optional)
docker --version
# Expected: 20.x.x or higher
```

### Install Missing Tools

**Ubuntu/Debian:**
```bash
# Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# SQLite
sudo apt-get install sqlite3
```

**macOS:**
```bash
# Using Homebrew
brew install node@20
brew install sqlite3
```

**Windows:**
- Download Node.js from [nodejs.org](https://nodejs.org/)
- Download SQLite from [sqlite.org](https://www.sqlite.org/download.html)

## 🚀 Quick Start

For those familiar with the project, here's the fastest way to get started:

```bash
# 1. Clone and navigate to repository
git clone https://github.com/Iscahlau/ho_yu_college.git
cd ho_yu_college

# 2. Install backend dependencies
cd backend
npm install

# 3. Setup local database (SQLite - fastest option)
cd database
chmod +x scripts/*.sh
./scripts/init-sqlite.sh
cd ..

# 4. Start mock server (Terminal 1)
npm run mock-server
# Server will run on http://localhost:3000

# 5. Start frontend (Terminal 2)
cd ../frontend
npm install
echo "VITE_API_URL=http://localhost:3000" > .env.local
npm run dev
# Frontend will run on http://localhost:5173
```

Access the application at **http://localhost:5173**

## 📚 Detailed Setup Instructions

### Step 1: Clone the Repository

```bash
# Clone from GitHub
git clone https://github.com/Iscahlau/ho_yu_college.git

# Navigate to project directory
cd ho_yu_college

# Verify structure
ls -la
# Expected: README.md, backend/, frontend/, .github/
```

### Step 2: Install Backend Dependencies

```bash
# Navigate to backend directory
cd backend

# Install all dependencies (takes ~30 seconds)
npm install

# Verify installation
npm list --depth=0
```

**Expected dependencies:**
- `express` - Web server framework
- `cors` - CORS middleware
- `xlsx` - Excel file processing
- `@aws-sdk/client-dynamodb` - AWS SDK (for production)
- `ts-node-dev` - TypeScript hot-reload

### Step 3: Build Backend

```bash
# Compile TypeScript to JavaScript
npm run build

# Expected output: Successful compilation with no errors
# This creates .js and .d.ts files for all .ts files
```

## 🗄️ Database Configuration

You have two options for local database setup. Choose based on your needs:

### Option 1: SQLite (Recommended for Solo Development)

**Advantages:**
- ✅ Zero configuration
- ✅ No external services required
- ✅ File-based (portable)
- ✅ Perfect for local development

**Setup Steps:**

```bash
# Navigate to database directory
cd backend/database

# Make scripts executable (Linux/macOS)
chmod +x scripts/*.sh

# Initialize database with mock data
./scripts/init-sqlite.sh

# Expected output:
# ✓ Tables created
# ✓ Mock data inserted
# - Teachers: 3 records
# - Students: 10 records
# - Games: 20 records
```

**Verify Database:**

```bash
# Connect to database
sqlite3 ho_yu_college.db

# Run queries
.mode column
.headers on
SELECT COUNT(*) FROM students;
# Expected: 10

SELECT COUNT(*) FROM teachers;
# Expected: 3

SELECT COUNT(*) FROM games;
# Expected: 20

# Exit sqlite
.quit
```

**Database Location:**
```
backend/database/ho_yu_college.db
```

### Option 2: PostgreSQL with Docker (Team Development)

**Advantages:**
- ✅ Production-like environment
- ✅ Team collaboration
- ✅ Web UI (pgAdmin) included
- ✅ Advanced SQL features

**Setup Steps:**

```bash
# Navigate to database directory
cd backend/database

# Start PostgreSQL and pgAdmin containers
docker-compose up -d

# Expected output:
# ✓ Network created
# ✓ PostgreSQL container started
# ✓ pgAdmin container started

# Verify containers are running
docker-compose ps
# Expected: Both containers in "Up" state
```

**Connection Details:**

| Parameter | Value |
|-----------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `ho_yu_college` |
| Username | `ho_yu_dev` |
| Password | `dev_password_2024` |

**pgAdmin Web UI:**
- URL: http://localhost:5050
- Email: `admin@hoyucollege.local`
- Password: `admin123`

**Apply Schema and Seed Data:**

```bash
# Connect to database and run SQL files
docker exec -i ho-yu-college-db psql -U ho_yu_dev -d ho_yu_college < schema/01_create_tables.sql
docker exec -i ho-yu-college-db psql -U ho_yu_dev -d ho_yu_college < seeds/02_insert_mock_data.sql

# Verify data
docker exec -it ho-yu-college-db psql -U ho_yu_dev -d ho_yu_college -c "SELECT COUNT(*) FROM students;"
# Expected: 10
```

### Visual Database Management (DataGrip)

**For SQLite:**
1. Open DataGrip → New Data Source → SQLite
2. Browse to: `backend/database/ho_yu_college.db`
3. Test Connection → OK

**For PostgreSQL:**
1. Open DataGrip → New Data Source → PostgreSQL
2. Host: `localhost`, Port: `5432`
3. Database: `ho_yu_college`
4. User: `ho_yu_dev`, Password: `dev_password_2024`
5. Test Connection → OK

See [backend/database/DATAGRIP_GUIDE.md](../backend/database/DATAGRIP_GUIDE.md) for detailed instructions with screenshots.

## 🎮 Running the Mock Server

### Start the Mock Server

```bash
# From backend directory
cd backend
npm run mock-server
```

**Expected Output:**
```
🚀 Mock server running on http://localhost:3000
📚 Serving mock data for local development

Available endpoints:
  POST   /auth/login
  GET    /games
  GET    /games/:gameId
  POST   /games/:gameId/click

Mock credentials:
  Students: STU001-STU010, password: "123"
  Teachers: TCH001-TCH002, password: "teacher123"
  Admin:    TCH003, password: "admin123"
```

### Environment Configuration (Optional)

The mock server works out-of-the-box without any configuration. However, you can optionally create a `.env` file if you want to customize settings:

```bash
# Create .env file (optional)
cd backend
cp .env.example .env

# Edit .env to change port if needed
# PORT=3000
```

**Note:** The mock server only requires the `PORT` configuration. It uses in-memory mock data and doesn't need database connection strings.

### Change Port (Optional)

If port 3000 is already in use:

```bash
# Option 1: Set PORT environment variable
PORT=3001 npm run mock-server

# Option 2: Create/edit .env file
echo "PORT=3001" > .env
npm run mock-server

# Update frontend configuration
cd ../frontend
echo "VITE_API_URL=http://localhost:3001" > .env.local
```

### Test Mock Server

```bash
# Test server is running
curl http://localhost:3000/games

# Expected: JSON array of all games

# Test authentication
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id":"STU001","password":"123"}'

# Expected: {"success": true, "user": {...}, "role": "student"}
```

### Connect Frontend to Mock Server

```bash
# Navigate to frontend directory
cd frontend

# Install frontend dependencies (if not done)
npm install

# Configure API endpoint
echo "VITE_API_URL=http://localhost:3000" > .env.local

# Start development server
npm run dev
# Runs on http://localhost:5173
```

## 📊 Excel Upload Feature

### Overview

The upload feature allows administrators to:
- **Bulk upload** student, teacher, and game data
- **Upsert operations**: Insert new records or update existing ones
- **Validate** file format, size, and record count
- **Process** up to 4,000 records per upload

### Supported File Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| Excel 2007+ | `.xlsx` | Recommended |
| Excel 97-2003 | `.xls` | Legacy format |
| CSV | `.csv` | Simple text format |

### File Constraints

| Constraint | Value | Reason |
|------------|-------|--------|
| Max File Size | 10 MB | API Gateway limit |
| Max Records | 4,000 | Lambda processing time |
| Encoding | UTF-8 | Proper character support |

### Excel File Structure

#### Students Upload

**Required Columns:**

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `student_id` | String | Unique identifier (required) | `STU001` |
| `name_1` | String | English name | `John Chan` |
| `name_2` | String | Chinese name | `陳大文` |
| `marks` | Integer | Score (0-1000) | `150` |
| `class` | String | Class identifier | `1A` |
| `class_no` | String | Class number | `01` |
| `teacher_id` | String | Assigned teacher | `TCH001` |
| `password` | String | Plain text password | `123` |
| `last_login` | ISO Date | Last login timestamp | `2024-01-15T09:30:00.000Z` |
| `last_update` | ISO Date | Last update timestamp | `2024-01-15T09:30:00.000Z` |

**Sample CSV:**
```csv
student_id,name_1,name_2,marks,class,class_no,teacher_id,password,last_login,last_update
STU011,Alice Smith,史愛麗,350,1A,11,TCH001,123,2024-01-20T09:00:00.000Z,2024-01-20T09:00:00.000Z
STU012,Bob Johnson,莊寶,520,1B,12,TCH002,123,2024-01-20T10:00:00.000Z,2024-01-20T10:00:00.000Z
```

**Download Template:** [students-template.csv](sample-excel/students-template.csv)

#### Teachers Upload

**Required Columns:**

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `teacher_id` | String | Unique identifier (required) | `TCH001` |
| `name` | String | Teacher name | `Mr. Wong` |
| `password` | String | Plain text password | `teacher123` |
| `responsible_class` | JSON Array | Assigned classes | `["1A", "2A"]` |
| `is_admin` | Boolean | Admin status | `false` |
| `last_login` | ISO Date | Last login timestamp | `2024-01-15T08:00:00.000Z` |

**Sample CSV:**
```csv
teacher_id,name,password,responsible_class,is_admin,last_login
TCH004,Ms. Davis,teacher123,"[""1C"", ""2C""]",false,2024-01-20T08:00:00.000Z
```

**Download Template:** [teachers-template.csv](sample-excel/teachers-template.csv)

#### Games Upload

**Required Columns:**

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `game_id` | String | Unique identifier (required) | `GAME001` |
| `game_name` | String | Game title | `Math Adventure` |
| `student_id` | String | Assigned student | `STU001` |
| `subject` | Enum | Subject category | `Mathematics` |
| `difficulty` | Enum | Difficulty level | `Beginner` |
| `teacher_id` | String | Supervising teacher | `TCH001` |
| `scratch_id` | String | Scratch project ID | `1207260630` |
| `scratch_api` | URL | Full Scratch URL | `https://scratch.mit.edu/projects/1207260630` |
| `accumulated_click` | Integer | Click count | `0` |
| `last_update` | ISO Date | Last update timestamp | `2024-01-20T09:00:00.000Z` |

**Valid Subject Values:**
- `Chinese Language`
- `English Language`
- `Mathematics`
- `Humanities and Science`

**Valid Difficulty Values:**
- `Beginner`
- `Intermediate`
- `Advanced`

**Important:** The `game_id` must match the last segment of the `scratch_api` URL!

**Sample CSV:**
```csv
game_id,game_name,student_id,subject,difficulty,teacher_id,scratch_id,scratch_api,accumulated_click,last_update
GAME021,Math Quiz,STU011,Mathematics,Beginner,TCH001,1234567890,https://scratch.mit.edu/projects/1234567890,0,2024-01-20T09:00:00.000Z
```

**Download Template:** [games-template.csv](sample-excel/games-template.csv)

### Preparing Excel Files

#### Using Microsoft Excel

1. **Open template** or create new workbook
2. **Add headers** in first row (exactly as shown above)
3. **Add data** starting from row 2
4. **Validate data:**
   - No empty required fields
   - Correct data types
   - Valid enum values
   - Proper date format (ISO 8601)
5. **Save as:**
   - Excel: File → Save As → Excel Workbook (*.xlsx)
   - CSV: File → Save As → CSV UTF-8 (*.csv)

#### Using Google Sheets

1. **Create spreadsheet** with proper headers
2. **Add data** rows
3. **Export:**
   - File → Download → Microsoft Excel (.xlsx)
   - File → Download → Comma-separated values (.csv)

#### Using LibreOffice Calc

1. **Create spreadsheet** with proper headers
2. **Add data** rows
3. **Save:**
   - File → Save As → Excel 2007-365 (.xlsx)
   - File → Save As → Text CSV (.csv) → Encoding: UTF-8

### Important Notes

#### Password Handling
- Passwords in Excel files are **plain text**
- System automatically hashes passwords (SHA-256) during upload
- Never upload files with real passwords to version control

#### Date Format
- Use ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Example: `2024-01-20T09:00:00.000Z`
- Timezone: UTC (indicated by `Z`)

#### Character Encoding
- Always use UTF-8 encoding for CSV files
- This ensures Chinese characters display correctly
- Excel users: Save as "CSV UTF-8" format

#### Validation Rules
- **Students:**
  - `marks` must be 0-1000
  - `teacher_id` must exist in teachers table
- **Teachers:**
  - `responsible_class` must be valid JSON array
  - At least one class required
- **Games:**
  - `game_id` must match `scratch_api` URL ending
  - `subject` and `difficulty` must be from valid enums
  - `student_id` and `teacher_id` must exist

## 🧪 Testing and Verification

### Upload Testing Workflow

#### 1. Access Upload Interface

**Option A: Via Frontend UI**
```bash
# Ensure servers are running:
# - Mock server on http://localhost:3000
# - Frontend on http://localhost:5173

# Login as admin
1. Navigate to http://localhost:5173
2. Login with: TCH003 / admin123
3. Navigate to Admin panel
4. Find upload section
```

**Option B: Via API Directly**
```bash
# Prepare test file
cat > test-students.csv << EOF
student_id,name_1,name_2,marks,class,class_no,teacher_id,password,last_login,last_update
STU011,Test Student,測試學生,100,1A,11,TCH001,123,2024-01-20T09:00:00.000Z,2024-01-20T09:00:00.000Z
EOF

# Convert file to base64 (for API testing)
BASE64_FILE=$(base64 -w 0 test-students.csv)

# Upload via API
curl -X POST http://localhost:3000/upload/students \
  -H "Content-Type: application/json" \
  -d "{\"file\":\"$BASE64_FILE\"}"
```

#### 2. Perform Upload

**Via Frontend:**
1. Click "Select File" button
2. Choose your Excel/CSV file
3. Wait for validation
4. Review success/error messages

**Via API:**
```bash
# Students endpoint
POST http://localhost:3000/upload/students

# Teachers endpoint
POST http://localhost:3000/upload/teachers

# Games endpoint
POST http://localhost:3000/upload/games
```

#### 3. Verify Upload Results

**Check Response:**
```json
{
  "success": true,
  "message": "Successfully processed 3 students (2 inserted, 1 updated)",
  "processed": 3,
  "inserted": 2,
  "updated": 1,
  "errors": []
}
```

**Verify in Database (SQLite):**
```bash
sqlite3 backend/database/ho_yu_college.db

# Check new students
SELECT * FROM students WHERE student_id = 'STU011';

# Count total students
SELECT COUNT(*) FROM students;

.quit
```

**Verify in Database (PostgreSQL):**
```bash
docker exec -it ho-yu-college-db psql -U ho_yu_dev -d ho_yu_college

# Check new students
SELECT * FROM students WHERE student_id = 'STU011';

# Count total students
SELECT COUNT(*) FROM students;

\q
```

**Verify via API:**
```bash
# Fetch all students
curl http://localhost:3000/students

# Fetch specific student
curl http://localhost:3000/students/STU011

# Test login with new credentials
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id":"STU011","password":"123"}'
```

### Test Scenarios

#### Test 1: Valid Upload (Happy Path)

**File:** 3 new students with valid data
**Expected:**
- ✅ Upload succeeds
- ✅ All 3 records inserted
- ✅ Records visible in database
- ✅ Login works with new credentials

#### Test 2: Update Existing Records

**File:** Modify marks for STU001 from 150 to 200
**Expected:**
- ✅ Upload succeeds
- ✅ 1 record updated
- ✅ Database shows new marks value
- ✅ Other fields unchanged

#### Test 3: Mixed Insert/Update

**File:** 2 new students + 1 existing student (updated)
**Expected:**
- ✅ Upload succeeds
- ✅ Response shows: 2 inserted, 1 updated
- ✅ All changes reflected in database

#### Test 4: File Too Large

**File:** 4,001 records
**Expected:**
- ❌ Upload rejected
- ❌ Error: "File contains 4,001 records. Maximum allowed is 4,000 records."

#### Test 5: Invalid Format

**File:** PDF or TXT file
**Expected:**
- ❌ Upload rejected
- ❌ Error: "Invalid file format. Only .xlsx, .xls, .csv files are supported."

#### Test 6: Missing Required Fields

**File:** Student without student_id
**Expected:**
- ⚠️ Upload partially succeeds
- ⚠️ Error for specific row: "Row 2: Missing student_id"
- ✅ Other valid rows processed

#### Test 7: Invalid Foreign Key

**File:** Student with teacher_id = "TCH999" (doesn't exist)
**Expected:**
- ⚠️ Upload partially succeeds
- ⚠️ Warning about invalid reference
- ✅ Other valid rows processed

#### Test 8: Empty File

**File:** Only headers, no data
**Expected:**
- ❌ Upload rejected
- ❌ Error: "File is empty or contains no valid data rows."

#### Test 9: Character Encoding

**File:** Students with Chinese names (UTF-8)
**Expected:**
- ✅ Upload succeeds
- ✅ Chinese characters display correctly
- ✅ Names readable in database

#### Test 10: Large Valid File

**File:** 3,500 records (within limit)
**Expected:**
- ✅ Upload succeeds (may take 10-30 seconds)
- ✅ All records processed
- ✅ Database updated correctly

### Performance Benchmarks

| Records | Expected Time | Notes |
|---------|---------------|-------|
| 10 | < 1 second | Instant |
| 100 | 1-2 seconds | Fast |
| 1,000 | 5-10 seconds | Normal |
| 4,000 | 20-40 seconds | Maximum limit |

### Automated Testing Script

Create a test script to validate upload functionality:

```bash
#!/bin/bash
# test-upload.sh

echo "🧪 Running Upload Tests"
echo "======================="

# Test 1: Valid upload
echo "Test 1: Valid student upload"
curl -X POST http://localhost:3000/upload/students \
  -H "Content-Type: application/json" \
  -d @test-data/valid-students.json
echo ""

# Test 2: Check database
echo "Test 2: Verify in database"
sqlite3 backend/database/ho_yu_college.db \
  "SELECT COUNT(*) FROM students WHERE student_id LIKE 'STU%';"
echo ""

# Test 3: Test login
echo "Test 3: Test new student login"
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id":"STU011","password":"123"}'
echo ""

echo "✅ Tests complete"
```

## 📚 API Documentation

### Authentication Endpoints

#### POST `/auth/login`

Authenticate a student or teacher.

**Request:**
```json
{
  "id": "STU001",
  "password": "123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "student_id": "STU001",
    "name_1": "John Chan",
    "name_2": "陳大文",
    "marks": 150,
    "class": "1A",
    "class_no": "01",
    "teacher_id": "TCH001",
    "last_login": "2024-01-15T09:30:00.000Z",
    "last_update": "2024-01-15T09:30:00.000Z"
  },
  "role": "student"
}
```

**Response (Error):**
```json
{
  "message": "Invalid credentials"
}
```

### Games Endpoints

#### GET `/games`

Fetch all games.

**Response:**
```json
[
  {
    "game_id": "GAME001",
    "game_name": "Math Adventure",
    "student_id": "STU001",
    "subject": "Mathematics",
    "difficulty": "Beginner",
    "teacher_id": "TCH001",
    "scratch_id": "1207260630",
    "scratch_api": "https://scratch.mit.edu/projects/1207260630",
    "accumulated_click": 15,
    "last_update": "2024-01-10T14:30:00.000Z"
  }
]
```

#### GET `/games/:gameId`

Fetch a single game by ID.

**Response:**
```json
{
  "game_id": "GAME001",
  "game_name": "Math Adventure",
  "accumulated_click": 15
}
```

#### POST `/games/:gameId/click`

Increment game click count.

**Response:**
```json
{
  "success": true,
  "accumulated_click": 16
}
```

### Upload Endpoints (Future Implementation)

> **Note:** Upload endpoints are currently implemented in Lambda functions for AWS deployment. For local testing with the mock server, you'll need to extend the mock server to handle file uploads. See [Enhancement Suggestions](#enhancement-suggestions).

#### POST `/upload/students`

Upload student data from Excel/CSV.

**Request:**
```json
{
  "file": "base64_encoded_file_content"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully processed 10 students (8 inserted, 2 updated)",
  "processed": 10,
  "inserted": 8,
  "updated": 2
}
```

**Response (Validation Error):**
```json
{
  "success": false,
  "message": "File contains 4,500 records. Maximum allowed is 4,000 records."
}
```

**Response (Processing Errors):**
```json
{
  "success": true,
  "message": "Processed 8 of 10 students",
  "processed": 8,
  "inserted": 6,
  "updated": 2,
  "errors": [
    "Row 5: Missing student_id",
    "Row 8: Invalid teacher_id reference"
  ]
}
```

## 🔍 Troubleshooting

### Common Issues

#### Issue 1: Port Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Option A: Use different port
PORT=3001 npm run mock-server

# Option B: Kill process using port 3000
# Linux/macOS
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### Issue 2: Database File Not Found

**Symptoms:**
```
Error: SQLITE_CANTOPEN: unable to open database file
```

**Solution:**
```bash
# Reinitialize database
cd backend/database
./scripts/init-sqlite.sh
```

#### Issue 3: Module Not Found Errors

**Symptoms:**
```
Error: Cannot find module 'express'
```

**Solution:**
```bash
# Reinstall dependencies
cd backend
rm -rf node_modules package-lock.json
npm install
```

#### Issue 4: TypeScript Compilation Errors

**Symptoms:**
```
error TS2307: Cannot find module 'aws-cdk-lib'
```

**Solution:**
```bash
# Ensure all dependencies installed
cd backend
npm install

# Clean and rebuild
rm -rf dist/
npm run build
```

#### Issue 5: CORS Errors in Browser

**Symptoms:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**
```bash
# Verify frontend is configured correctly
cd frontend
cat .env.local
# Should show: VITE_API_URL=http://localhost:3000

# Restart both servers
# Terminal 1: backend/npm run mock-server
# Terminal 2: frontend/npm run dev
```

#### Issue 6: Upload File Too Large

**Symptoms:**
```
Error: File size exceeds 10 MB limit
```

**Solution:**
- Split file into multiple smaller files
- Each file should have ≤ 4,000 records
- Remove unnecessary columns
- Compress images/data if embedded

#### Issue 7: Character Encoding Issues

**Symptoms:**
Chinese characters appear as `���` or `?????`

**Solution:**
```bash
# For CSV files, ensure UTF-8 encoding
file -i your-file.csv
# Should show: charset=utf-8

# Convert if needed
iconv -f GBK -t UTF-8 input.csv > output.csv
```

#### Issue 8: Docker Container Won't Start

**Symptoms:**
```
Error: port is already allocated
```

**Solution:**
```bash
# Check running containers
docker ps

# Stop conflicting container
docker stop <container_name>

# Or change port in docker-compose.yml
ports:
  - "5433:5432"  # Use different host port
```

#### Issue 9: Mock Server Won't Start

**Symptoms:**
```
TypeError: Cannot read property 'find' of undefined
```

**Solution:**
```bash
# Verify mock data files exist
ls backend/test/mocks/
# Should show: students.ts, teachers.ts, games.ts, index.ts

# Rebuild
npm run build
npm run mock-server
```

#### Issue 10: Frontend Can't Connect to Backend

**Symptoms:**
Frontend shows connection errors or 404s

**Solution:**
```bash
# 1. Verify mock server is running
curl http://localhost:3000/games
# Should return JSON data

# 2. Check frontend .env.local
cd frontend
cat .env.local
# Should show: VITE_API_URL=http://localhost:3000

# 3. Restart frontend
npm run dev
```

### Database Issues

#### Reset Database to Clean State

```bash
cd backend/database
./scripts/reset-database.sh
```

#### Check Database Connection

**SQLite:**
```bash
sqlite3 backend/database/ho_yu_college.db "SELECT 1;"
# Expected: 1
```

**PostgreSQL:**
```bash
docker exec -it ho-yu-college-db pg_isready -U ho_yu_dev
# Expected: accepting connections
```

#### View Database Logs

**PostgreSQL:**
```bash
docker-compose logs -f postgres
```

### Getting Help

If you encounter issues not covered here:

1. **Check existing documentation:**
   - [Main README](../README.md)
   - [Database Setup Guide](../backend/database/README.md)
   - [Mock Server README](../backend/mock-server/README.md)

2. **Review logs:**
   ```bash
   # Backend logs (check terminal where mock server is running)
   # Frontend logs (browser console: F12 → Console)
   ```

3. **Search GitHub Issues:**
   - https://github.com/Iscahlau/ho_yu_college/issues

4. **Create new issue:**
   - Include error messages
   - List steps to reproduce
   - Share environment details (OS, Node version, etc.)

## 📝 Best Practices

### Development Workflow

1. **Always start with clean database** for testing
   ```bash
   cd backend/database
   ./scripts/reset-database.sh
   ```

2. **Use version control** for test files
   ```bash
   git add docs/sample-excel/*.csv
   git commit -m "Add test data files"
   ```

3. **Keep mock data realistic** but clearly distinguishable from production

4. **Test incrementally** - start with small files, then scale up

5. **Document custom test scenarios** in project wiki

### Security Considerations

- ⚠️ **Never commit real passwords** to version control
- ⚠️ **Never upload files with production data** to mock server
- ⚠️ **Use environment variables** for sensitive configuration
- ⚠️ **Keep mock credentials simple** (e.g., "123", "test123")
- ⚠️ **Regularly reset mock database** to prevent data accumulation

### Performance Tips

- ✅ **Batch uploads** - combine records to reduce API calls
- ✅ **Validate locally** before uploading (use Excel validation)
- ✅ **Monitor file sizes** - stay well under 10 MB limit
- ✅ **Use CSV for large files** - faster parsing than XLSX
- ✅ **Test with production-like data volumes** (thousands of records)

### Testing Strategy

1. **Unit test** individual components
2. **Integration test** upload → database → API flow
3. **Manual test** via UI for user experience
4. **Performance test** with large files
5. **Error test** invalid data and edge cases

## 🚀 Enhancement Suggestions

### Future Improvements

To make this mock server even better, consider:

1. **Add Upload Endpoints to Mock Server**
   - Implement POST `/upload/students`
   - Implement POST `/upload/teachers`
   - Implement POST `/upload/games`
   - Use `multer` for file handling

2. **Add Query Filters**
   - Filter games by subject: GET `/games?subject=Mathematics`
   - Filter students by class: GET `/students?class=1A`
   - Search functionality

3. **Add Database Persistence**
   - Save changes to SQLite database
   - Implement proper CRUD operations
   - Add transaction support

4. **Add WebSocket Support**
   - Real-time updates
   - Live upload progress
   - Instant notifications

5. **Add Logging**
   - Request/response logging
   - Error tracking
   - Performance monitoring

6. **Add Authentication Middleware**
   - JWT token support
   - Session management
   - Role-based access control

### Contributing

To contribute improvements:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📚 Additional Resources

### Documentation Links

- [Main README](../README.md) - Project overview
- [Database Guide](../backend/database/README.md) - Detailed database documentation
- [Database Quick Start](../backend/database/QUICK_START.md) - Fast reference
- [DataGrip Guide](../backend/database/DATAGRIP_GUIDE.md) - Visual database setup
- [Mock Server README](../backend/mock-server/README.md) - Mock server details
- [Copilot Instructions](../.github/copilot-instructions.md) - Development guidelines

### External Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Excel/CSV Formats](https://www.loc.gov/preservation/digital/formats/fdd/fdd000510.shtml)

### Sample Files

All sample Excel/CSV template files are located in: `docs/sample-excel/`

- [students-template.csv](sample-excel/students-template.csv)
- [teachers-template.csv](sample-excel/teachers-template.csv)
- [games-template.csv](sample-excel/games-template.csv)

---

## 📞 Support

For questions, issues, or suggestions, please:

1. Check this guide and related documentation
2. Search existing GitHub issues
3. Create a new issue with details
4. Contact the development team

**Happy Testing! 🎉**
