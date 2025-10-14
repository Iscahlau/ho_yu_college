# File Upload Feature - Code Examples

This document provides code examples for the CSV/Excel upload feature with 4000 record limit.

## 1. Updated Constants

**File**: `frontend/src/utils/constants.ts`

```typescript
// File upload limits
export const FILE_UPLOAD_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10 MB in bytes
  MAX_ROWS: 4000, // Changed from 10000 to 4000
  SUPPORTED_FORMATS: ['.xlsx', '.xls', '.csv'],
};
```

## 2. Row Counting Helper Function

**File**: `frontend/src/utils/helpers.ts`

```typescript
/**
 * Count rows in Excel/CSV file
 * @param file - File to count rows in
 * @returns Promise that resolves to number of data rows (excluding header)
 */
export async function countFileRows(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        // Dynamically import xlsx to avoid bundling if not used
        const XLSX = await import('xlsx');
        
        let workbook: any;
        if (file.name.toLowerCase().endsWith('.csv')) {
          // For CSV files, read as text
          const csvText = data as string;
          workbook = XLSX.read(csvText, { type: 'string' });
        } else {
          // For Excel files, read as binary
          workbook = XLSX.read(data, { type: 'binary' });
        }

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON to count rows (excluding header)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Count non-empty rows, excluding header row
        const dataRows = jsonData.slice(1).filter((row: any) => 
          Array.isArray(row) && row.some(cell => 
            cell !== null && cell !== undefined && cell !== ''
          )
        );
        
        resolve(dataRows.length);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    // Read file based on type
    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  });
}
```

## 3. Upload Service

**File**: `frontend/src/services/uploadService.ts`

```typescript
import { FileUploadResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Upload student data file
 */
export async function uploadStudentData(file: File): Promise<FileUploadResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'students');

    const response = await fetch(`${API_BASE_URL}/upload/students`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Failed to upload student data',
        errors: data.errors,
      };
    }

    return {
      success: true,
      message: data.message || 'Student data uploaded successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Similar functions for uploadTeacherData and uploadGameData
```

## 4. Admin Component - File Validation

**File**: `frontend/src/pages/Admin/Admin.tsx`

```typescript
import { useState, useRef } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { validateFileFormat, validateFileSize, countFileRows } from '../../utils/helpers';
import { FILE_UPLOAD_LIMITS } from '../../utils/constants';
import { uploadStudentData } from '../../services/uploadService';

function Admin() {
  // State for feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info' as 'success' | 'error' | 'warning' | 'info',
  });

  // File input refs
  const studentFileInputRef = useRef<HTMLInputElement>(null);

  // Validate uploaded file
  const validateFile = async (file: File): Promise<{ valid: boolean; error?: string }> => {
    // Check file format
    if (!validateFileFormat(file)) {
      return {
        valid: false,
        error: `Invalid file format. Only ${FILE_UPLOAD_LIMITS.SUPPORTED_FORMATS.join(', ')} files are supported.`,
      };
    }

    // Check file size
    if (!validateFileSize(file)) {
      return {
        valid: false,
        error: `File size exceeds ${FILE_UPLOAD_LIMITS.MAX_SIZE / (1024 * 1024)} MB limit.`,
      };
    }

    // Check row count
    try {
      const rowCount = await countFileRows(file);
      if (rowCount > FILE_UPLOAD_LIMITS.MAX_ROWS) {
        return {
          valid: false,
          error: `File contains ${rowCount} records. Maximum allowed is ${FILE_UPLOAD_LIMITS.MAX_ROWS} records.`,
        };
      }
      if (rowCount === 0) {
        return {
          valid: false,
          error: 'File is empty or contains no valid data rows.',
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: 'Failed to read file. Please ensure the file is not corrupted.',
      };
    }

    return { valid: true };
  };

  // Handle student file upload
  const handleUploadStudents = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = await validateFile(file);
    if (!validation.valid) {
      setSnackbar({
        open: true,
        message: validation.error || 'Invalid file',
        severity: 'error',
      });
      if (studentFileInputRef.current) {
        studentFileInputRef.current.value = '';
      }
      return;
    }

    // Upload file
    setSnackbar({
      open: true,
      message: 'Uploading student data...',
      severity: 'info',
    });
    
    const result = await uploadStudentData(file);
    
    setSnackbar({
      open: true,
      message: result.message,
      severity: result.success ? 'success' : 'error',
    });

    // Reset file input
    if (studentFileInputRef.current) {
      studentFileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        type="file"
        ref={studentFileInputRef}
        accept={FILE_UPLOAD_LIMITS.SUPPORTED_FORMATS.join(',')}
        onChange={handleUploadStudents}
        style={{ display: 'none' }}
      />
      
      {/* Upload button */}
      <Button onClick={() => studentFileInputRef.current?.click()}>
        Select File
      </Button>

      {/* Feedback snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
```

## 5. UI Component - Upload Card with Info

```typescript
<Card>
  <CardContent>
    <Typography variant="h6">Student Data</Typography>
    <Typography variant="body2">
      Upload Excel/CSV file to add, update, or delete student records
    </Typography>
    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
      <Chip label=".xlsx" size="small" variant="outlined" />
      <Chip label=".csv" size="small" variant="outlined" />
    </Box>
    <Typography variant="caption" sx={{ color: '#a0aec0' }}>
      Max: {FILE_UPLOAD_LIMITS.MAX_ROWS.toLocaleString()} records, 
      {FILE_UPLOAD_LIMITS.MAX_SIZE / (1024 * 1024)} MB
    </Typography>
  </CardContent>
  <CardActions>
    <Button onClick={() => studentFileInputRef.current?.click()}>
      Select File
    </Button>
  </CardActions>
</Card>
```

## Validation Test Results

```
📋 FILE UPLOAD VALIDATION TEST
Maximum allowed records: 4,000
Maximum file size: 10 MB
Supported formats: .xlsx, .xls, .csv

Testing: valid-students.csv (3 records)
✓ Format valid
✓ Size valid (0.00 MB)
✓ Row count valid (3 rows)
✅ ALL VALIDATIONS PASSED

Testing: empty.csv (0 records)
✓ Format valid
✓ Size valid (0.00 MB)
❌ File is empty or contains no valid data rows

Testing: 4000-records.csv (4000 records)
✓ Format valid
✓ Size valid (0.19 MB)
✓ Row count valid (4000 rows)
✅ ALL VALIDATIONS PASSED

Testing: 4001-records.csv (4001 records)
✓ Format valid
✓ Size valid (0.19 MB)
❌ Too many records: 4001 (max: 4000)
```

## Error Message Examples

### Format Error
```
Invalid file format. Only .xlsx, .xls, .csv files are supported.
```

### Size Error
```
File size exceeds 10 MB limit.
```

### Row Count Error (Too Many)
```
File contains 4,500 records. Maximum allowed is 4,000 records.
```

### Empty File Error
```
File is empty or contains no valid data rows.
```

### Corrupted File Error
```
Failed to read file. Please ensure the file is not corrupted.
```

## Dependencies Added

```json
{
  "dependencies": {
    "xlsx": "^0.18.5"
  }
}
```

The xlsx library adds approximately 430 KB to the bundle (143 KB gzipped) and is loaded dynamically to optimize initial page load.
