# Manual Testing Guide - Upload Performance Optimization

This guide provides step-by-step instructions for manually testing the upload performance improvements.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ installed
- Project dependencies installed (`npm install` in backend and backend/lambda)

## Setup Local Environment

### 1. Start Local Services

```bash
# From project root
./start-local.sh
```

This will:
- Start DynamoDB Local (port 8002)
- Start DynamoDB Admin UI (port 8001)
- Initialize tables
- Seed with test data
- Start SAM Local API (port 3000)

**Wait for**: Message "SAM Local API Gateway started successfully at http://localhost:3000"

### 2. Verify Services are Running

```bash
# Check DynamoDB Local
curl http://localhost:8002/

# Check DynamoDB Admin UI
# Open browser: http://localhost:8001

# Check API Gateway
curl http://localhost:3000/games
```

## Test Upload Performance

### Test 1: Upload Students (Small File - 10 rows)

Create a test Excel file `test-students.xlsx` with these columns:
```
student_id | name_1     | name_2 | marks | class | class_no | teacher_id | password
STU101     | Test User1 | 测试1  | 100   | 1A    | 01       | TCH001     | pass123
STU102     | Test User2 | 测试2  | 200   | 1A    | 02       | TCH001     | pass123
STU103     | Test User3 | 测试3  | 300   | 1B    | 03       | TCH002     | pass123
STU104     | Test User4 | 测试4  | 400   | 1B    | 04       | TCH002     | pass123
STU105     | Test User5 | 测试5  | 500   | 2A    | 05       | TCH003     | pass123
STU106     | Test User6 | 测试6  | 100   | 2A    | 06       | TCH003     | pass123
STU107     | Test User7 | 测试7  | 200   | 2B    | 07       | TCH001     | pass123
STU108     | Test User8 | 测试8  | 300   | 2B    | 08       | TCH001     | pass123
STU109     | Test User9 | 测试9  | 400   | 3A    | 09       | TCH002     | pass123
STU110     | Test User10| 测试10 | 500   | 3A    | 10       | TCH002     | pass123
```

**Using curl:**
```bash
# Convert file to base64
base64_content=$(base64 -w 0 test-students.xlsx)

# Send upload request
curl -X POST http://localhost:3000/upload/students \
  -H "Content-Type: application/json" \
  -d "{\"file\":\"$base64_content\"}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully processed 10 students (10 inserted, 0 updated)",
  "processed": 10,
  "inserted": 10,
  "updated": 0
}
```

**Verify in DynamoDB Admin UI:**
1. Open http://localhost:8001
2. Click on "ho-yu-students" table
3. Verify 10 new students (STU101-STU110) appear in the table

### Test 2: Update Existing Students

Re-upload the same file with modified data:
```
student_id | name_1          | marks | ...
STU101     | Test User1 EDIT | 150   | ...
STU102     | Test User2 EDIT | 250   | ...
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully processed 10 students (0 inserted, 10 updated)",
  "processed": 10,
  "inserted": 0,
  "updated": 10
}
```

**Verify:**
- Check that `created_at` remains unchanged
- Check that `updated_at` is updated to current timestamp
- Check that `marks` values are updated

### Test 3: Upload Teachers (with JSON Array)

Create `test-teachers.xlsx`:
```
teacher_id | name        | password | responsible_class | is_admin
TCH101     | Test Teacher1| pass123  | ["1A", "1B"]      | false
TCH102     | Test Teacher2| pass123  | ["2A"]            | false
TCH103     | Test Teacher3| pass123  | ["3A", "3B"]      | true
```

**Upload:**
```bash
base64_content=$(base64 -w 0 test-teachers.xlsx)
curl -X POST http://localhost:3000/upload/teachers \
  -H "Content-Type: application/json" \
  -d "{\"file\":\"$base64_content\"}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully processed 3 teachers (3 inserted, 0 updated)",
  "processed": 3,
  "inserted": 3,
  "updated": 0
}
```

**Verify:**
- `responsible_class` is stored as array `["1A", "1B"]`
- `is_admin` is stored as boolean `true` or `false`

### Test 4: Upload Games (Large File - 100 rows)

Create `test-games.xlsx` with 100 rows:
```
game_id      | game_name  | student_id | subject | difficulty | teacher_id | scratch_id   | scratch_api
1000000001   | Game 1     | STU101     | Math    | Beginner   | TCH101     | 1000000001   | https://scratch.mit.edu/projects/1000000001
1000000002   | Game 2     | STU102     | Math    | Beginner   | TCH101     | 1000000002   | https://scratch.mit.edu/projects/1000000002
...
1000000100   | Game 100   | STU110     | Science | Advanced   | TCH103     | 1000000100   | https://scratch.mit.edu/projects/1000000100
```

**Upload:**
```bash
base64_content=$(base64 -w 0 test-games.xlsx)

# Time the upload
time curl -X POST http://localhost:3000/upload/games \
  -H "Content-Type: application/json" \
  -d "{\"file\":\"$base64_content\"}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully processed 100 games (100 inserted, 0 updated)",
  "processed": 100,
  "inserted": 100,
  "updated": 0
}
```

**Expected Performance:**
- Upload time: < 2 seconds for 100 rows
- Old implementation would take 5-10 seconds

**Verify in Logs:**
Check the SAM Local logs for batch operation messages:
```
[INFO] Batch getting games: 25 items
[INFO] Batch writing games: 25 items
```

### Test 5: Error Handling - Missing Required Field

Create `test-invalid.xlsx`:
```
student_id | name_1     | marks
STU201     | Valid      | 100
           | Invalid    | 200    <- Missing student_id
STU202     | Valid      | 300
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully processed 2 students (2 inserted, 0 updated)",
  "processed": 2,
  "inserted": 2,
  "updated": 0,
  "errors": [
    "Row 3: Missing student_id"
  ]
}
```

**Verify:**
- Only 2 records inserted (STU201, STU202)
- Error message indicates row 3 failed

## Test Pagination Performance

### Test 6: List Games Without Pagination

```bash
# Get all games
curl http://localhost:3000/games
```

**Expected Response:**
```json
{
  "items": [...],  // All games
  "count": 120,    // Total in this response
  "hasMore": false
}
```

### Test 7: List Games With Pagination

```bash
# Get first 20 games
curl "http://localhost:3000/games?limit=20"
```

**Expected Response:**
```json
{
  "items": [...],     // 20 games
  "count": 20,
  "hasMore": true,
  "lastKey": "encoded-pagination-token"
}
```

**Get Next Page:**
```bash
# Copy lastKey from previous response
curl "http://localhost:3000/games?limit=20&lastKey=<encoded-pagination-token>"
```

**Expected Response:**
```json
{
  "items": [...],     // Next 20 games
  "count": 20,
  "hasMore": true,
  "lastKey": "another-encoded-token"
}
```

## Performance Benchmarking

### Benchmark Upload Speed

Create files with different sizes:
- 100 rows: `test-100.xlsx`
- 500 rows: `test-500.xlsx`
- 1000 rows: `test-1000.xlsx`

**Test each file:**
```bash
# 100 rows
time curl -X POST http://localhost:3000/upload/students \
  -H "Content-Type: application/json" \
  -d "{\"file\":\"$(base64 -w 0 test-100.xlsx)\"}" \
  -o /dev/null -s

# 500 rows
time curl -X POST http://localhost:3000/upload/students \
  -H "Content-Type: application/json" \
  -d "{\"file\":\"$(base64 -w 0 test-500.xlsx)\"}" \
  -o /dev/null -s

# 1000 rows
time curl -X POST http://localhost:3000/upload/students \
  -H "Content-Type: application/json" \
  -d "{\"file\":\"$(base64 -w 0 test-1000.xlsx)\"}" \
  -o /dev/null -s
```

**Expected Times (Local DynamoDB):**
- 100 rows: < 1 second
- 500 rows: 1-2 seconds
- 1000 rows: 2-4 seconds

**Compare to Old Implementation:**
The old implementation would take:
- 100 rows: 2-4 seconds
- 500 rows: 10-20 seconds
- 1000 rows: 20-40 seconds

**Performance Improvement:**
- 100 rows: ~3x faster
- 500 rows: ~7x faster
- 1000 rows: ~10x faster

## Verify Data Integrity

### Check Timestamp Preservation

1. **Upload initial data:**
```bash
curl -X POST http://localhost:3000/upload/students \
  -H "Content-Type: application/json" \
  -d "{\"file\":\"$(base64 -w 0 test-students.xlsx)\"}"
```

2. **Note the created_at timestamp** from DynamoDB Admin UI

3. **Wait 5 seconds**

4. **Upload modified data:**
```bash
curl -X POST http://localhost:3000/upload/students \
  -H "Content-Type: application/json" \
  -d "{\"file\":\"$(base64 -w 0 test-students-modified.xlsx)\"}"
```

5. **Verify in DynamoDB Admin UI:**
   - `created_at` remains unchanged (from step 2)
   - `updated_at` is updated to current timestamp

### Check Accumulated Click Preservation

1. **Upload games with initial click counts:**
```bash
# File has accumulated_click = 10 for all games
curl -X POST http://localhost:3000/upload/games \
  -H "Content-Type: application/json" \
  -d "{\"file\":\"$(base64 -w 0 test-games.xlsx)\"}"
```

2. **Click on a game** (increment click count):
```bash
curl -X POST http://localhost:3000/games/1000000001/click \
  -H "Content-Type: application/json"
```

3. **Verify click count is 11** in DynamoDB

4. **Re-upload the same games file:**
```bash
curl -X POST http://localhost:3000/upload/games \
  -H "Content-Type: application/json" \
  -d "{\"file\":\"$(base64 -w 0 test-games.xlsx)\"}"
```

5. **Verify click count is still 11** (not reset to 10)

## Troubleshooting

### Upload Returns 500 Error

**Check:**
1. DynamoDB Local is running: `docker ps | grep dynamodb`
2. SAM Local is running: `curl http://localhost:3000/games`
3. Check SAM Local logs for error messages

**Solution:**
```bash
# Restart services
cd backend
npm run dynamodb:stop
npm run dynamodb:start
cd ../infra
npm run sam:start
```

### Batch Operations Not Working

**Check Logs:**
Look for these messages in SAM Local logs:
```
Error batch getting students: <error message>
Error batch writing students: <error message>
```

**If you see these:**
- Batch operations are failing and falling back to individual operations
- Check DynamoDB Local is accessible
- Verify network connectivity

### Performance Not Improved

**Possible Causes:**
1. Running on slow hardware
2. DynamoDB Local performance varies
3. Network issues

**Verify Batch Operations:**
Check logs for "Batch getting" and "Batch writing" messages. If these appear, batching is working.

## Clean Up

### Remove Test Data

```bash
# Stop services
cd infra
# Press Ctrl+C to stop SAM Local

cd ../backend
npm run dynamodb:down  # This removes all data and containers
```

### Reset to Initial State

```bash
# Restart with fresh data
./start-local.sh
```

## Success Criteria

✅ **Upload Performance:**
- 100 rows upload in < 1 second
- 1000 rows upload in < 4 seconds
- Logs show "Batch getting" and "Batch writing" messages

✅ **Data Integrity:**
- `created_at` preserved on updates
- `updated_at` changed on updates
- `accumulated_click` preserved on game updates

✅ **Pagination:**
- `/games?limit=20` returns 20 items
- Response includes `lastKey` when more items available
- `hasMore` is `true` when more pages exist

✅ **Error Handling:**
- Invalid rows collected in errors array
- Valid rows still processed
- Appropriate error messages returned

## Next Steps

After successful manual testing:
1. Update frontend to use pagination (optional)
2. Deploy to production
3. Monitor CloudWatch metrics
4. Adjust batch size if needed based on production performance

## Support

If you encounter issues:
1. Check the logs in SAM Local output
2. Verify DynamoDB Local is running
3. Review the comprehensive documentation in `UPLOAD_PERFORMANCE_OPTIMIZATION.md`
4. Check test files in `backend/test/lambda/upload-performance.test.ts`
