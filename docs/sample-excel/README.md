# Sample Excel Templates

This directory contains sample CSV templates for uploading data to the Ho Yu College platform.

## 📋 Available Templates

### 1. Students Template
**File:** [students-template.csv](students-template.csv)

Upload student information including names, marks, class assignments, and credentials.

**Use case:**
- Bulk add new students at the start of a term
- Update student marks after assessments
- Reassign students to different teachers or classes

### 2. Teachers Template
**File:** [teachers-template.csv](teachers-template.csv)

Upload teacher information including credentials, class assignments, and admin status.

**Use case:**
- Add new teachers to the system
- Update class assignments
- Manage admin privileges

### 3. Games Template
**File:** [games-template.csv](games-template.csv)

Upload Scratch game assignments linking games to students and teachers.

**Use case:**
- Assign games to students
- Update game metadata
- Track game statistics

## 🎯 How to Use These Templates

### Option 1: Modify Directly

1. Open the CSV file in Excel, Google Sheets, or a text editor
2. Keep the header row (first row) unchanged
3. Modify the sample data rows or add new rows
4. Save the file
5. Upload via the admin panel or API

### Option 2: Create from Scratch

1. Copy the header row from the template
2. Create a new spreadsheet in your preferred tool
3. Paste headers in first row
4. Add your data starting from row 2
5. Export as CSV (UTF-8) or XLSX
6. Upload via the admin panel or API

## ⚠️ Important Notes

### File Format
- **Encoding**: Always use UTF-8 encoding for CSV files
- **Supported formats**: `.csv`, `.xlsx`, `.xls`
- **Max size**: 10 MB per file
- **Max records**: 4,000 records per file

### Data Validation

#### Students
- `student_id` must be unique and not empty
- `marks` must be between 0 and 1000
- `teacher_id` must exist in teachers table
- All fields are required

#### Teachers
- `teacher_id` must be unique and not empty
- `responsible_class` must be valid JSON array: `["1A", "2B"]`
- `is_admin` must be `true` or `false`
- All fields are required

#### Games
- `game_id` must be unique and not empty
- `game_id` must match the last segment of `scratch_api` URL
- `subject` must be one of:
  - Chinese Language
  - English Language
  - Mathematics
  - Humanities and Science
- `difficulty` must be one of:
  - Beginner
  - Intermediate
  - Advanced
- `student_id` and `teacher_id` must exist
- `scratch_api` must be a valid Scratch project URL

### Character Encoding

These templates include examples with Chinese characters (e.g., 陳大文, 史愛麗).

**When editing:**
- Excel: Save as "CSV UTF-8 (Comma delimited) (*.csv)"
- Google Sheets: Download as "Comma-separated values (.csv)"
- LibreOffice: Save with Character Set: Unicode (UTF-8)

### Passwords

⚠️ **Security Warning:**
- Passwords in these templates are plain text for testing purposes
- The system automatically hashes passwords during upload
- **Never** upload files with real passwords to version control
- Use simple test passwords like "123" or "test123" for development

### Date Format

All timestamps use ISO 8601 format in UTC:
```
YYYY-MM-DDTHH:mm:ss.sssZ
```

Examples:
- `2024-01-20T09:00:00.000Z`
- `2024-12-31T23:59:59.999Z`

## 🧪 Testing Strategy

### Step 1: Validate Template Locally
```bash
# Count rows (should be small for initial testing)
wc -l students-template.csv

# Check encoding
file -i students-template.csv
# Expected: charset=utf-8

# Preview content
head -n 5 students-template.csv
```

### Step 2: Test Upload
1. Start the mock server
2. Navigate to admin panel
3. Select template file
4. Click upload
5. Verify success message

### Step 3: Verify in Database
```bash
# For SQLite
sqlite3 backend/database/ho_yu_college.db "SELECT * FROM students WHERE student_id = 'STU011';"

# For PostgreSQL
docker exec -it ho-yu-college-db psql -U ho_yu_dev -d ho_yu_college -c "SELECT * FROM students WHERE student_id = 'STU011';"
```

## 📚 Additional Resources

For complete documentation on Excel uploads and mock server setup, see:
- [Mock Server Guide](../MOCK_SERVER_GUIDE.md) - Comprehensive setup guide
- [Database README](../../backend/database/README.md) - Database documentation
- [Main README](../../README.md) - Project overview

## 🤝 Contributing

To improve these templates:
1. Ensure changes maintain backward compatibility
2. Update this README if adding new fields
3. Test with both CSV and XLSX formats
4. Verify character encoding (UTF-8)
5. Submit pull request with description

---

**Need Help?** See the [Mock Server Guide](../MOCK_SERVER_GUIDE.md) for troubleshooting and detailed instructions.
