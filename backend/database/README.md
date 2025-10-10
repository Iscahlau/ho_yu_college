# Local Mock Database for Development

This directory contains everything needed to set up a local relational database for Ho Yu College development and testing with DataGrip or other database tools.

## 🎯 Overview

While the production system uses AWS DynamoDB (NoSQL), this local database provides:

- ✅ **SQL-based development environment** for easier testing and debugging
- ✅ **Pre-populated mock data** matching the test suite (10 students, 3 teachers, 20 games)
- ✅ **DataGrip integration** for visual database management
- ✅ **Zero-configuration SQLite** option for instant setup
- ✅ **Docker-based PostgreSQL** option for production-like environment
- ✅ **Easy reset/reseed** capabilities for clean testing

## 📁 Directory Structure

```
database/
├── schema/
│   └── 01_create_tables.sql      # Table definitions with indexes
├── seeds/
│   └── 02_insert_mock_data.sql   # Mock data (10 students, 3 teachers, 20 games)
├── scripts/
│   ├── init-sqlite.sh            # Initialize SQLite database
│   └── reset-database.sh         # Reset database to clean state
├── docker-compose.yml            # PostgreSQL + pgAdmin setup
├── README.md                     # This file
└── ho_yu_college.db              # SQLite database (created after init)
```

## 🚀 Quick Start

### Option 1: SQLite (Recommended for Local Dev)

**Fastest setup - no installation required!**

```bash
cd backend/database
./scripts/init-sqlite.sh
```

This creates `ho_yu_college.db` with all tables and mock data.

**Verify the setup:**
```bash
sqlite3 ho_yu_college.db "SELECT COUNT(*) FROM students;"
# Expected output: 10
```

### Option 2: PostgreSQL with Docker

**For production-like environment and team collaboration:**

```bash
cd backend/database
docker-compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **pgAdmin** on `http://localhost:5050`

**Database credentials:**
- Host: `localhost`
- Port: `5432`
- Database: `ho_yu_college`
- Username: `ho_yu_dev`
- Password: `dev_password_2024`

**pgAdmin credentials:**
- URL: `http://localhost:5050`
- Email: `admin@hoyucollege.local`
- Password: `admin123`

## 🗄️ Database Schema

### Tables

#### **teachers**
- `teacher_id` (PK) - Unique teacher identifier
- `name` - Teacher name
- `password` - SHA-256 hashed password
- `responsible_class` - JSON array of assigned classes
- `last_login` - Last login timestamp
- `is_admin` - Admin flag

#### **students**
- `student_id` (PK) - Unique student identifier
- `name_1` - English name
- `name_2` - Chinese name
- `marks` - Student score (0-1000)
- `class` - Class identifier (e.g., "1A", "2B")
- `class_no` - Class number
- `last_login` - Last login timestamp
- `last_update` - Last update timestamp
- `teacher_id` (FK) - Reference to teachers table
- `password` - SHA-256 hashed password

#### **games**
- `game_id` (PK) - Scratch project ID (must match scratch_api URL)
- `game_name` - Name of the game
- `student_id` (FK) - Reference to students table
- `subject` - Subject category
- `difficulty` - Difficulty level
- `teacher_id` (FK) - Reference to teachers table
- `last_update` - Last update timestamp
- `scratch_id` - Scratch project identifier
- `scratch_api` - Full Scratch project URL
- `accumulated_click` - Click count for analytics

### Indexes

- `idx_students_teacher` - Query students by teacher
- `idx_games_teacher` - Query games by teacher
- `idx_games_student` - Query games by student
- `idx_students_class` - Query students by class
- `idx_games_subject` - Query games by subject
- `idx_games_difficulty` - Query games by difficulty

## 🔧 DataGrip Setup Instructions

### For SQLite

1. **Open DataGrip** and click **New Data Source** → **SQLite**

2. **Configure the connection:**
   - **Path**: Browse to `backend/database/ho_yu_college.db`
     - Example: `/home/user/ho_yu_college/backend/database/ho_yu_college.db`
   - Leave other settings as default

3. **Test Connection:**
   - Click **Test Connection**
   - If prompted, download SQLite drivers (automatic)
   - You should see "Successful" message

4. **Apply and Connect:**
   - Click **OK**
   - Your database will appear in the Database Explorer

5. **Explore Data:**
   - Expand the database tree
   - See tables: `teachers`, `students`, `games`
   - Right-click any table → **Jump to Editor** to view data

### For PostgreSQL (Docker)

1. **Start the database** (if not already running):
   ```bash
   cd backend/database
   docker-compose up -d
   ```

2. **Open DataGrip** and click **New Data Source** → **PostgreSQL**

3. **Configure the connection:**
   - **Host**: `localhost`
   - **Port**: `5432`
   - **Database**: `ho_yu_college`
   - **User**: `ho_yu_dev`
   - **Password**: `dev_password_2024`
   - **Save password**: Check this for convenience

4. **Test Connection:**
   - Click **Test Connection**
   - If prompted, download PostgreSQL drivers (automatic)
   - You should see "Successful" message

5. **Apply and Connect:**
   - Click **OK**
   - Your database will appear in the Database Explorer

6. **Explore Data:**
   - Expand `ho_yu_college` → `public` → `tables`
   - See tables: `teachers`, `students`, `games`
   - Double-click any table to view data

### DataGrip Tips

**Run Queries:**
```sql
-- View all students
SELECT * FROM students ORDER BY class, class_no;

-- View all games for a specific student
SELECT g.game_name, g.subject, g.difficulty, g.accumulated_click
FROM games g
WHERE g.student_id = 'STU001';

-- View teacher's students
SELECT s.student_id, s.name_1, s.name_2, s.class, s.marks
FROM students s
WHERE s.teacher_id = 'TCH001'
ORDER BY s.marks DESC;

-- View game statistics by subject
SELECT subject, COUNT(*) as count, AVG(accumulated_click) as avg_clicks
FROM games
GROUP BY subject;
```

**Import Additional Data:**
1. Right-click on a table → **Import Data from File**
2. Select CSV/SQL file
3. Map columns
4. Import

**Export Data:**
1. Right-click on a table → **Export Data**
2. Choose format (CSV, JSON, SQL, etc.)
3. Configure options
4. Export

## 📊 Mock Data Overview

### Teachers (3 records)

| teacher_id | name | password | responsible_class | is_admin |
|------------|------|----------|-------------------|----------|
| TCH001 | Mr. Wong | teacher123 | ["1A", "2A"] | false |
| TCH002 | Ms. Chan | teacher123 | ["1B"] | false |
| TCH003 | Dr. Lee | admin123 | ["2B"] | true |

### Students (10 records)

| student_id | name_1 | name_2 | marks | class | teacher_id |
|------------|--------|--------|-------|-------|------------|
| STU001 | John Chan | 陳大文 | 150 | 1A | TCH001 |
| STU002 | Mary Wong | 黃小明 | 280 | 1A | TCH001 |
| STU003 | Peter Lee | 李小龍 | 450 | 1A | TCH001 |
| STU004 | Sarah Lam | 林美華 | 620 | 1B | TCH002 |
| STU005 | David Cheng | 鄭志明 | 340 | 1B | TCH002 |
| STU006 | Emily Ng | 吳雅文 | 780 | 2A | TCH001 |
| STU007 | Michael Tsang | 曾俊傑 | 520 | 2A | TCH001 |
| STU008 | Jessica Liu | 劉嘉欣 | 890 | 2B | TCH003 |
| STU009 | Kevin Tam | 譚偉強 | 410 | 2B | TCH003 |
| STU010 | Cindy Ho | 何思穎 | 950 | 2B | TCH003 |

### Games (20 records)

Games span all subjects (Chinese, English, Math, Humanities) and difficulty levels (Beginner, Intermediate, Advanced). Each game is assigned to a student and tracked by click count.

**All students use password**: `123`
**Regular teachers**: `teacher123`
**Admin teacher**: `admin123`

## 🔄 Database Operations

### Reset Database to Fresh State

If you've modified data and want to start fresh:

```bash
cd backend/database
./scripts/reset-database.sh
```

This will:
1. Delete all existing data
2. Re-insert mock data
3. Verify record counts

### Recreate Database from Scratch

```bash
cd backend/database
rm ho_yu_college.db  # Remove old database
./scripts/init-sqlite.sh  # Create new one
```

### Manual SQL Operations

**Connect with sqlite3 CLI:**
```bash
sqlite3 backend/database/ho_yu_college.db
```

**Useful commands:**
```sql
-- List all tables
.tables

-- Show table schema
.schema students

-- Pretty print query results
.mode column
.headers on
SELECT * FROM students LIMIT 5;

-- Exit
.quit
```

## 🛡️ Best Practices

### Data Isolation

✅ **DO:**
- Use this database for local development and testing only
- Reset database frequently to ensure clean state
- Keep mock data clearly distinguishable from real data
- Document any schema changes

❌ **DON'T:**
- Connect to production databases from local environment
- Store real student/teacher data in mock database
- Commit the `.db` file to git (already in .gitignore)
- Share database files with sensitive data

### Password Security

- Mock passwords are intentionally simple (`123`, `teacher123`)
- All passwords are SHA-256 hashed in the database
- **Never commit real passwords** to the repository
- Use environment variables for production credentials

### Schema Maintenance

When updating schema:
1. Modify `schema/01_create_tables.sql`
2. Update `seeds/02_insert_mock_data.sql` if needed
3. Test with fresh database: `./scripts/init-sqlite.sh`
4. Update this README if table structure changes
5. Update TypeScript interfaces in `frontend/src/types/index.ts`

## 🐳 Docker Management

### Start Database
```bash
docker-compose up -d
```

### Stop Database (preserves data)
```bash
docker-compose stop
```

### Stop and Remove (deletes data)
```bash
docker-compose down -v
```

### View Logs
```bash
docker-compose logs -f postgres
```

### Database Backup (PostgreSQL)
```bash
docker exec ho-yu-college-db pg_dump -U ho_yu_dev ho_yu_college > backup.sql
```

### Database Restore (PostgreSQL)
```bash
docker exec -i ho-yu-college-db psql -U ho_yu_dev ho_yu_college < backup.sql
```

## 🔍 Troubleshooting

### SQLite Issues

**Database file not found:**
```bash
# Run initialization script
cd backend/database
./scripts/init-sqlite.sh
```

**Permission denied:**
```bash
chmod +x scripts/*.sh
```

**Corrupt database:**
```bash
rm ho_yu_college.db
./scripts/init-sqlite.sh
```

### Docker Issues

**Port 5432 already in use:**
```bash
# Check what's using the port
lsof -i :5432

# Stop conflicting service or change port in docker-compose.yml
```

**Container won't start:**
```bash
# Check logs
docker-compose logs postgres

# Remove and recreate
docker-compose down -v
docker-compose up -d
```

**Can't connect to database:**
```bash
# Check container status
docker-compose ps

# Ensure database is healthy
docker-compose exec postgres pg_isready -U ho_yu_dev
```

### DataGrip Issues

**Can't connect to SQLite:**
- Ensure database file exists at the correct path
- Check file permissions (should be readable)
- Try absolute path instead of relative path

**Can't connect to PostgreSQL:**
- Verify Docker container is running: `docker-compose ps`
- Check credentials match docker-compose.yml
- Test connection with psql: `psql -h localhost -U ho_yu_dev -d ho_yu_college`
- Ensure no firewall blocking port 5432

**Drivers not downloading:**
- Check internet connection
- Try manual driver installation in DataGrip settings
- Restart DataGrip

## 📚 Additional Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [DataGrip Documentation](https://www.jetbrains.com/help/datagrip/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 🤝 Contributing

When adding new mock data:

1. Edit appropriate SQL file in `seeds/`
2. Maintain referential integrity (valid foreign keys)
3. Use realistic but clearly fake data
4. Update this README with changes
5. Test with: `./scripts/reset-database.sh`

## 📝 Notes

- Database schema mirrors DynamoDB structure for consistency
- Timestamps use ISO 8601 format (UTC)
- Student marks range: 0-1000 (validated by CHECK constraint)
- Game IDs must match Scratch API URL (e.g., game_id='1207260630' → scratch_api ends with '/1207260630')
- All mock data sourced from `backend/test/mocks/` TypeScript files
