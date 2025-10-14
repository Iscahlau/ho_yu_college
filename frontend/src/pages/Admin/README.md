# Admin Page - File Upload Feature

## Overview

The Admin page now supports uploading CSV and Excel files for managing student, teacher, and game data with comprehensive validation.

## Features

### Upload Capabilities

1. **Student Data Upload**
   - Accessible by teachers and admins
   - Supports CSV (.csv) and Excel (.xlsx, .xls) formats
   - Validates file format, size, and row count

2. **Teacher Data Upload** (Admin Only)
   - Only accessible by administrators
   - Supports CSV and Excel formats
   - Same validation rules apply

3. **Game Data Upload**
   - Accessible by teachers and admins
   - Supports CSV and Excel formats
   - Same validation rules apply

## File Validation Rules

### Format Validation
- **Supported formats**: `.xlsx`, `.xls`, `.csv`
- Files with other extensions are rejected with an error message

### Size Validation
- **Maximum file size**: 10 MB
- Files exceeding this limit are rejected

### Row Count Validation
- **Maximum records**: 4,000 rows (excluding header)
- **Minimum records**: 1 row
- Empty files or files with only headers are rejected
- Files exceeding 4,000 records are rejected with a clear message showing the actual count

## User Experience

### Upload Process
1. Click the "Select File" button on the appropriate card
2. Choose a file from the file picker dialog
3. File is automatically validated:
   - Format check
   - Size check
   - Row count check (parses file to count data rows)
4. File is uploaded to the backend
5. Backend processes the file:
   - **Header row is skipped** (first row)
   - **ID-based upsert**: If the ID exists, the record is updated; if not, a new record is created
   - **No delete**: Records not in the file are left unchanged in the database
6. Feedback is displayed via a Snackbar notification:
   - **Success**: Green notification with count of inserted/updated records
   - **Error**: Red notification with specific error details
   - **Info**: Blue notification for progress updates

### Error Messages

- **Invalid Format**: "Invalid file format. Only .xlsx, .xls, .csv files are supported."
- **File Too Large**: "File size exceeds 10 MB limit."
- **Too Many Records**: "File contains X records. Maximum allowed is 4,000 records."
- **Empty File**: "File is empty or contains no valid data rows."
- **Corrupted File**: "Failed to read file. Please ensure the file is not corrupted."

## Implementation Details

### Technologies Used
- **xlsx library**: For parsing Excel and CSV files
- **Material-UI**: For UI components (Snackbar, Alert, file inputs)
- **React Hooks**: useState for state management, useRef for file input refs
- **AWS Lambda**: For backend file processing
- **DynamoDB**: For data storage with upsert operations

### File Processing Logic

#### Header Row Handling
- The first row of the uploaded file is treated as headers
- Column names are extracted from the first row
- Data processing starts from the second row onwards

#### Upsert (Update/Insert) Logic
- **Check existence**: For each data row, check if the ID already exists in DynamoDB
  - Students: checked by `student_id`
  - Teachers: checked by `teacher_id`
  - Games: checked by `game_id`
- **Update**: If the ID exists, update the record with new values
  - Preserves `created_at` timestamp
  - Updates `updated_at` to current timestamp
  - For games: preserves `accumulated_click` count from existing record
- **Insert**: If the ID doesn't exist, create a new record
  - Sets both `created_at` and `updated_at` to current timestamp
  - For games: uses `accumulated_click` from file or defaults to 0
- **No Delete**: Records not mentioned in the file remain unchanged in the database

#### Special Field Handling
- **teacher.responsible_class**: Parses JSON array string (e.g., `["1A", "2A"]`) into array
- **game.accumulated_click**: Preserved from existing record on update, preventing overwrite
- **Timestamps**: Automatically managed (`created_at`, `updated_at`, `last_login`, `last_update`)

### File Parsing
The `countFileRows()` helper function:
1. Reads the file using FileReader API
2. Parses with xlsx library
3. Converts to JSON array
4. Filters out empty rows
5. Returns count excluding header row

### Validation Flow
```
File Selected
    ↓
Format Validation → ❌ Reject if invalid format
    ↓
Size Validation → ❌ Reject if > 10 MB
    ↓
Parse File → ❌ Reject if corrupted
    ↓
Count Rows → ❌ Reject if 0 or > 4000
    ↓
✅ All validations passed
    ↓
Upload to Server (base64 encoded)
    ↓
Backend Processing:
  - Skip header row (row 1)
  - For each data row (row 2+):
    * Check if ID exists
    * Update if exists, Insert if new
  - Generate results summary
    ↓
Show Success/Error Message
  - Display count: X inserted, Y updated
  - Show any row-level errors
```

## API Integration

The upload service (`uploadService.ts`) provides three functions:
- `uploadStudentData(file)`: Uploads to `/upload/students`
- `uploadTeacherData(file)`: Uploads to `/upload/teachers`
- `uploadGameData(file)`: Uploads to `/upload/games`

These functions handle:
- FormData creation
- API communication
- Response parsing
- Error handling

## UI Components

### Upload Cards
Each upload card displays:
- Icon (People, School, or SportsEsports)
- Title (Student Data, Teacher Data, or Game List)
- Description text
- Supported formats as chips
- File size and record limit information
- "Select File" button

### Feedback Snackbar
- Positioned at bottom center
- Auto-dismisses after 6 seconds
- Can be manually closed
- Color-coded by severity:
  - Success: Green
  - Error: Red
  - Warning: Orange
  - Info: Blue

## Testing

### Test Files Created
Located in `/tmp/test-files/`:
- `valid-students.csv`: 3 records (should pass)
- `empty.csv`: 0 records (should fail)
- `4000-records.csv`: exactly 4000 records (should pass)
- `4001-records.csv`: 4001 records (should fail)

### Manual Testing Steps
1. Navigate to `/admin` (requires teacher/admin login)
2. Click "Select File" on any upload card
3. Select a test file
4. Verify appropriate message is displayed
5. Test with different file types and sizes

## Configuration

### Constants (in `utils/constants.ts`)
```typescript
export const FILE_UPLOAD_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10 MB in bytes
  MAX_ROWS: 4000, // Maximum 4000 records per file
  SUPPORTED_FORMATS: ['.xlsx', '.xls', '.csv'],
};
```

### Environment Variables
No additional environment variables are required for the upload feature itself, but the API endpoint can be configured:
```
VITE_API_URL=http://localhost:3000
```

## Security Considerations

1. **File Type Validation**: Files are validated both by extension and content
2. **Size Limits**: Prevents large file uploads that could cause memory issues
3. **Row Limits**: Prevents processing of excessively large datasets
4. **Client-side Validation**: Fast feedback without server round-trip
5. **Server-side Validation**: Should also be implemented in the backend

## Future Enhancements

- [ ] Add file preview before upload
- [ ] Support batch file uploads
- [ ] Add progress bar for large file uploads
- [ ] Provide downloadable template files
- [ ] Add data validation for column headers and data types
- [ ] Support for compressed files (.zip)
