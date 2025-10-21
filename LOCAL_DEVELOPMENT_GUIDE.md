# Local Development Guide

This guide explains how to set up and run the Ho Yu College Scratch Game Platform locally for development, with or without DynamoDB Local.

## 🎯 Quick Start Options

### Option 1: Simple In-Memory Mode (Fastest)

Best for frontend development without database setup.

```bash
# Terminal 1: Start mock server
cd backend
npm install
npm run mock-server

# Terminal 2: Start frontend
cd frontend
npm install
echo "VITE_API_URL=http://localhost:3000" > .env.local
npm run dev
```

Access the app at: http://localhost:5173

### Option 2: Full Stack with DynamoDB Local (Production-like)

Best for testing database interactions and full integration testing.

```bash
# Terminal 1: Start DynamoDB Local
cd backend
npm install
npm run dynamodb:setup  # Starts DynamoDB, creates tables, seeds data

# Terminal 2: Start mock server with DynamoDB
cd backend
# Edit .env and set USE_DYNAMODB=true
echo "USE_DYNAMODB=true" >> .env
npm run mock-server

# Terminal 3: Start frontend
cd frontend
npm install
echo "VITE_API_URL=http://localhost:3000" > .env.local
npm run dev
```

Access:
- **Frontend**: http://localhost:5173
- **Mock Server**: http://localhost:3000
- **DynamoDB Admin**: http://localhost:8001

## 📚 Understanding the Two Modes

### In-Memory Mode

**When to use:**
- Quick frontend development
- Testing UI components
- No database required
- Fastest startup time

**Features:**
- Uses mock data from `backend/test/mocks/`
- Data resets on server restart
- No Docker or DynamoDB required
- 10 students, 3 teachers, 20 games

**Limitations:**
- Data doesn't persist
- No real database operations
- Can't test complex queries

### DynamoDB Local Mode

**When to use:**
- Testing database interactions
- Integration testing
- Production-like environment
- Learning DynamoDB operations

**Features:**
- Real DynamoDB operations
- Data persists across restarts
- Atomic updates for click tracking
- Full CRUD operations
- Web UI for data management

**Requirements:**
- Docker and Docker Compose
- ~100MB disk space
- Ports 8001, 8002 available

## 🔧 Configuration

### Environment Variables

Create `backend/.env` file:

```bash
# Mock Server Configuration
PORT=3000
USE_DYNAMODB=false          # Set to 'true' for DynamoDB mode

# DynamoDB Configuration (when USE_DYNAMODB=true)
DYNAMODB_MODE=local
DYNAMODB_ENDPOINT=http://localhost:8002
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=local     # Dummy credentials
AWS_SECRET_ACCESS_KEY=local

# Table Names
STUDENTS_TABLE_NAME=ho-yu-students
TEACHERS_TABLE_NAME=ho-yu-teachers
GAMES_TABLE_NAME=ho-yu-games
```

### Switching Between Modes

**To In-Memory Mode:**
```bash
# In backend/.env
USE_DYNAMODB=false
# OR delete the line entirely
```

**To DynamoDB Mode:**
```bash
# In backend/.env
USE_DYNAMODB=true

# Ensure DynamoDB Local is running
npm run dynamodb:start
```

Then restart the mock server.

## 🚀 Complete Setup Steps

### First Time Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ho_yu_college
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **(Optional) Setup DynamoDB Local**
   ```bash
   cd ../backend
   npm run dynamodb:setup
   ```

### Daily Development Workflow

**Starting your development session:**

```bash
# Option A: In-Memory Mode
cd backend && npm run mock-server

# Option B: DynamoDB Mode
cd backend && npm run dynamodb:start  # If not already running
cd backend && npm run mock-server

# Then start frontend
cd frontend && npm run dev
```

**Stopping your session:**
```bash
# Stop mock server: Ctrl+C
# Stop frontend: Ctrl+C
# Stop DynamoDB (optional): npm run dynamodb:stop
```

## 🧪 Testing Your Setup

### Verify Mock Server

```bash
# Check server is running
curl http://localhost:3000/games | jq length

# Test authentication
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id":"STU001","password":"123"}'

# Test game click
curl -X POST http://localhost:3000/games/1207260630/click
```

### Verify DynamoDB Local

```bash
# Check containers are running
docker ps | grep dynamodb

# List tables
aws dynamodb list-tables \
  --endpoint-url http://localhost:8002 \
  --region us-east-1

# Access web UI
open http://localhost:8001
```

### Verify Frontend

1. Open http://localhost:5173 in browser
2. Should see the application homepage
3. Check browser console for errors

## 📊 Available Mock Data

### In-Memory Mode

**Students:**
- IDs: STU001 through STU010
- Password: `123`
- Classes: 1A, 1B, 2A, 2B

**Teachers:**
- IDs: TCH001, TCH002 (regular teachers)
- ID: TCH003 (admin)
- Password: `teacher123` or `admin123`

**Games:**
- 20 games total
- Various subjects (Chinese, English, Math)
- Different difficulty levels
- Scratch game IDs

### DynamoDB Local Mode

Data is seeded from `backend/test/mocks/` into DynamoDB tables. Same mock data as in-memory mode, but persisted in the database.

## 🔍 Troubleshooting

### Mock Server Issues

**Port 3000 already in use:**
```bash
# Option 1: Use different port
PORT=3001 npm run mock-server

# Option 2: Find and kill process
lsof -i :3000
kill -9 <PID>
```

**Server not connecting to DynamoDB:**
```bash
# Check DynamoDB is running
docker ps | grep dynamodb

# Restart DynamoDB
npm run dynamodb:stop
npm run dynamodb:start

# Check .env configuration
cat backend/.env | grep USE_DYNAMODB
```

### DynamoDB Local Issues

**Docker not found:**
- Install Docker Desktop for your OS
- Ensure Docker daemon is running

**Containers won't start:**
```bash
# View logs
npm run dynamodb:logs

# Remove and recreate
npm run dynamodb:down
npm run dynamodb:start
```

**Tables not found:**
```bash
# Initialize tables
npm run dynamodb:init

# Seed data
npm run dynamodb:seed
```

### Frontend Issues

**API connection errors:**
```bash
# Check .env.local exists
cat frontend/.env.local

# Should contain:
VITE_API_URL=http://localhost:3000

# Verify mock server is running
curl http://localhost:3000/games
```

**CORS errors:**
- Mock server has CORS enabled by default
- Check browser console for exact error
- Ensure frontend is accessing correct URL

## 📖 Additional Resources

- **[Mock Server Documentation](backend/mock-server/README.md)** - Detailed API documentation
- **[DynamoDB Local Guide](backend/DYNAMODB_LOCAL_GUIDE.md)** - Complete DynamoDB setup
- **[Main README](README.md)** - Project overview
- **[Copilot Instructions](.github/copilot-instructions.md)** - Development best practices

## 💡 Tips & Best Practices

### Development Tips

1. **Start with in-memory mode** for quick iterations
2. **Use DynamoDB mode** when testing database logic
3. **Keep DynamoDB running** in background during development
4. **Use DynamoDB Admin UI** to inspect and modify data
5. **Reset data regularly** for clean test scenarios

### Performance Tips

1. In-memory mode is faster for rapid development
2. DynamoDB Local may be slower on first startup
3. Restart mock server to reset in-memory data
4. Use `npm run dynamodb:reset` to clean DynamoDB data

### Data Management

1. **Don't commit** `.env` files with real credentials
2. **Version control** mock data in `test/mocks/`
3. **Document schema changes** in both CDK and init scripts
4. **Backup data** before major changes

### Debugging

1. **Check server logs** - mock server shows mode on startup
2. **Use browser DevTools** - Network tab for API calls
3. **Check DynamoDB Admin** - Visual data inspection
4. **Use curl** - Test API endpoints directly

## 🆘 Getting Help

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review the [Mock Server README](backend/mock-server/README.md)
3. Check [DynamoDB Local Guide](backend/DYNAMODB_LOCAL_GUIDE.md)
4. Review server logs and error messages
5. Create an issue in the project repository

## 🎓 Learning Resources

- **Mock Server Code**: `backend/mock-server/server.ts`
- **Mock Data**: `backend/test/mocks/`
- **DynamoDB Setup**: `backend/scripts/init-dynamodb.ts`
- **Frontend Config**: `frontend/.env.local`

Happy coding! 🚀
