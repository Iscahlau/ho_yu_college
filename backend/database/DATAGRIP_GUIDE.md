# DataGrip Setup Guide - Visual Walkthrough

This guide provides step-by-step instructions with detailed explanations for setting up DataGrip with the Ho Yu College local database.

## Prerequisites

- DataGrip installed (download from https://www.jetbrains.com/datagrip/)
- Database initialized (run `./scripts/init-sqlite.sh` or have Docker running)

## Option 1: SQLite Setup

### Step 1: Open DataGrip and Create New Data Source

1. Launch DataGrip
2. Click the **+** icon in the top-left or go to **File → New → Data Source → SQLite**

### Step 2: Configure Connection Settings

In the connection dialog that opens:

**Path**: Browse to your database file
```
/path/to/ho_yu_college/backend/database/ho_yu_college.db
```

**Example paths:**
- Linux/Mac: `/home/user/ho_yu_college/backend/database/ho_yu_college.db`
- Windows: `C:\Users\YourName\ho_yu_college\backend\database\ho_yu_college.db`

**Tips:**
- Click the folder icon to browse instead of typing
- Use absolute path, not relative
- The `.db` file should already exist (run init script first)

### Step 3: Download Driver (First Time Only)

When you first connect:
1. DataGrip will show "Download missing driver files"
2. Click **Download** button
3. Wait for driver installation to complete

### Step 4: Test Connection

1. Click **Test Connection** button
2. You should see: "✓ Successful" with connection time
3. If successful, click **OK** or **Apply**

### Step 5: Explore Your Database

After connecting, you'll see:

```
SQLite
└── ho_yu_college.db
    ├── tables
    │   ├── games (20 rows)
    │   ├── students (10 rows)
    │   └── teachers (3 rows)
    └── indexes
        ├── idx_games_difficulty
        ├── idx_games_student
        ├── idx_games_subject
        ├── idx_games_teacher
        ├── idx_students_class
        └── idx_students_teacher
```

**To view data:**
- Double-click any table name
- Or right-click → **Jump to Editor**
- Data appears in a spreadsheet-like view

## Option 2: PostgreSQL (Docker) Setup

### Step 1: Start PostgreSQL Container

Before connecting, ensure Docker is running:

```bash
cd backend/database
docker-compose up -d
```

Verify it's running:
```bash
docker-compose ps
# Should show: ho-yu-college-db (Up)
```

### Step 2: Open DataGrip and Create New Data Source

1. Launch DataGrip
2. Click the **+** icon or go to **File → New → Data Source → PostgreSQL**

### Step 3: Configure Connection Settings

Fill in these fields:

| Field | Value |
|-------|-------|
| **Host** | `localhost` |
| **Port** | `5432` |
| **Database** | `ho_yu_college` |
| **User** | `ho_yu_dev` |
| **Password** | `dev_password_2024` |

**Authentication:**
- Select **User & Password** authentication
- Check **Save password** for convenience

**Tips:**
- All fields are case-sensitive
- Don't include quotes around values
- Port 5432 is PostgreSQL default

### Step 4: Download PostgreSQL Driver (First Time Only)

1. DataGrip will prompt for driver download
2. Click **Download** button
3. Wait for installation to complete

### Step 5: Test Connection

1. Click **Test Connection** button
2. Expected result: "✓ Successful" message
3. If successful, click **OK**

### Step 6: Explore Your Database

After connecting, navigate:

```
PostgreSQL - ho_yu_dev@localhost
└── ho_yu_college
    └── schemas
        └── public
            ├── tables
            │   ├── games (20 rows)
            │   ├── students (10 rows)
            │   └── teachers (3 rows)
            └── indexes
                ├── idx_games_difficulty
                ├── idx_games_student
                ├── idx_games_subject
                └── ...
```

## Common DataGrip Operations

### Running SQL Queries

1. Right-click on your database → **New → Query Console**
2. Type your SQL query
3. Press **Ctrl+Enter** (Mac: **Cmd+Enter**) to run

**Example queries to try:**

```sql
-- View all students sorted by marks
SELECT student_id, name_1, name_2, marks, class
FROM students
ORDER BY marks DESC;

-- Find games for a specific student
SELECT game_name, subject, difficulty, accumulated_click
FROM games
WHERE student_id = 'STU001';

-- Count games by subject
SELECT subject, COUNT(*) as game_count
FROM games
GROUP BY subject
ORDER BY game_count DESC;

-- Teacher's students with their best games
SELECT 
    s.name_1 as student,
    s.marks,
    g.game_name,
    g.subject,
    g.accumulated_click
FROM students s
JOIN games g ON s.student_id = g.student_id
WHERE s.teacher_id = 'TCH001'
ORDER BY s.marks DESC, g.accumulated_click DESC;
```

### Viewing Table Schema

1. Right-click on a table
2. Select **Jump to DDL** or **Modify Table**
3. See complete table structure with columns, types, constraints

### Editing Data

1. Double-click a table to open data view
2. Click any cell to edit
3. Press **Enter** to save changes
4. Click **Submit** button to commit to database

**⚠️ Warning:** This modifies the database. Use reset script to restore mock data.

### Exporting Data

1. Right-click on a table
2. Select **Export Data** or **Dump Data to File**
3. Choose format:
   - CSV for spreadsheets
   - JSON for web development
   - SQL for backups
4. Select location and export

### Importing Data

1. Right-click on a table
2. Select **Import Data from File**
3. Choose your file (CSV, JSON, SQL)
4. Map columns if needed
5. Click **Import**

### Refreshing Data

After running scripts or external changes:
- Right-click database → **Refresh**
- Or press **F5**
- Or click the refresh icon in toolbar

## Troubleshooting DataGrip

### Issue: "Can't connect to database"

**For SQLite:**
- ✓ Verify database file exists: `ls backend/database/ho_yu_college.db`
- ✓ Use absolute path, not relative
- ✓ Check file permissions: `chmod 644 ho_yu_college.db`

**For PostgreSQL:**
- ✓ Verify Docker container is running: `docker-compose ps`
- ✓ Check port not blocked: `telnet localhost 5432`
- ✓ Verify credentials match docker-compose.yml
- ✓ Check Docker logs: `docker-compose logs postgres`

### Issue: "Driver not found"

1. Go to **File → Data Sources**
2. Select your data source
3. Click **Drivers** tab
4. Find SQLite or PostgreSQL
5. Click **Update** or **Download**

### Issue: "Database locked" (SQLite only)

- Close other connections to the database
- Close sqlite3 CLI if open
- Restart DataGrip

### Issue: "Permission denied"

**On Linux/Mac:**
```bash
chmod 644 backend/database/ho_yu_college.db
```

**On Windows:**
- Right-click database file → Properties
- Security tab → Edit permissions
- Ensure your user has Read/Write access

### Issue: "Tables not showing"

1. Expand the database tree fully
2. Look under **schemas → public → tables** (PostgreSQL)
3. Click refresh icon or press F5
4. If still empty, verify data: Run init script again

## Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Execute query | Ctrl+Enter | Cmd+Enter |
| New query console | Ctrl+Shift+L | Cmd+Shift+L |
| Refresh database | F5 | F5 |
| SQL auto-complete | Ctrl+Space | Cmd+Space |
| Format SQL | Ctrl+Alt+L | Cmd+Option+L |
| Find in files | Ctrl+Shift+F | Cmd+Shift+F |

## Best Practices

### DO:
✅ Use query consoles for testing queries  
✅ Refresh data after running external scripts  
✅ Export data before making bulk changes  
✅ Use transactions for multiple related changes  
✅ Comment your SQL queries for documentation  
✅ Use the reset script to restore clean state

### DON'T:
❌ Edit data directly without backup  
❌ Delete tables (use reset script instead)  
❌ Connect to production databases from local DataGrip  
❌ Store sensitive data in mock database  
❌ Commit the .db file to git

## Example Workflow

### Daily Development Workflow:

1. **Morning: Start fresh**
   ```bash
   cd backend/database
   ./scripts/reset-database.sh  # Clean slate
   ```

2. **Open DataGrip**
   - Connect to database
   - Refresh to see clean data

3. **Test queries**
   - Open query console
   - Write and test SQL
   - Verify results

4. **Make changes**
   - Update records
   - Test application logic
   - Verify with queries

5. **End of day: Reset if needed**
   ```bash
   ./scripts/reset-database.sh  # For tomorrow
   ```

### Feature Development Workflow:

1. **Create feature branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Reset database**
   ```bash
   cd backend/database
   ./scripts/reset-database.sh
   ```

3. **Develop with DataGrip**
   - Test queries in query console
   - Validate data relationships
   - Export test data if needed

4. **Document queries**
   - Save useful queries in project
   - Add comments explaining logic

5. **Commit code (not database)**
   ```bash
   git add <your-files>
   git commit -m "Add feature"
   # Note: .db files are in .gitignore
   ```

## Additional Resources

- **DataGrip Documentation**: https://www.jetbrains.com/help/datagrip/
- **SQLite Tutorial**: https://www.sqlitetutorial.net/
- **PostgreSQL Tutorial**: https://www.postgresqltutorial.com/
- **SQL Cheat Sheet**: https://www.sqltutorial.org/sql-cheat-sheet/

## Getting Help

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Review `backend/database/README.md` for detailed documentation
3. Check `backend/database/QUICK_START.md` for quick commands
4. Verify your setup with the test queries above
5. Check DataGrip logs: **Help → Show Log in Explorer**

---

**Remember:** This is a development database. All changes can be reset with `./scripts/reset-database.sh`
