# DynamoDB Local - Quick Start

Quick reference guide for getting started with DynamoDB Local.

## 🚀 5-Minute Setup

```bash
cd backend

# 1. Copy environment configuration
cp .env.example .env

# 2. Start everything (Docker, create tables, seed data)
npm run dynamodb:setup

# 3. Verify setup
npm run dynamodb:test

# 4. Access Admin UI
open http://localhost:8001
```

Done! Your local DynamoDB is ready.

## 📋 Common Commands

| Command | Purpose |
|---------|---------|
| `npm run dynamodb:start` | Start DynamoDB Local |
| `npm run dynamodb:stop` | Stop containers |
| `npm run dynamodb:init` | Create tables |
| `npm run dynamodb:seed` | Add test data |
| `npm run dynamodb:test` | Run connection test |
| `npm run dynamodb:reset` | Reset tables |
| `npm run dynamodb:down` | Remove everything |

## 🔍 Access Points

- **DynamoDB Local**: http://localhost:8002
- **Admin UI**: http://localhost:8001
- **AWS CLI**: `--endpoint-url http://localhost:8002`

## 🗄️ Test Data

After seeding:
- **3 teachers**: TCH001, TCH002, TCH003
- **10 students**: STU001 to STU010
- **20 games**: Various subjects and difficulties

Default passwords:
- Students: `123`
- Teachers: `teacher123`
- Admin: `admin123`

## 🛠️ Configuration

Edit `.env` file:

```bash
DYNAMODB_MODE=local
DYNAMODB_ENDPOINT=http://localhost:8002
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

## 🔧 Troubleshooting

**Port conflict?**
```bash
# Change port in docker-compose.dynamodb.yml
ports:
  - "8002:8000  # Changed from 8000:8000
```

**Container won't start?**
```bash
npm run dynamodb:logs
```

**Tables not found?**
```bash
npm run dynamodb:init
```

**Need fresh data?**
```bash
npm run dynamodb:reset
npm run dynamodb:seed
```

## 📚 Full Documentation

For detailed documentation, see [DYNAMODB_LOCAL_GUIDE.md](./DYNAMODB_LOCAL_GUIDE.md)

## ✅ Verification

Run the test suite:
```bash
npm run dynamodb:test
```

Expected output:
```
✓ CREATE    PASS
✓ READ      PASS
✓ UPDATE    PASS
✓ DELETE    PASS
✓ SCAN      PASS

Summary: 5 passed, 0 failed
```

## 🎯 Next Steps

1. Start your application with `DYNAMODB_MODE=local`
2. Use DynamoDB Admin UI to browse data
3. Run your Lambda functions locally
4. Write integration tests

## 💡 Tips

- Keep DynamoDB Local running in the background
- Use Admin UI (port 8001) for visual data management
- Reset data before major testing: `npm run dynamodb:reset`
- Check logs if something fails: `npm run dynamodb:logs`
- Stop containers when done: `npm run dynamodb:stop`
