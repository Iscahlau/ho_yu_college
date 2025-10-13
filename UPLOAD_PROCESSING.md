# File Upload Processing - Backend Implementation

## Overview

The backend Lambda functions process uploaded Excel/CSV files with **upsert logic** (update existing records or insert new ones) based on ID fields. The header row is automatically skipped during processing.

## Processing Behavior

### Header Row Handling
- **First row (row 1)**: Treated as column headers
- **Data rows (row 2+)**: Processed as records
- Headers are extracted and used to map data to field names

### Upsert Logic (Update or Insert)

For each data row:
1. Extract the ID field (student_id, teacher_id, or game_id)
2. Query DynamoDB to check if a record with this ID exists
3. **If exists**: Update the existing record
   - Keep original `created_at` timestamp
   - Update `updated_at` to current timestamp
   - Update all other fields from the file
   - Special handling for certain fields (see below)
4. **If not exists**: Create a new record
   - Set `created_at` to current timestamp
   - Set `updated_at` to current timestamp
   - Use all values from the file

### No Delete Functionality
- Records **not mentioned in the upload file** remain unchanged in the database
- Only records with IDs in the file are affected (updated or inserted)
- This prevents accidental data loss

## File Format Examples

### Students File (students.xlsx)
```
student_id | name_1      | name_2 | marks | class | class_no | last_login | last_update | teacher_id | password    | created_at | updated_at
-----------|-------------|--------|-------|-------|----------|------------|-------------|------------|-------------|------------|------------
STU001     | John Chan   | 陳大文  | 150   | 1A    | 01       | 2024-01-15 | 2024-01-15  | TCH001     | hashed_123  | ...        | ...
STU002     | Mary Wong   | 黃小明  | 280   | 1A    | 02       | 2024-01-16 | 2024-01-16  | TCH001     | hashed_123  | ...        | ...
```

**Key field**: `student_id`
- If STU001 exists: Update name, marks, class, etc.
- If STU003 is in file but not in DB: Insert as new record
- If STU004 exists in DB but not in file: No change (not deleted)

### Teachers File (teachers.xlsx)
```
teacher_id | name      | password    | responsible_class | last_login | is_admin | created_at | updated_at
-----------|-----------|-------------|-------------------|------------|----------|------------|------------
TCH001     | Mr. Wong  | hashed_123  | ["1A", "2A"]      | 2024-01-15 | false    | ...        | ...
TCH002     | Ms. Chan  | hashed_123  | ["1B"]            | 2024-01-16 | false    | ...        | ...
```

**Key field**: `teacher_id`
**Special handling**: `responsible_class` is parsed from JSON array string

### Games File (games.xlsx)
```
game_id    | game_name           | student_id | subject          | difficulty | teacher_id | last_update | scratch_id  | scratch_api | accumulated_click | created_at | updated_at
-----------|---------------------|------------|------------------|------------|------------|-------------|-------------|-------------|-------------------|------------|------------
1207260630 | Character Match     | STU001     | Chinese Language | Beginner   | TCH001     | 2024-01-10  | 123456789   | https://... | 15                | ...        | ...
1194305031 | Vocabulary Builder  | STU002     | English Language | Beginner   | TCH001     | 2024-01-11  | 234567890   | https://... | 28                | ...        | ...
```

**Key field**: `game_id`
**Special handling**: On update, `accumulated_click` is preserved from the existing record (not overwritten from file)

## Lambda Function Details

### Students Upload (`lambda/upload/students.ts`)
- **Endpoint**: POST `/upload/students`
- **Table**: `ho-yu-students`
- **Partition Key**: `student_id`
- **Required field**: `student_id`
- **Fields**: All fields from file are mapped to DynamoDB record

### Teachers Upload (`lambda/upload/teachers.ts`)
- **Endpoint**: POST `/upload/teachers`
- **Table**: `ho-yu-teachers`
- **Partition Key**: `teacher_id`
- **Required field**: `teacher_id`
- **Special parsing**: `responsible_class` JSON array

### Games Upload (`lambda/upload/games.ts`)
- **Endpoint**: POST `/upload/games`
- **Table**: `ho-yu-games`
- **Partition Key**: `game_id`
- **Required field**: `game_id`
- **Preserved field**: `accumulated_click` (from existing record on update)

## API Request/Response Format

### Request Format
```json
POST /upload/{students|teachers|games}
Content-Type: application/json

{
  "file": "<base64-encoded-file-content>",
  "filename": "upload.xlsx"
}
```

### Success Response
```json
{
  "success": true,
  "message": "Successfully processed 10 students (3 inserted, 7 updated)",
  "processed": 10,
  "inserted": 3,
  "updated": 7
}
```

### Error Response with Row Errors
```json
{
  "success": true,
  "message": "Successfully processed 8 students (2 inserted, 6 updated)",
  "processed": 8,
  "inserted": 2,
  "updated": 6,
  "errors": [
    "Row 5: Missing student_id",
    "Row 12: Database error"
  ]
}
```

### Failure Response
```json
{
  "success": false,
  "message": "File contains 4,500 records. Maximum allowed is 4,000 records."
}
```

## Validation Rules

### Client-side Validation (before upload)
1. **Format**: Only .xlsx, .xls, .csv accepted
2. **Size**: Maximum 10 MB
3. **Row count**: Maximum 4,000 data rows (excluding header)
4. **Empty file**: Must contain at least 1 data row

### Server-side Validation (after upload)
1. **File structure**: Must have header row and at least 1 data row
2. **Row count**: Maximum 4,000 data rows (excluding header)
3. **Required fields**: Each row must have the ID field
4. **Data integrity**: Fields are validated before upsert

## Error Handling

### Row-level Errors
- Errors for individual rows are collected but don't stop processing
- Other valid rows continue to be processed
- All errors are returned in the response

### Critical Errors
- Missing file: HTTP 400
- No data rows: HTTP 400
- Too many rows: HTTP 400
- Database errors: HTTP 500

## Performance Considerations

### Processing Time
- Small files (< 100 rows): < 1 second
- Medium files (100-1000 rows): 1-10 seconds
- Large files (1000-4000 rows): 10-40 seconds

### Optimizations
- Single DynamoDB GetItem per row (to check existence)
- Single DynamoDB PutItem per row (to upsert)
- Batch operations not used to ensure individual error tracking
- Parallel processing not implemented (sequential for data consistency)

## Testing

### Test Scenarios
1. **New records**: Upload file with IDs not in database → All inserted
2. **Existing records**: Upload file with IDs already in database → All updated
3. **Mixed records**: Upload file with both new and existing IDs → Some inserted, some updated
4. **Partial failures**: Upload file with some invalid rows → Valid rows processed, errors reported
5. **Empty file**: Upload file with only headers → Rejected with error
6. **Too many rows**: Upload file with > 4000 rows → Rejected with error

### Example Test Workflow
```bash
# 1. Upload new students
POST /upload/students with 5 new student records
Expected: 5 inserted, 0 updated

# 2. Update existing students
POST /upload/students with 3 records (2 existing IDs, 1 new ID)
Expected: 1 inserted, 2 updated

# 3. Verify no deletes
POST /upload/students with only 1 record
Expected: 1 updated, all other students still in database
```

## Deployment

### Dependencies
- `xlsx`: For parsing Excel/CSV files
- `@aws-sdk/client-dynamodb`: DynamoDB client
- `@aws-sdk/lib-dynamodb`: DynamoDB document client
- `@types/aws-lambda`: TypeScript types for Lambda

### Environment Variables
- `STUDENTS_TABLE_NAME`: DynamoDB table name for students (default: `ho-yu-students`)
- `TEACHERS_TABLE_NAME`: DynamoDB table name for teachers (default: `ho-yu-teachers`)
- `GAMES_TABLE_NAME`: DynamoDB table name for games (default: `ho-yu-games`)

### CDK Configuration
Lambda functions should be configured in the CDK stack with:
- Runtime: Node.js 18+
- Memory: 256 MB minimum (512 MB recommended for large files)
- Timeout: 60 seconds minimum (300 seconds for 4000 records)
- IAM permissions: DynamoDB GetItem and PutItem on respective tables

## Security Considerations

### Authentication
- Upload endpoints should be protected with authentication
- Only teachers/admins should be able to upload files
- Teacher uploads (admin only) require additional permission check

### Authorization
- Students upload: Accessible by teachers and admins
- Teachers upload: Accessible by admins only
- Games upload: Accessible by teachers and admins

### Data Validation
- All input data should be validated before database write
- SQL injection not applicable (NoSQL database)
- Type checking performed for numeric fields
- String fields should be sanitized if displayed in HTML

### Sensitive Data
- Passwords in upload files should already be hashed
- Do not log sensitive data in CloudWatch logs
- Consider encrypting data at rest in DynamoDB
