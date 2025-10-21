# Mock Server for Local Development

This mock server simulates the backend APIs and can operate in two modes:
1. **In-Memory Mode**: Uses mock data from `backend/test/mocks` (default)
2. **DynamoDB Local Mode**: Connects to a local DynamoDB instance for production-like testing

## Features

- ✅ Authentication endpoint for students and teachers
- ✅ Games CRUD operations (list, get by ID, increment clicks)
- ✅ Student and teacher data download endpoints
- ✅ **Dual Mode Support**: Toggle between in-memory and DynamoDB Local
- ✅ CORS enabled for frontend integration
- ✅ Hot-reloading for rapid development
- ✅ Full CRUD operations with DynamoDB Local

## Quick Start

### Option 1: In-Memory Mode (Default)

Run the mock server with in-memory mock data (no DynamoDB required):

```bash
cd backend
npm install
npm run mock-server
```

The server will start on `http://localhost:3000` using in-memory mock data.

### Option 2: DynamoDB Local Mode

Run the mock server connected to DynamoDB Local for production-like testing:

**Step 1: Start DynamoDB Local**
```bash
cd backend
npm run dynamodb:setup  # Starts DynamoDB, creates tables, seeds data
```

**Step 2: Configure Environment**
```bash
# Create .env file if it doesn't exist
cp .env.example .env

# Edit .env and set:
USE_DYNAMODB=true
DYNAMODB_MODE=local
DYNAMODB_ENDPOINT=http://localhost:8002
```

**Step 3: Start Mock Server**
```bash
npm run mock-server
```

The server will connect to DynamoDB Local and use real database operations.

## Configuration

### Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```bash
# Mock Server Configuration
PORT=3000                    # Port for the mock server
USE_DYNAMODB=false          # Set to 'true' to use DynamoDB Local

# DynamoDB Configuration (required when USE_DYNAMODB=true)
DYNAMODB_MODE=local         # 'local' for DynamoDB Local, 'aws' for AWS
DYNAMODB_ENDPOINT=http://localhost:8002
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=local     # Dummy credentials for local
AWS_SECRET_ACCESS_KEY=local

# Table Names
STUDENTS_TABLE_NAME=ho-yu-students
TEACHERS_TABLE_NAME=ho-yu-teachers
GAMES_TABLE_NAME=ho-yu-games
```

### Switching Between Modes

**To use in-memory mode:**
```bash
# In .env file:
USE_DYNAMODB=false
# OR simply omit the variable
```

**To use DynamoDB Local mode:**
```bash
# In .env file:
USE_DYNAMODB=true
DYNAMODB_MODE=local
```

## Available Endpoints

| Method | Endpoint | Description | DynamoDB Support |
|--------|----------|-------------|------------------|
| POST | `/auth/login` | Authenticate student or teacher | ✅ Yes |
| GET | `/games` | Fetch all games | ✅ Yes |
| GET | `/games/:gameId` | Fetch a single game by ID | ✅ Yes |
| POST | `/games/:gameId/click` | Increment game click count (atomic) | ✅ Yes |
| GET | `/students/download` | Download students as Excel | ✅ Yes |
| GET | `/teachers/download` | Download teachers as Excel | ✅ Yes |
| GET | `/games/download` | Download games as Excel | ✅ Yes |

**Note**: All endpoints work in both in-memory and DynamoDB Local modes.

## API Examples

### Login (Student)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id":"STU001","password":"123"}'
```

Response:
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
    ...
  },
  "role": "student"
}
```

### Login (Teacher)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id":"TCH001","password":"teacher123"}'
```

Response:
```json
{
  "success": true,
  "user": {
    "teacher_id": "TCH001",
    "responsible_class": ["1A", "2A"],
    "last_login": "2024-01-15T08:00:00.000Z",
    "is_admin": false
  },
  "role": "teacher"
}
```

### Get All Games

```bash
curl http://localhost:3000/games
```

Returns an array of all games with their metadata.

### Get Single Game

```bash
curl http://localhost:3000/games/GAME001
```

Returns details for the specified game.

### Increment Game Click

Increments the accumulated click count for a game when a student plays it.

```bash
curl -X POST http://localhost:3000/games/1207260630/click
```

Response:
```json
{
  "success": true,
  "accumulated_click": 16
}
```

**Features**:
- **In-Memory Mode**: Thread-safe storage simulates DynamoDB atomic updates
- **DynamoDB Mode**: Uses DynamoDB's native atomic increment operation
- Returns 404 if game doesn't exist
- Returns updated click count immediately
- Works with concurrent requests in both modes

**Example workflow**:
```bash
# Get initial click count
curl http://localhost:3000/games/1207260630 | grep accumulated_click

# Click the game multiple times
curl -X POST http://localhost:3000/games/1207260630/click
curl -X POST http://localhost:3000/games/1207260630/click
curl -X POST http://localhost:3000/games/1207260630/click

# Verify new click count
curl http://localhost:3000/games/1207260630 | grep accumulated_click
```

## Mock Data

### In-Memory Mode
The mock server uses existing mock data from `backend/test/mocks/`:
- **10 students** across different classes (1A, 1B, 2A, 2B)
- **3 teachers** with different responsibilities
- **20 games** covering various subjects and difficulties

For detailed information about the mock data, see [backend/test/README.md](../test/README.md).

### DynamoDB Local Mode
When connected to DynamoDB Local, the mock server uses data seeded into the database:
- Data is persisted across server restarts
- Can be viewed and edited via DynamoDB Admin UI at http://localhost:8001
- Use `npm run dynamodb:seed` to repopulate data
- Use `npm run dynamodb:reset` to recreate tables from scratch

## Mock Credentials (In-Memory Mode)

### Students
- IDs: `STU001` through `STU010`
- Password: `123`

### Teachers
- IDs: `TCH001`, `TCH002`
- Password: `teacher123`

### Admin
- ID: `TCH003`
- Password: `admin123`

**Note**: When using DynamoDB Local mode, credentials are stored in the database tables.

## Using with Frontend

Configure the frontend to use the mock server by setting the environment variable:

```bash
cd frontend
echo "VITE_API_URL=http://localhost:3000" > .env.local
npm run dev
```

The frontend will now connect to the mock server instead of AWS.

## Complete Local Development Setup

### Running Both Mock Server and Frontend

**Terminal 1: Start DynamoDB Local (if using DynamoDB mode)**
```bash
cd backend
npm run dynamodb:setup  # Start DynamoDB, create tables, seed data
```

**Terminal 2: Start Mock Server**
```bash
cd backend
# For in-memory mode (default):
npm run mock-server

# For DynamoDB Local mode:
# First, ensure .env has USE_DYNAMODB=true
npm run mock-server
```

**Terminal 3: Start Frontend**
```bash
cd frontend
echo "VITE_API_URL=http://localhost:3000" > .env.local
npm run dev  # Runs on http://localhost:5173
```

### Testing Mock Server

To verify all endpoints are working correctly:

```bash
# In a separate terminal, with mock server running
cd backend
npm run mock-server:test
```

This runs automated tests against the mock server endpoints, testing:
- GET /games (fetch all games)
- GET /games/:gameId (fetch single game)
- POST /auth/login (authentication)
- POST /games/:gameId/click (increment clicks)
- Error handling (404, 401, 400 responses)

### Accessing Services
- **Frontend**: http://localhost:5173
- **Mock Server**: http://localhost:3000
- **DynamoDB Admin** (if using DynamoDB mode): http://localhost:8001

## Development Notes

### Mode Selection
- **In-Memory Mode**: Best for quick frontend development without database setup
- **DynamoDB Local Mode**: Best for testing production-like database interactions
- Switch between modes by setting `USE_DYNAMODB` in `.env`

### Technical Details
- The server uses `ts-node-dev` for hot-reloading during development
- In-memory mode: Click counts are stored in-memory and reset when the server restarts
- DynamoDB mode: All data persists in the local DynamoDB instance
- CORS is enabled for all origins to support local development
- Password storage matches the production implementation (plain text for development)

### DynamoDB Operations
When `USE_DYNAMODB=true`, the mock server performs real DynamoDB operations:
- **Read**: Uses `GetCommand` and `ScanCommand` for queries
- **Write**: Uses `PutCommand` for creating/updating items
- **Update**: Uses `UpdateCommand` with atomic operations for click tracking
- **Query**: Supports filtering (e.g., by class for student downloads)

## Troubleshooting

### Common Issues

#### Issue: "Cannot connect to DynamoDB Local"

**Symptoms**: 
- Mock server shows DynamoDB connection errors
- Server falls back to in-memory mode

**Solution**:
```bash
# 1. Verify DynamoDB Local is running
docker ps | grep dynamodb

# 2. If not running, start it
cd backend
npm run dynamodb:start

# 3. Wait a few seconds, then restart mock server
npm run mock-server

# 4. Check the startup message - should show "DynamoDB Local" mode
```

#### Issue: "Table not found" errors

**Symptoms**: 
- DynamoDB errors about missing tables
- 404 errors when accessing endpoints

**Solution**:
```bash
# Initialize tables
cd backend
npm run dynamodb:init

# Seed with data
npm run dynamodb:seed

# Restart mock server
npm run mock-server
```

#### Issue: Port 3000 already in use

**Solution**:
```bash
# Option 1: Use a different port
PORT=3001 npm run mock-server

# Then update frontend .env.local:
VITE_API_URL=http://localhost:3001

# Option 2: Find and kill the process using port 3000
lsof -i :3000
kill -9 <PID>
```

#### Issue: Mock server shows in-memory mode but .env has USE_DYNAMODB=true

**Symptoms**:
- Environment variable seems ignored
- Server always uses in-memory mode

**Solution**:
```bash
# 1. Verify .env file is in backend directory
ls -la backend/.env

# 2. Check the content
cat backend/.env | grep USE_DYNAMODB

# 3. Ensure no typos - should be exactly:
USE_DYNAMODB=true

# 4. Restart mock server (ts-node-dev should auto-reload, but restart to be sure)
npm run mock-server
```

#### Issue: Connection refused errors from frontend

**Symptoms**:
- Frontend cannot connect to mock server
- CORS errors in browser console

**Solution**:
```bash
# 1. Verify mock server is running
curl http://localhost:3000/games

# 2. If not running, start it
cd backend
npm run mock-server

# 3. Verify frontend .env.local
cat frontend/.env.local
# Should contain: VITE_API_URL=http://localhost:3000

# 4. Restart frontend dev server
cd frontend
npm run dev
```

#### Issue: Empty data or old data in DynamoDB mode

**Symptoms**:
- API returns empty arrays
- Data seems outdated

**Solution**:
```bash
# Reset and reseed database
cd backend
npm run dynamodb:reset  # Deletes and recreates tables
npm run dynamodb:seed   # Adds fresh mock data

# Restart mock server
npm run mock-server
```

### Debugging Tips

#### Enable Verbose Logging

Check the server startup output to confirm mode:
```
🚀 Mock server running on http://localhost:3000
📚 Mode: DynamoDB Local              <-- Confirms mode
🗄️  Connected to DynamoDB at http://localhost:8002
📋 Tables: ho-yu-students, ho-yu-teachers, ho-yu-games
```

#### Test DynamoDB Connection Manually

```bash
# Test if DynamoDB Local is accessible
aws dynamodb list-tables \
  --endpoint-url http://localhost:8002 \
  --region us-east-1

# Should return list of tables
```

#### Check Docker Containers

```bash
# View all running containers
docker ps

# Should see:
# - ho-yu-dynamodb-local (port 8002)
# - ho-yu-dynamodb-admin (port 8001)

# View logs
npm run dynamodb:logs
```

#### Verify Environment Variables in Runtime

Add temporary logging to `server.ts`:
```typescript
console.log('USE_DYNAMODB:', process.env.USE_DYNAMODB);
console.log('DYNAMODB_MODE:', process.env.DYNAMODB_MODE);
console.log('DYNAMODB_ENDPOINT:', process.env.DYNAMODB_ENDPOINT);
```

## Best Practices

### Local Development Workflow

1. **Start with in-memory mode** for rapid frontend development
2. **Switch to DynamoDB mode** when you need to test database interactions
3. **Keep DynamoDB Local running** in the background during development sessions
4. **Use DynamoDB Admin UI** to inspect and modify data visually
5. **Reset data regularly** to ensure clean test scenarios

### Data Management

1. **Separate environments**: Use different .env files for different scenarios
2. **Version control**: Don't commit `.env` files with real credentials
3. **Seed data**: Keep mock data in `test/mocks/` synchronized with DynamoDB schema
4. **Backup**: Use DynamoDB Admin to export data before major changes

### Performance

1. **In-memory is faster**: Use for quick iterations
2. **DynamoDB for accuracy**: Use when testing complex queries or atomic operations
3. **Restart containers**: If DynamoDB Local becomes slow, restart with `npm run dynamodb:stop && npm run dynamodb:start`
4. **Clean volumes**: Periodically remove unused Docker volumes

### Testing Strategy

1. **Unit tests**: Use in-memory mode for fast unit tests
2. **Integration tests**: Use DynamoDB Local for integration tests
3. **E2E tests**: Run full stack with DynamoDB Local
4. **Production testing**: Always test with real AWS DynamoDB before deployment

## Related Documentation

- **[DynamoDB Local Setup Guide](../DYNAMODB_LOCAL_GUIDE.md)** - Complete guide for DynamoDB Local
- **[Mock Data Documentation](../test/README.md)** - Details about mock data structure
- **[Main README](../../README.md)** - Project overview and quick start
- **[Lambda Functions](../lambda/README.md)** - Production Lambda implementations

## Support

For issues or questions:
1. Check this troubleshooting guide
2. Review DynamoDB Local logs: `npm run dynamodb:logs`
3. Verify environment variables in `.env`
4. Check Docker containers are running: `docker ps`
5. Consult the [DynamoDB Local Guide](../DYNAMODB_LOCAL_GUIDE.md)
6. Create an issue in the project repository
