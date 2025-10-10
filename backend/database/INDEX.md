# Database Documentation Index

Complete guide to the Ho Yu College local mock database for development.

## 📚 Documentation Files

### Quick Reference
- **[QUICK_START.md](QUICK_START.md)** - Fast setup guide with common commands
  - Connection details
  - Test credentials
  - Common operations
  - Troubleshooting

### Complete Guides
- **[README.md](README.md)** - Main documentation (11KB+)
  - Full setup instructions
  - Schema details
  - Mock data overview
  - Best practices
  
- **[DATAGRIP_GUIDE.md](DATAGRIP_GUIDE.md)** - DataGrip walkthrough (9KB+)
  - Step-by-step setup
  - Visual examples
  - Query examples
  - Troubleshooting

- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - DynamoDB to SQL guide (10KB+)
  - Architecture comparison
  - Schema mapping
  - Query translation
  - Development workflow

## 🗂️ File Structure

```
database/
├── README.md                  # Main documentation
├── QUICK_START.md            # Quick reference
├── DATAGRIP_GUIDE.md         # DataGrip setup guide
├── MIGRATION_GUIDE.md        # DynamoDB comparison
├── INDEX.md                  # This file
│
├── schema/
│   └── 01_create_tables.sql  # Table definitions (4KB)
│
├── seeds/
│   └── 02_insert_mock_data.sql  # Mock data (8KB)
│
├── scripts/
│   ├── init-sqlite.sh        # Initialize DB (Linux/Mac)
│   ├── init-sqlite.bat       # Initialize DB (Windows)
│   ├── reset-database.sh     # Reset data (Linux/Mac)
│   ├── reset-database.bat    # Reset data (Windows)
│   └── test-database.sh      # Validate DB (Linux/Mac)
│
├── docker-compose.yml        # PostgreSQL + pgAdmin
├── .gitignore               # Ignore .db files
└── ho_yu_college.db         # SQLite database (created by init)
```

## 🎯 Where to Start?

### New to the Project?
1. Start with **[QUICK_START.md](QUICK_START.md)**
2. Run `./scripts/init-sqlite.sh`
3. Follow **[DATAGRIP_GUIDE.md](DATAGRIP_GUIDE.md)** to connect

### Setting Up DataGrip?
1. Read **[DATAGRIP_GUIDE.md](DATAGRIP_GUIDE.md)**
2. Follow step-by-step instructions
3. Try example queries

### Need Schema Details?
1. Check **[README.md](README.md)** Schema section
2. View `schema/01_create_tables.sql`
3. See mock data in `seeds/02_insert_mock_data.sql`

### Understanding DynamoDB Relationship?
1. Read **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)**
2. Compare schema mapping
3. Learn query translation patterns

## 📊 Database Contents

### Tables
- **teachers** (3 records) - Teacher accounts with admin flags
- **students** (10 records) - Student accounts across 4 classes
- **games** (20 records) - Scratch games with all subjects/difficulties

### Indexes
- `idx_students_teacher` - Query students by teacher
- `idx_students_class` - Query students by class
- `idx_games_teacher` - Query games by teacher
- `idx_games_student` - Query games by student
- `idx_games_subject` - Query games by subject
- `idx_games_difficulty` - Query games by difficulty

## 🔧 Common Tasks

### Initialize Database
```bash
./scripts/init-sqlite.sh
```

### Reset to Clean State
```bash
./scripts/reset-database.sh
```

### Validate Database
```bash
./scripts/test-database.sh
```

### Start PostgreSQL
```bash
docker-compose up -d
```

### Stop PostgreSQL
```bash
docker-compose stop
```

### View Data with SQLite CLI
```bash
sqlite3 ho_yu_college.db
.mode column
.headers on
SELECT * FROM students LIMIT 5;
```

## 🔑 Test Credentials

| Role | IDs | Password | Hash Length |
|------|-----|----------|-------------|
| Students | STU001-STU010 | `123` | 64 chars (SHA-256) |
| Teachers | TCH001-TCH002 | `teacher123` | 64 chars (SHA-256) |
| Admin | TCH003 | `admin123` | 64 chars (SHA-256) |

## 📝 Example Queries

### Basic Queries
```sql
-- All students sorted by marks
SELECT * FROM students ORDER BY marks DESC;

-- Teacher's students
SELECT * FROM students WHERE teacher_id = 'TCH001';

-- Games by subject
SELECT subject, COUNT(*) FROM games GROUP BY subject;
```

### Advanced Queries
```sql
-- Student with their games
SELECT s.name_1, g.game_name, g.subject, g.accumulated_click
FROM students s
JOIN games g ON s.student_id = g.student_id
WHERE s.student_id = 'STU001';

-- Top performers by class
SELECT class, name_1, marks
FROM students
WHERE marks > 500
ORDER BY class, marks DESC;

-- Teacher dashboard
SELECT 
  t.teacher_id,
  COUNT(DISTINCT s.student_id) as student_count,
  COUNT(DISTINCT g.game_id) as game_count,
  AVG(s.marks) as avg_marks
FROM teachers t
LEFT JOIN students s ON t.teacher_id = s.teacher_id
LEFT JOIN games g ON s.student_id = g.student_id
GROUP BY t.teacher_id;
```

## 🐛 Troubleshooting

| Problem | Document | Section |
|---------|----------|---------|
| Can't connect to DB | [DATAGRIP_GUIDE.md](DATAGRIP_GUIDE.md) | Troubleshooting |
| Database not found | [QUICK_START.md](QUICK_START.md) | Quick Troubleshooting |
| Docker issues | [README.md](README.md) | Docker Management |
| Schema questions | [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) | Schema Mapping |
| Query translation | [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) | Query Translation |

## 🔗 External Resources

- **SQLite**: https://www.sqlite.org/
- **PostgreSQL**: https://www.postgresql.org/
- **DataGrip**: https://www.jetbrains.com/datagrip/
- **Docker Compose**: https://docs.docker.com/compose/

## 📞 Getting Help

1. Check the relevant documentation above
2. Run `./scripts/test-database.sh` to validate setup
3. Review error messages carefully
4. Check [QUICK_START.md](QUICK_START.md) troubleshooting section

## 🚀 Next Steps After Setup

1. **Connect DataGrip** - Follow [DATAGRIP_GUIDE.md](DATAGRIP_GUIDE.md)
2. **Explore Data** - Run example queries from [README.md](README.md)
3. **Understand Architecture** - Read [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
4. **Start Developing** - Use mock data for testing
5. **Reset When Needed** - Run `./scripts/reset-database.sh`

## 📦 What's Included

✅ Complete SQL schema mirroring DynamoDB  
✅ Pre-populated mock data (33 records total)  
✅ Initialization scripts (Linux/Mac/Windows)  
✅ Reset/reseed scripts  
✅ Validation test suite  
✅ Docker Compose for PostgreSQL  
✅ Comprehensive documentation (40KB+)  
✅ DataGrip setup guide  
✅ DynamoDB comparison guide  

## 🎓 Learning Path

1. **Beginner**: Start with QUICK_START.md → Try SQLite
2. **Intermediate**: Read README.md → Explore DataGrip
3. **Advanced**: Study MIGRATION_GUIDE.md → Compare with DynamoDB
4. **Expert**: Contribute improvements → Document changes

---

**Last Updated**: 2024  
**Database Version**: 1.0  
**Schema Version**: Matches DynamoDB production schema  
**Mock Data Version**: Synced with backend/test/mocks/
