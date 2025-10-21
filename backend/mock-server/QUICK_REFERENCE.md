# Mock Server Quick Reference

## 🚀 Quick Start Commands

### In-Memory Mode (Default)
```bash
cd backend
npm run mock-server
```
✅ No setup required • ⚡ Instant start • 💾 No persistence

### DynamoDB Local Mode
```bash
cd backend
echo "USE_DYNAMODB=true" >> .env
npm run dynamodb:setup
npm run mock-server
```
✅ Persistent data • 🔧 Production-like • 🌐 Web UI included

---

## 🔄 Mode Switching

**Switch to In-Memory:**
```bash
# In backend/.env
USE_DYNAMODB=false
```

**Switch to DynamoDB:**
```bash
# In backend/.env
USE_DYNAMODB=true
# Ensure DynamoDB is running:
npm run dynamodb:start
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login (student/teacher/admin) |
| GET | `/games` | List all games |
| GET | `/games/:gameId` | Get single game |
| POST | `/games/:gameId/click` | Increment game clicks |
| GET | `/students/download` | Export students (Excel) |
| GET | `/teachers/download` | Export teachers (Excel) |
| GET | `/games/download` | Export games (Excel) |

---

## 🧪 Testing

```bash
# Start server first
npm run mock-server

# Run tests (in another terminal)
npm run mock-server:test
```

---

## 🌐 Service URLs

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://localhost:5173 | 5173 |
| Mock Server | http://localhost:3000 | 3000 |
| DynamoDB Local | http://localhost:8002 | 8002 |
| DynamoDB Admin | http://localhost:8001 | 8001 |

---

## 🔑 Mock Credentials (In-Memory)

**Students:** STU001-STU010 | Password: `123`
**Teachers:** TCH001-TCH002 | Password: `teacher123`
**Admin:** TCH003 | Password: `admin123`

---

## 🛠️ Common Tasks

### View DynamoDB Data
```bash
# Via Web UI
open http://localhost:8001

# Via CLI
aws dynamodb scan --table-name ho-yu-games \
  --endpoint-url http://localhost:8002 --region us-east-1
```

### Reset DynamoDB Data
```bash
npm run dynamodb:reset  # Delete and recreate tables
npm run dynamodb:seed   # Add fresh data
```

### View Server Logs
```bash
# Server shows mode on startup:
# "📚 Mode: In-Memory Mock Data"
# OR
# "📚 Mode: DynamoDB Local"
```

### Change Server Port
```bash
PORT=3001 npm run mock-server
```

---

## 🐛 Quick Troubleshooting

**Server won't start:**
```bash
# Check port 3000
lsof -i :3000
# Kill if needed
kill -9 <PID>
```

**DynamoDB connection fails:**
```bash
# Check containers
docker ps | grep dynamodb
# Restart if needed
npm run dynamodb:stop && npm run dynamodb:start
```

**Tables not found:**
```bash
npm run dynamodb:init  # Create tables
npm run dynamodb:seed  # Add data
```

**Frontend can't connect:**
```bash
# Check frontend/.env.local
cat frontend/.env.local
# Should contain:
VITE_API_URL=http://localhost:3000
```

---

## 📖 Full Documentation

- **Setup Guide:** [LOCAL_DEVELOPMENT_GUIDE.md](../../LOCAL_DEVELOPMENT_GUIDE.md)
- **API Docs:** [README.md](README.md)
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Implementation:** [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

---

## 🎯 When to Use Each Mode

**Use In-Memory Mode when:**
- 🎨 Developing UI components
- ⚡ Need fast iteration cycles
- 🚫 Don't need data persistence
- 📱 Testing frontend features

**Use DynamoDB Mode when:**
- 🗄️ Testing database operations
- 🔄 Need persistent data
- ⚙️ Integrating backend features
- 🧪 Running integration tests

---

## ⚡ Pro Tips

1. Keep DynamoDB running in background during dev sessions
2. Use in-memory mode for frontend sprints
3. Switch to DynamoDB when debugging backend issues
4. Use DynamoDB Admin UI to inspect/modify data
5. Run `npm run mock-server:test` before committing

---

## 🆘 Need Help?

1. Check troubleshooting guide in [README.md](README.md)
2. Review [LOCAL_DEVELOPMENT_GUIDE.md](../../LOCAL_DEVELOPMENT_GUIDE.md)
3. Run test script: `npm run mock-server:test`
4. Check server logs for error messages
5. Verify environment variables in `.env`

---

*Last updated: 2025-10-21*
