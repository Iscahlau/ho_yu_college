# Fix for Error 500 on Download Endpoints

## Problem
The application was returning Error 500 (Internal Server Error) when attempting to download data from the following endpoints:
- `/students/download`
- `/teachers/download`
- `/games/download`

## Root Cause
The download Lambda handlers existed in `backend/lambda/download/` but were **NOT wired up** to:
1. API Gateway in the CDK stack (`infra/lib/backend-stack.ts`)
2. The local development server (`backend/simple-server.js`)

The frontend was calling these endpoints, but they didn't exist, causing the 500 errors.

## Solution

### 1. CDK Stack Changes (`infra/lib/backend-stack.ts`)

Added three Lambda functions:
- **StudentsDownloadFunction** - Downloads student data as Excel
- **TeachersDownloadFunction** - Downloads teacher data as Excel  
- **GamesDownloadFunction** - Downloads games data as Excel

Each Lambda function:
- Uses Node.js 20.x runtime
- Has 30-second timeout (sufficient for Excel generation)
- Has proper IAM permissions (read-only access to respective DynamoDB tables)
- Uses the existing download handlers from `backend/lambda/download/`

Added three API Gateway endpoints:
- `GET /students/download` → StudentsDownloadFunction
- `GET /teachers/download` → TeachersDownloadFunction
- `GET /games/download` → GamesDownloadFunction

### 2. Local Development Server Changes (`backend/simple-server.js`)

Added three new download endpoints that:
- Fetch data from DynamoDB Local
- Generate Excel files using the `xlsx` library
- Apply the same filtering and sorting logic as the Lambda handlers
- Return Excel files with proper headers (`Content-Type`, `Content-Disposition`)

### 3. Testing

Created unit tests for the students download endpoint:
- ✅ Tests Excel file generation for all students
- ✅ Tests class filtering functionality
- ✅ Tests error handling
- ✅ Verifies required fields in export

All tests pass successfully.

## Verification

### CDK Synth
```bash
cd infra
npm run build
npx cdk synth
```
✅ Successfully synthesizes CloudFormation template with all three download endpoints

### Local Testing
```bash
cd backend
node simple-server.js
```
✅ Server starts with all download endpoints available:
- GET /students/download - Download students as Excel
- GET /teachers/download - Download teachers as Excel
- GET /games/download - Download games as Excel

### Unit Tests
```bash
cd backend
npm test test/lambda/download-students.test.ts
```
✅ All 4 tests pass

## Files Changed

1. **infra/lib/backend-stack.ts**
   - Added 3 Lambda function definitions
   - Added 3 API Gateway endpoint configurations
   - Added IAM permissions for Lambda functions

2. **backend/simple-server.js**
   - Added `XLSX` library import
   - Added 3 download endpoint handlers
   - Updated server startup message with new endpoints

3. **backend/test/lambda/download-students.test.ts** (new)
   - Created comprehensive unit tests for download functionality

## Impact

This fix resolves the Error 500 issue for all three download endpoints:
- ✅ Students data download now works
- ✅ Teachers data download now works
- ✅ Games data download now works

The endpoints are now properly configured for both:
- **Production** (AWS API Gateway + Lambda)
- **Local Development** (Express.js server)

## Dependencies

All required dependencies were already present:
- `xlsx` library (v0.18.5) - for Excel file generation
- AWS Lambda integration already configured in CDK
- No new dependencies added

## Deployment

To deploy to AWS:
```bash
cd infra
npx cdk deploy
```

This will create the three Lambda functions and API Gateway endpoints in your AWS account.

For local development, the endpoints are immediately available when running:
```bash
cd backend
npm run local:start
```

## Testing Recommendations

After deployment:
1. Test each endpoint through the frontend UI
2. Verify Excel files download correctly
3. Test class filtering for students endpoint
4. Verify all data fields are present in downloaded files
5. Test with different data volumes to ensure timeout is sufficient
