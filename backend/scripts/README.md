# DynamoDB Local Scripts

This directory contains utility scripts for managing DynamoDB Local for development.

## Scripts Overview

### init-dynamodb.ts
Creates DynamoDB tables with proper schema and indexes.

**Usage:**
```bash
# Create tables
npm run dynamodb:init

# Reset (delete and recreate) tables
npm run dynamodb:reset
```

**Features:**
- Creates students, teachers, and games tables
- Adds Global Secondary Indexes (GSIs) for efficient queries
- Waits for tables to become active
- Supports `--reset` flag to delete existing tables first

**Tables Created:**
- `ho-yu-students` - Student information with teacher index
- `ho-yu-teachers` - Teacher information
- `ho-yu-games` - Game data with teacher and student indexes

### seed-dynamodb.ts
Populates DynamoDB tables with mock test data.

**Usage:**
```bash
npm run dynamodb:seed
```

**Features:**
- Seeds data in batches (25 items per batch)
- Uses mock data from `test/mocks/` directory
- Handles batch write operations efficiently
- Shows progress for each batch

**Data Seeded:**
- 3 teachers (TCH001-TCH003)
- 10 students (STU001-STU010)
- 20+ games across various subjects

### test-dynamodb.ts
Tests DynamoDB Local connection and CRUD operations.

**Usage:**
```bash
npm run dynamodb:test
```

**Features:**
- Tests CREATE operation (PutCommand)
- Tests READ operation (GetCommand)
- Tests UPDATE operation (UpdateCommand)
- Tests DELETE operation (DeleteCommand)
- Tests SCAN operation (ScanCommand)
- Provides detailed test results and error messages

**Expected Output:**
```
✓ CREATE    PASS
✓ READ      PASS
✓ UPDATE    PASS
✓ DELETE    PASS
✓ SCAN      PASS

Summary: 5 passed, 0 failed
```

## Prerequisites

1. **DynamoDB Local must be running**:
   ```bash
   npm run dynamodb:start
   ```

2. **Environment variables configured**:
   - Copy `.env.example` to `.env`
   - Ensure `DYNAMODB_MODE=local`
   - Set `DYNAMODB_ENDPOINT=http://localhost:8002`

## Complete Workflow

### First Time Setup
```bash
# 1. Start DynamoDB Local
npm run dynamodb:start

# 2. Wait a few seconds for containers to start
sleep 5

# 3. Create tables
npm run dynamodb:init

# 4. Seed data
npm run dynamodb:seed

# 5. Test connection
npm run dynamodb:test
```

Or use the all-in-one command:
```bash
npm run dynamodb:setup
```

### Daily Development
```bash
# Start DynamoDB Local (if not running)
npm run dynamodb:start

# Reset data to clean state
npm run dynamodb:reset
npm run dynamodb:seed

# Run your application
npm run mock-server
```

### Cleanup
```bash
# Stop containers (keeps data)
npm run dynamodb:stop

# Remove everything (deletes data)
npm run dynamodb:down
```

## Script Details

### init-dynamodb.ts

**Configuration:**
- Reads from environment variables:
  - `DYNAMODB_ENDPOINT` (default: http://localhost:8002)
  - `AWS_REGION` (default: us-east-1)
  - `*_TABLE_NAME` variables

**Command Line Arguments:**
- `--reset` or `-r`: Delete existing tables before creating

**Error Handling:**
- Checks if tables already exist
- Waits for tables to become active
- Provides clear error messages

### seed-dynamodb.ts

**Configuration:**
- Uses same environment variables as init-dynamodb
- Imports mock data from `test/mocks/` directory

**Batch Processing:**
- Respects DynamoDB's 25-item batch limit
- Shows progress for each batch
- Handles errors gracefully

**Data Source:**
- `test/mocks/students.ts` - mockStudents array
- `test/mocks/teachers.ts` - mockTeachers array
- `test/mocks/games.ts` - mockGames array

### test-dynamodb.ts

**Configuration:**
- Uses dotenv to load environment variables
- Tests against `ho-yu-students` table by default

**Test Cases:**
1. **CREATE**: Inserts a test student
2. **READ**: Retrieves the test student
3. **UPDATE**: Updates the test student's marks
4. **DELETE**: Removes the test student
5. **SCAN**: Lists existing students

**Exit Codes:**
- `0`: All tests passed
- `1`: One or more tests failed

## Troubleshooting

### Connection Errors

**Error**: `NetworkingError: connect ECONNREFUSED`

**Solutions:**
```bash
# Verify DynamoDB Local is running
docker ps | grep dynamodb

# Check logs
npm run dynamodb:logs

# Restart containers
npm run dynamodb:stop
npm run dynamodb:start
```

### Table Not Found

**Error**: `ResourceNotFoundException: Cannot do operations on a non-existent table`

**Solutions:**
```bash
# Create tables
npm run dynamodb:init

# Or reset everything
npm run dynamodb:reset
```

### Seeding Fails

**Error**: Batch write errors or validation errors

**Solutions:**
```bash
# Ensure tables exist
npm run dynamodb:init

# Check mock data is valid
# Verify mock files in test/mocks/ directory

# Reset and try again
npm run dynamodb:reset
npm run dynamodb:seed
```

### Test Failures

**Error**: Tests fail with various errors

**Solutions:**
```bash
# Ensure DynamoDB is running
npm run dynamodb:start

# Ensure tables exist and are seeded
npm run dynamodb:init
npm run dynamodb:seed

# Check environment variables
cat .env

# Run test again
npm run dynamodb:test
```

## Development Notes

### Adding New Tables

1. Update `init-dynamodb.ts`:
   - Add new `create*Table()` function
   - Call it in `initializeTables()`
   - Define schema and indexes

2. Update `seed-dynamodb.ts`:
   - Import mock data
   - Add seeding call in `seedTables()`

3. Update `lambda/utils/dynamodb-client.ts`:
   - Add table name to `tableNames` object

### Modifying Table Schema

1. Update `init-dynamodb.ts` with new schema
2. Run `npm run dynamodb:reset` to recreate tables
3. Update mock data if needed
4. Run `npm run dynamodb:seed` to populate

### Custom Seed Data

1. Create custom seed data file in `test/mocks/`
2. Import in `seed-dynamodb.ts`
3. Add to `seedTables()` function

## References

- [DynamoDB Local Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Main DynamoDB Local Guide](../DYNAMODB_LOCAL_GUIDE.md)
- [Quick Start Guide](../DYNAMODB_QUICK_START.md)
