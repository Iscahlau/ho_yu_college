# Local Database Quick Reference Card

## 🚀 Getting Started (Choose One)

### Option 1: SQLite (Fastest)
```bash
cd backend/database
./scripts/init-sqlite.sh
```
✅ No installation needed  
✅ Zero configuration  
✅ Perfect for solo development

### Option 2: PostgreSQL (Team Setup)
```bash
cd backend/database
docker-compose up -d
```
✅ Production-like environment  
✅ Team collaboration ready  
✅ Includes pgAdmin web UI

## 🔗 Connection Details

### SQLite
- **File**: `backend/database/ho_yu_college.db`
- **Tool**: DataGrip, SQLite CLI, DB Browser for SQLite

### PostgreSQL
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `ho_yu_college`
- **User**: `ho_yu_dev`
- **Password**: `dev_password_2024`

### pgAdmin (Optional)
- **URL**: http://localhost:5050
- **Email**: admin@hoyucollege.local
- **Password**: admin123

## 🔑 Test Credentials

| Role | ID(s) | Password |
|------|-------|----------|
| Students | STU001-STU010 | `123` |
| Teachers | TCH001-TCH002 | `teacher123` |
| Admin | TCH003 | `admin123` |

## 📊 Mock Data Summary

- **Teachers**: 3 records (2 regular, 1 admin)
- **Students**: 10 records across 4 classes (1A, 1B, 2A, 2B)
- **Games**: 20 records (all subjects and difficulties)

## 🔄 Common Operations

### Reset Database (SQLite)
```bash
cd backend/database
./scripts/reset-database.sh
```

### Stop PostgreSQL
```bash
cd backend/database
docker-compose stop
```

### Start PostgreSQL
```bash
cd backend/database
docker-compose up -d
```

### View PostgreSQL Logs
```bash
docker-compose logs -f postgres
```

## 🛠️ DataGrip Setup (5 Steps)

### For SQLite:
1. New Data Source → SQLite
2. Path: `backend/database/ho_yu_college.db`
3. Test Connection
4. Download drivers (if prompted)
5. OK

### For PostgreSQL:
1. New Data Source → PostgreSQL
2. Host: `localhost`, Port: `5432`
3. Database: `ho_yu_college`
4. User: `ho_yu_dev`, Password: `dev_password_2024`
5. Test Connection → OK

## 📝 Useful SQL Queries

```sql
-- All students
SELECT * FROM students ORDER BY class, class_no;

-- Teacher's students
SELECT * FROM students WHERE teacher_id = 'TCH001';

-- Games by subject
SELECT subject, COUNT(*) FROM games GROUP BY subject;

-- Top performers
SELECT name_1, marks FROM students ORDER BY marks DESC LIMIT 5;

-- Student's games
SELECT g.game_name, g.subject, g.difficulty 
FROM games g 
WHERE g.student_id = 'STU001';
```

## 📁 File Locations

- **Schema**: `backend/database/schema/01_create_tables.sql`
- **Seeds**: `backend/database/seeds/02_insert_mock_data.sql`
- **Scripts**: `backend/database/scripts/`
- **Database**: `backend/database/ho_yu_college.db` (after init)
- **Full Docs**: `backend/database/README.md`

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Database not found | Run `./scripts/init-sqlite.sh` |
| Can't connect | Check file path is absolute |
| Port 5432 in use | Stop other PostgreSQL: `sudo service postgresql stop` |
| Docker won't start | Check logs: `docker-compose logs postgres` |
| Corrupt database | Delete and recreate: `rm ho_yu_college.db && ./scripts/init-sqlite.sh` |

## 📚 Full Documentation

See [backend/database/README.md](README.md) for complete documentation including:
- Detailed setup instructions
- Schema descriptions
- Windows batch scripts
- Docker management
- Backup/restore procedures
- Best practices

---

**Note**: The local database is for development only. Production uses AWS DynamoDB.
