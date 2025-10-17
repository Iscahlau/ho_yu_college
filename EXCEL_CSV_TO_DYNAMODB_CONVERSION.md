# Excel/CSV to DynamoDB Conversion Documentation

## Overview

This document describes the conversion process for transforming uploaded Excel/CSV files into DynamoDB-compatible data structures. The conversion happens automatically when files are uploaded via the admin page.

## Architecture

### Conversion Flow

```
Admin Upload Page (Frontend)
    ↓
File Validation (Client-side)
    ↓
Base64 Encoding & Upload
    ↓
Lambda Handler (students.ts / teachers.ts / games.ts)
    ↓
Excel/CSV Parsing (using xlsx library)
    ↓
Header Extraction & Data Mapping
    ↓
Type Conversion (using conversionUtils)
    ↓
Schema Validation
    ↓
DynamoDB Upsert (GetItem → PutItem)
    ↓
Response with Results
```

## File Parsing

### 1. Excel/CSV Reading

The `xlsx` library is used to parse both Excel (.xlsx, .xls) and CSV files:

```typescript
import * as XLSX from 'xlsx';

// Decode base64 file to buffer
const fileBuffer = Buffer.from(base64File, 'base64');

// Parse file
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
const worksheet = workbook.Sheets[workbook.SheetNames[0]];

// Convert to JSON array (first row = headers)
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
```

### 2. Header and Data Row Extraction

```typescript
// First row contains column headers
const headers = jsonData[0];
// Example: ['student_id', 'name_1', 'marks', 'class', 'teacher_id']

// Remaining rows are data (filter out empty rows)
const dataRows = jsonData.slice(1).filter(row => 
  row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== '')
);
```

## Data Type Conversion

### Conversion Utilities

All type conversions are handled by functions in `lambda/upload/utils/conversionUtils.ts`:

#### String Conversion
```typescript
toString(value: any, defaultValue: string = ''): string
```
- Converts any value to string
- Returns empty string for null/undefined (or specified default)

**Examples:**
```typescript
toString('hello')      // 'hello'
toString(123)          // '123'
toString(null)         // ''
toString(null, 'N/A')  // 'N/A'
```

#### Number Conversion
```typescript
toNumber(value: any, defaultValue: number = 0): number
```
- Converts strings and numbers to numeric type
- Returns 0 for null/undefined/invalid (or specified default)

**Examples:**
```typescript
toNumber('123')        // 123
toNumber('123.45')     // 123.45
toNumber(null)         // 0
toNumber('invalid')    // 0
toNumber(null, 100)    // 100
```

#### Boolean Conversion
```typescript
toBoolean(value: any, defaultValue: boolean = false): boolean
```
- Handles multiple truthy representations: true, 'true', 'TRUE', 1, '1', 'yes'
- Returns false for all other values

**Examples:**
```typescript
toBoolean(true)        // true
toBoolean('true')      // true
toBoolean('TRUE')      // true
toBoolean(1)           // true
toBoolean('1')         // true
toBoolean('yes')       // true
toBoolean(false)       // false
toBoolean('false')     // false
toBoolean(0)           // false
toBoolean('anything')  // false
```

#### Array Conversion
```typescript
toStringArray(value: any, defaultValue: string[] = []): string[]
```
- Parses JSON array strings: `'["1A", "2B"]'`
- Converts existing arrays to string arrays
- Treats single values as single-element arrays

**Examples:**
```typescript
toStringArray('["1A", "2B"]')     // ['1A', '2B']
toStringArray(['1A', '2B'])       // ['1A', '2B']
toStringArray('1A')               // ['1A']
toStringArray(null)               // []
toStringArray('invalid json')     // ['invalid json']
```

#### Date Conversion
```typescript
toDateString(value: any, useCurrentIfInvalid: boolean = true): string
```
- Converts to ISO date string
- Uses current timestamp for null/invalid dates (if flag is true)

**Examples:**
```typescript
toDateString('2024-01-15')           // '2024-01-15T00:00:00.000Z'
toDateString(null)                   // Current timestamp
toDateString('invalid', false)       // 'invalid'
```

## Schema Mapping

### Students Schema

| Excel/CSV Column | DynamoDB Attribute | Type | Required | Description |
|-----------------|-------------------|------|----------|-------------|
| student_id | student_id | String | ✓ | Unique student identifier |
| name_1 | name_1 | String | | Student name (primary language) |
| name_2 | name_2 | String | | Student name (secondary language) |
| marks | marks | Number | | Student marks/score |
| class | class | String | | Class designation (e.g., 1A, 2B) |
| class_no | class_no | String | | Class number/position |
| last_login | last_login | Date | | Last login timestamp |
| last_update | last_update | Date | | Last update timestamp |
| teacher_id | teacher_id | String | | Associated teacher ID |
| password | password | String | | Hashed password |
| created_at | created_at | Date | | Auto-generated on creation |
| updated_at | updated_at | Date | | Auto-updated on each save |

**Conversion Example:**
```typescript
// Excel row: ['STU001', 'John Chan', '陳大文', '150', '1A', '01', '2024-01-15', '2024-01-15', 'TCH001', 'hashed_123']
// Converted to:
{
  student_id: 'STU001',        // toString()
  name_1: 'John Chan',         // toString()
  name_2: '陳大文',            // toString()
  marks: 150,                  // toNumber()
  class: '1A',                 // toString()
  class_no: '01',              // toString()
  last_login: '2024-01-15T...',// toDateString()
  last_update: '2024-01-15T...',// Current timestamp
  teacher_id: 'TCH001',        // toString()
  password: 'hashed_123',      // toString()
  created_at: '2024-01-15T...',// Preserved or new
  updated_at: '2024-01-15T...' // Current timestamp
}
```

### Teachers Schema

| Excel/CSV Column | DynamoDB Attribute | Type | Required | Description |
|-----------------|-------------------|------|----------|-------------|
| teacher_id | teacher_id | String | ✓ | Unique teacher identifier |
| name | name | String | | Teacher name |
| password | password | String | | Hashed password |
| responsible_class | responsible_class | Array | | Classes taught (JSON format) |
| last_login | last_login | Date | | Last login timestamp |
| is_admin | is_admin | Boolean | | Admin flag |
| created_at | created_at | Date | | Auto-generated on creation |
| updated_at | updated_at | Date | | Auto-updated on each save |

**Conversion Example:**
```typescript
// Excel row: ['TCH001', 'Mr. Wong', 'hashed_123', '["1A", "2A"]', '2024-01-15', 'false']
// Converted to:
{
  teacher_id: 'TCH001',           // toString()
  name: 'Mr. Wong',               // toString()
  password: 'hashed_123',         // toString()
  responsible_class: ['1A', '2A'],// toStringArray() - parses JSON
  last_login: '2024-01-15T...',   // toDateString()
  is_admin: false,                // toBoolean()
  created_at: '2024-01-15T...',   // Preserved or new
  updated_at: '2024-01-15T...'    // Current timestamp
}
```

**Special Note:** The `responsible_class` field accepts:
- JSON array string: `'["1A", "2A"]'` → `['1A', '2A']`
- Single class: `'1A'` → `['1A']`
- Already an array: `['1A', '2A']` → `['1A', '2A']`

### Games Schema

| Excel/CSV Column | DynamoDB Attribute | Type | Required | Description |
|-----------------|-------------------|------|----------|-------------|
| game_id | game_id | String | ✓ | Unique game identifier |
| game_name | game_name | String | | Display name of the game |
| student_id | student_id | String | | Creator student ID |
| subject | subject | String | | Subject category |
| difficulty | difficulty | String | | Difficulty level |
| teacher_id | teacher_id | String | | Associated teacher ID |
| last_update | last_update | Date | | Last update timestamp |
| scratch_id | scratch_id | String | | Scratch project ID |
| scratch_api | scratch_api | String | | Scratch project URL |
| accumulated_click | accumulated_click | Number | | Total click count |
| created_at | created_at | Date | | Auto-generated on creation |
| updated_at | updated_at | Date | | Auto-updated on each save |

**Conversion Example:**
```typescript
// Excel row: ['1207260630', 'Character Match', 'STU001', 'Chinese Language', 'Beginner', 'TCH001', '2024-01-10', '123456789', 'https://...', '15']
// Converted to:
{
  game_id: '1207260630',               // toString()
  game_name: 'Character Match',        // toString()
  student_id: 'STU001',                // toString()
  subject: 'Chinese Language',         // toString()
  difficulty: 'Beginner',              // toString()
  teacher_id: 'TCH001',                // toString()
  last_update: '2024-01-10T...',       // Current timestamp
  scratch_id: '123456789',             // toString()
  scratch_api: 'https://...',          // toString()
  accumulated_click: 15,               // toNumber() or preserved from existing
  created_at: '2024-01-10T...',        // Preserved or new
  updated_at: '2024-01-10T...'         // Current timestamp
}
```

**Special Note:** On update, `accumulated_click` is preserved from the existing record, not overwritten from the file.

## Upsert Logic

### Process Flow

For each row in the uploaded file:

1. **Map Row to Object**
   ```typescript
   const record = mapRowToObject(headers, row);
   ```

2. **Validate Required Fields**
   ```typescript
   if (!record.student_id) {
     results.errors.push(`Row ${i + 2}: Missing student_id`);
     continue;
   }
   ```

3. **Check if Record Exists**
   ```typescript
   const existingRecord = await getStudent(record.student_id);
   ```

4. **Prepare Record with Type Conversions**
   ```typescript
   const studentRecord: StudentRecord = {
     student_id: toString(record.student_id),
     name_1: toString(record.name_1),
     marks: toNumber(record.marks),
     // ... other fields
     created_at: existingRecord ? existingRecord.created_at : now,
     updated_at: now,
   };
   ```

5. **Upsert to DynamoDB**
   ```typescript
   await putStudent(studentRecord);
   ```

6. **Track Results**
   ```typescript
   if (existingRecord) {
     results.updated++;
   } else {
     results.inserted++;
   }
   results.processed++;
   ```

### Timestamp Handling

- **created_at**: Set once when record is first created, then preserved on all updates
- **updated_at**: Updated to current timestamp on every save
- **last_login**: Preserved from file (if present) or uses current timestamp
- **last_update**: Set to current timestamp on every save

### Special Field Handling

#### Students
- **marks**: Converted to number, defaults to 0 if invalid
- All other fields are strings

#### Teachers
- **responsible_class**: JSON array parsed to string array
- **is_admin**: Multiple truthy formats accepted (true, 'true', 1, '1', 'yes')

#### Games
- **accumulated_click**: On UPDATE, preserved from existing record (not overwritten)
- **accumulated_click**: On INSERT, uses value from file or defaults to 0

## Error Handling

### Row-level Errors

Errors are collected but don't stop processing:

```typescript
results.errors.push(`Row ${i + 2}: ${error.message}`);
```

Valid rows continue to be processed.

### Error Response Format

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

### Common Error Scenarios

| Scenario | Error Message | Impact |
|----------|--------------|--------|
| Missing required ID | `Row X: Missing student_id` | Row skipped, others continue |
| Invalid data type | `Row X: Invalid value for field Y` | Row skipped, others continue |
| Database error | `Row X: Database error` | Row skipped, others continue |
| File too large | `File contains X records. Maximum allowed is 4,000` | Entire upload rejected |
| Empty file | `File is empty or contains no data rows` | Entire upload rejected |
| Invalid format | `Invalid file format. Only .xlsx, .xls, .csv supported` | Entire upload rejected |

## Edge Cases

### Handling Missing Data

| Input Value | Conversion | Result |
|-------------|------------|--------|
| `null` (string field) | `toString(null)` | `''` (empty string) |
| `undefined` (string field) | `toString(undefined)` | `''` (empty string) |
| `''` (number field) | `toNumber('')` | `0` |
| `null` (number field) | `toNumber(null)` | `0` |
| `'invalid'` (number field) | `toNumber('invalid')` | `0` |
| `null` (boolean field) | `toBoolean(null)` | `false` |
| `null` (array field) | `toStringArray(null)` | `[]` |

### Handling Extra Columns

If the Excel file has more columns than expected:
- Extra columns are ignored
- Only columns with matching headers in the schema are processed

### Handling Missing Columns

If the Excel file is missing expected columns:
- Missing optional fields use default values
- Missing required fields cause row to be skipped with error

## Performance

### Processing Time

| File Size | Rows | Approximate Time |
|-----------|------|------------------|
| Small | < 100 | < 1 second |
| Medium | 100-1000 | 1-10 seconds |
| Large | 1000-4000 | 10-40 seconds |

### Optimizations

- Single DynamoDB GetItem per row (check existence)
- Single DynamoDB PutItem per row (upsert)
- Sequential processing (for data consistency and error tracking)
- Base64 encoding for file transfer

### Limitations

- Maximum 4,000 rows per file
- Maximum 10 MB file size
- Maximum 60-300 second Lambda timeout (depending on configuration)

## Testing

### Unit Tests

See `backend/test/lambda/upload/conversionUtils.test.ts` for comprehensive tests of:
- Type conversion functions
- Schema mappings
- Edge cases
- Integration scenarios

### Running Tests

```bash
cd backend
npm test test/lambda/upload/conversionUtils.test.ts
```

## Code References

### Key Files

- **Conversion Utilities**: `backend/lambda/upload/utils/conversionUtils.ts`
- **Students Handler**: `backend/lambda/upload/students.ts`
- **Teachers Handler**: `backend/lambda/upload/teachers.ts`
- **Games Handler**: `backend/lambda/upload/games.ts`
- **Unit Tests**: `backend/test/lambda/upload/conversionUtils.test.ts`

### Dependencies

- `xlsx@^0.18.5`: Excel/CSV file parsing
- `@aws-sdk/client-dynamodb`: DynamoDB client
- `@aws-sdk/lib-dynamodb`: DynamoDB document operations

## Future Enhancements

Potential improvements to consider:

1. **Batch Operations**: Use DynamoDB BatchWriteItem for better performance
2. **Parallel Processing**: Process multiple rows concurrently
3. **Data Validation**: Add field-level validation rules (e.g., email format, ID patterns)
4. **Dry-run Mode**: Preview changes before committing to database
5. **Rollback Support**: Ability to undo recent imports
6. **Import History**: Track all imports with metadata
7. **Custom Field Mapping**: Allow admins to define custom column-to-field mappings

## Troubleshooting

### Common Issues

**Issue**: "File is empty or contains no data rows"
- **Cause**: File only has headers, no data rows
- **Solution**: Ensure file has at least one data row after the header

**Issue**: "Row X: Missing student_id"
- **Cause**: Required ID field is empty in the row
- **Solution**: Ensure all rows have the required ID field populated

**Issue**: Dates not converting correctly
- **Cause**: Invalid date format in Excel
- **Solution**: Use ISO format (YYYY-MM-DD) or standard date formats

**Issue**: Boolean fields not converting correctly
- **Cause**: Using values other than true/false/1/0/yes/no
- **Solution**: Use standard boolean representations

**Issue**: Array fields not parsing
- **Cause**: Invalid JSON format for array fields
- **Solution**: Use valid JSON array format: `["1A", "2B"]`

## Support

For questions or issues related to file conversion:
1. Check the error messages in the upload response
2. Review this documentation for schema mapping
3. Run unit tests to verify conversion logic
4. Check CloudWatch logs for detailed Lambda execution logs
