# Testing the Download Endpoints Fix

This document explains how to test the fix for Error 500 when downloading data from students/teachers/games endpoints using SAM and DynamoDB local.

## What Was Fixed

The issue was that Lambda functions running in SAM Local couldn't connect to DynamoDB Local because of endpoint configuration:

- **Before**: Lambda containers tried to connect to `http://localhost:8002` which doesn't work inside Docker
- **After**: Lambda containers now correctly use `http://dynamodb-local:8000` via the Docker network

The `dynamodb-client.ts` was already designed to respect the `DYNAMODB_ENDPOINT` environment variable set by the SAM template. The fixes included:
1. Added detailed comments explaining the endpoint configuration
2. Removed the deprecated `simple-server.js` (not related to SAM)
3. Fixed hardcoded paths in `start-sam-local.sh`
4. Added tests to validate the configuration

## Prerequisites

- Docker Desktop running
- Node.js v18+ installed
- AWS SAM CLI (will be auto-installed by start-local.sh if missing)

## Testing Steps

### 1. Start the Complete Local Environment

From the project root:

```bash
./start-local.sh
```

This will:
1. Start DynamoDB Local container on port 8002
2. Initialize and seed the DynamoDB tables with mock data
3. Start SAM Local API Gateway on port 3000

You should see output similar to:
```
✓ Local development environment is ready!

Services running:
  📊 DynamoDB Local:    http://localhost:8002
  🔧 DynamoDB Admin UI: http://localhost:8001
  🌐 API Gateway:       http://localhost:3000
```

### 2. Verify DynamoDB Is Running and Has Data

Open the DynamoDB Admin UI in your browser:
```
http://localhost:8001
```

You should see three tables with data:
- `ho-yu-students` (10 student records)
- `ho-yu-teachers` (3 teacher records)
- `ho-yu-games` (20 game records)

### 3. Test the Download Endpoints

Use curl or a web browser to test each endpoint:

#### Download Students Data

```bash
curl -v http://localhost:3000/students/download -o students.xlsx
```

Expected result:
- HTTP Status: 200 OK
- Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- File downloaded: students.xlsx

You can open the Excel file to verify it contains student data.

#### Download Teachers Data

```bash
curl -v http://localhost:3000/teachers/download -o teachers.xlsx
```

Expected result:
- HTTP Status: 200 OK
- Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- File downloaded: teachers.xlsx

#### Download Games Data

```bash
curl -v http://localhost:3000/games/download -o games.xlsx
```

Expected result:
- HTTP Status: 200 OK
- Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- File downloaded: games.xlsx

### 4. Test with Query Parameters (Students Endpoint)

The students endpoint supports filtering by class:

```bash
# Download only students from classes 1A and 1B
curl -v "http://localhost:3000/students/download?classes=1A,1B" -o students-filtered.xlsx
```

### 5. Check SAM Local Logs

SAM Local logs show Lambda function execution. You should see logs like:

```
[DynamoDB] Connecting to local DynamoDB at http://dynamodb-local:8000
```

This confirms the Lambda functions are using the correct endpoint.

### 6. Verify Error Handling

To test error handling, you can stop the DynamoDB container and verify the endpoints return proper error responses:

```bash
# Stop DynamoDB
cd backend
npm run dynamodb:stop

# Try to download (should get 500 error)
curl -v http://localhost:3000/students/download

# Expected response:
# HTTP Status: 500
# Body: {"success":false,"message":"Failed to download student data","error":"..."}

# Restart DynamoDB
npm run dynamodb:start
sleep 5  # Wait for DynamoDB to be ready
```

## Troubleshooting

### Issue: "Cannot connect to Docker daemon"

**Solution**: Make sure Docker Desktop is running.

### Issue: SAM Local fails to start

**Solution**: 
1. Check if port 3000 is already in use
2. Verify Docker network exists: `docker network ls | grep ho-yu-network`
3. Check SAM CLI is installed: `sam --version`

### Issue: DynamoDB tables are empty

**Solution**:
```bash
cd backend
npm run dynamodb:seed
```

### Issue: Lambda functions still getting errors

**Solution**:
1. Verify DynamoDB is running: `docker ps | grep dynamodb`
2. Check Docker network: `docker network inspect backend_ho-yu-network`
3. Rebuild backend: `cd backend && npm run build`
4. Restart SAM Local

## Automated Tests

Run the automated test suite to verify the configuration:

```bash
cd backend
npm test
```

All 120 tests should pass, including the 5 new tests for DynamoDB configuration.

To run only the download endpoint tests:

```bash
npm test -- download.test.ts
```

Expected output:
```
 PASS  test/lambda/download.test.ts
  Download Lambda Functions - DynamoDB Configuration
    DynamoDB Client Configuration
      ✓ should use DYNAMODB_ENDPOINT from environment when in local mode
      ✓ should default to localhost:8002 when DYNAMODB_ENDPOINT is not set
      ✓ should use AWS mode when DYNAMODB_MODE is not local
    Table Names Configuration
      ✓ should use table names from environment variables
    SAM Template Environment Variables
      ✓ should match SAM template configuration for local development
```

## Verification Checklist

- [ ] DynamoDB Local container is running
- [ ] DynamoDB Admin UI shows populated tables
- [ ] SAM Local API Gateway is running on port 3000
- [ ] Students download endpoint returns Excel file (200 OK)
- [ ] Teachers download endpoint returns Excel file (200 OK)
- [ ] Games download endpoint returns Excel file (200 OK)
- [ ] Excel files contain expected data when opened
- [ ] SAM logs show correct DynamoDB endpoint connection
- [ ] All backend tests pass (120 tests)

## Additional Notes

### Environment Variables

The SAM template (`infra/template.yaml`) sets these environment variables for Lambda functions:

```yaml
Environment:
  Variables:
    DYNAMODB_MODE: local
    DYNAMODB_ENDPOINT: http://dynamodb-local:8000
    AWS_REGION: us-east-1
    STUDENTS_TABLE_NAME: ho-yu-students
    TEACHERS_TABLE_NAME: ho-yu-teachers
    GAMES_TABLE_NAME: ho-yu-games
```

### Docker Network

Lambda containers and DynamoDB Local communicate through the `backend_ho-yu-network` Docker network. This allows Lambda containers to reach DynamoDB using the hostname `dynamodb-local`.

### Production vs Local

- **Local Development**: Uses `DYNAMODB_ENDPOINT=http://dynamodb-local:8000` (Docker network)
- **Production AWS**: Uses AWS DynamoDB service (no custom endpoint)

The `dynamodb-client.ts` automatically switches between modes based on the `DYNAMODB_MODE` environment variable.

## Success Criteria

The fix is successful if:

1. All three download endpoints (students, teachers, games) return Excel files with status 200
2. The Excel files contain the expected data from DynamoDB Local
3. No Error 500 responses occur when DynamoDB is running
4. SAM Local logs show connection to `http://dynamodb-local:8000`
5. All automated tests pass

## Next Steps

Once verified locally, the same Lambda functions will work in production AWS environment without changes, as the environment detection is automatic based on the `DYNAMODB_MODE` variable.
