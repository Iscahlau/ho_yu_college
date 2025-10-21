# Mock Server Architecture

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Local Development Setup                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Frontend   │  (Port 5173)
│   React +    │  VITE_API_URL=http://localhost:3000
│   Vite       │
└──────┬───────┘
       │ HTTP Requests
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Mock Server                               │
│                     (Port 3000)                                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Environment Configuration                  │    │
│  │  USE_DYNAMODB = true | false                           │    │
│  └────────────────┬───────────────────────────────────────┘    │
│                   │                                              │
│        ┌──────────┴──────────┐                                  │
│        ▼                     ▼                                  │
│  ┌─────────────┐      ┌──────────────┐                         │
│  │ In-Memory   │      │  DynamoDB    │                         │
│  │   Mode      │      │  Local Mode  │                         │
│  └─────────────┘      └──────────────┘                         │
└──────┬────────────────────────┬────────────────────────────────┘
       │                        │
       │                        │
       ▼                        ▼
┌──────────────┐      ┌─────────────────────────────────────────┐
│ Mock Data    │      │        DynamoDB Local                    │
│ (in-memory)  │      │        (Docker Container)                │
│              │      │                                           │
│ • Students   │      │  ┌─────────────────────────────────┐    │
│ • Teachers   │      │  │   DynamoDB Service              │    │
│ • Games      │      │  │   (Port 8002)                   │    │
│              │      │  │                                 │    │
│ Resets on    │      │  │  Tables:                        │    │
│ restart      │      │  │  • ho-yu-students               │    │
│              │      │  │  • ho-yu-teachers               │    │
│              │      │  │  • ho-yu-games                  │    │
│              │      │  │                                 │    │
│              │      │  │  Data persists in volume        │    │
│              │      │  └─────────────────────────────────┘    │
│              │      │                                           │
│              │      │  ┌─────────────────────────────────┐    │
│              │      │  │   DynamoDB Admin UI             │    │
│              │      │  │   (Port 8001)                   │    │
│              │      │  │                                 │    │
│              │      │  │  • Browse tables                │    │
│              │      │  │  • Edit data                    │    │
│              │      │  │  • Run queries                  │    │
│              │      │  └─────────────────────────────────┘    │
└──────────────┘      └─────────────────────────────────────────┘
```

## Mode Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│                        In-Memory Mode                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Setup:        npm run mock-server                              │
│  Speed:        ⚡⚡⚡ Very Fast                                    │
│  Data:         📝 Mock data from test/mocks/                    │
│  Persistence:  ❌ Data resets on restart                         │
│  Dependencies: ✅ None (just Node.js)                            │
│  Use Case:     Frontend development, quick testing              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     DynamoDB Local Mode                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Setup:        npm run dynamodb:setup && npm run mock-server    │
│  Speed:        ⚡⚡ Fast (after initial setup)                   │
│  Data:         💾 Real database operations                      │
│  Persistence:  ✅ Data persists across restarts                  │
│  Dependencies: 🐳 Docker, Docker Compose                         │
│  Use Case:     Integration testing, database operations         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Request Flow

### In-Memory Mode

```
Client Request
     │
     ▼
Mock Server (port 3000)
     │
     ├─ Check: USE_DYNAMODB = false
     │
     ▼
In-Memory Data (Map/Array)
     │
     ├─ GET: Read from mock arrays
     ├─ POST: Update in-memory maps
     └─ Response: Return data
     │
     ▼
Client Response
```

### DynamoDB Local Mode

```
Client Request
     │
     ▼
Mock Server (port 3000)
     │
     ├─ Check: USE_DYNAMODB = true
     │
     ▼
DynamoDB Client
     │
     ├─ Connect to: localhost:8002
     │
     ▼
DynamoDB Local (Docker)
     │
     ├─ GET: ScanCommand / GetCommand
     ├─ POST: PutCommand / UpdateCommand
     └─ Response: DynamoDB result
     │
     ▼
Mock Server (format response)
     │
     ▼
Client Response
```

## Endpoint Operations

```
┌──────────────────────────────────────────────────────────────┐
│                   Mock Server Endpoints                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  POST /auth/login                                            │
│    In-Memory:  Find in mockStudents/mockTeachers arrays     │
│    DynamoDB:   GetCommand on students/teachers tables       │
│                                                               │
│  GET /games                                                  │
│    In-Memory:  Return mockGames array                       │
│    DynamoDB:   ScanCommand on games table                   │
│                                                               │
│  GET /games/:gameId                                          │
│    In-Memory:  Array.find() on mockGames                    │
│    DynamoDB:   GetCommand with game_id key                  │
│                                                               │
│  POST /games/:gameId/click                                   │
│    In-Memory:  Increment in gameClicks Map                  │
│    DynamoDB:   UpdateCommand with atomic increment          │
│                                                               │
│  GET /students/download                                      │
│    In-Memory:  Filter and format mockStudents               │
│    DynamoDB:   ScanCommand, then format to Excel            │
│                                                               │
│  GET /teachers/download                                      │
│    In-Memory:  Format mockTeachers array                    │
│    DynamoDB:   ScanCommand on teachers table                │
│                                                               │
│  GET /games/download                                         │
│    In-Memory:  Export mockGames to Excel                    │
│    DynamoDB:   ScanCommand, then export to Excel            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow Example: Click Tracking

### In-Memory Mode
```
1. POST /games/1207260630/click
   ↓
2. Find game in mockGames array
   ↓
3. Get current count from gameClicks Map
   ↓
4. Increment: currentClicks + 1
   ↓
5. Store in gameClicks Map
   ↓
6. Return new count
```

### DynamoDB Mode
```
1. POST /games/1207260630/click
   ↓
2. Create UpdateCommand
   ↓
3. Send to DynamoDB Local:
   - Table: ho-yu-games
   - Key: { game_id: '1207260630' }
   - Expression: SET accumulated_click = 
                 if_not_exists(accumulated_click, 0) + 1
   ↓
4. DynamoDB performs atomic increment
   ↓
5. Return updated record
   ↓
6. Extract and return new count
```

## Configuration Flow

```
Application Startup
     │
     ▼
Load .env file
     │
     ▼
Check USE_DYNAMODB variable
     │
     ├─── false or unset ────┐
     │                        │
     ▼                        ▼
Initialize DynamoDB     Use In-Memory Mode
     │                        │
     ├─ Create client         ├─ Initialize Maps
     ├─ Get table names       ├─ Load mock data
     └─ Connect to :8002      └─ Ready
     │
     ▼
Start Express Server (:3000)
     │
     ▼
Log active mode
     │
     ▼
Ready for requests
```

## Docker Services (DynamoDB Mode Only)

```
┌──────────────────────────────────────────────────────────────┐
│                  Docker Compose Services                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  dynamodb-local                                              │
│    Image:     amazon/dynamodb-local:latest                   │
│    Port:      8002:8000                                      │
│    Volume:    dynamodb-data:/data                            │
│    Purpose:   DynamoDB service                               │
│                                                               │
│  dynamodb-admin                                              │
│    Image:     aaronshaf/dynamodb-admin:latest                │
│    Port:      8001:8001                                      │
│    Purpose:   Web UI for data management                     │
│    Depends:   dynamodb-local                                 │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Testing Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Testing Setup                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Test Script (test-mock-server.sh)                          │
│       │                                                       │
│       ├─ Check server is running                            │
│       ├─ Test GET /games                                    │
│       ├─ Test GET /games/:gameId                            │
│       ├─ Test POST /auth/login (valid)                      │
│       ├─ Test POST /auth/login (invalid)                    │
│       ├─ Test POST /games/:gameId/click                     │
│       ├─ Test error responses                               │
│       └─ Report results                                      │
│                                                               │
│  Run with: npm run mock-server:test                          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Environment Variables
- `USE_DYNAMODB`: Controls mode selection (true/false)
- `DYNAMODB_ENDPOINT`: DynamoDB Local URL (default: localhost:8002)
- `AWS_REGION`: AWS region (default: us-east-1)
- `*_TABLE_NAME`: Table name configuration

### 2. DynamoDB Client
- Created via `createDynamoDBClient()` from `lambda/utils/dynamodb-client.ts`
- Shared with Lambda functions for consistency
- Supports both local and AWS modes

### 3. Mock Data
- Located in `test/mocks/`
- Used for in-memory mode
- Also used to seed DynamoDB Local

### 4. Error Handling
- Try-catch blocks on all async operations
- Graceful fallback to in-memory on DynamoDB errors
- Clear error messages in logs and responses

---

For more details, see:
- [Local Development Guide](../../LOCAL_DEVELOPMENT_GUIDE.md)
- [Mock Server README](README.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
