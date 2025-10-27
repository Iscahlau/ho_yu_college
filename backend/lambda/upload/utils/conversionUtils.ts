/**
 * Data Conversion Utilities for Excel/CSV to DynamoDB
 * 
 * This module provides utility functions to convert uploaded Excel/CSV data
 * into DynamoDB-compatible formats. It handles data type conversions,
 * validation, and schema mapping for students, teachers, and games.
 * 
 * @module conversionUtils
 */

/**
 * Converts a value to a string, handling null/undefined cases
 * @param value - The value to convert
 * @param defaultValue - Default value if input is null/undefined (default: empty string)
 * @returns String representation of the value
 */
export function toString(value: any, defaultValue: string = ''): string {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  return String(value);
}

/**
 * Converts a value to a number, handling various input formats
 * @param value - The value to convert (can be string, number, or null)
 * @param defaultValue - Default value if conversion fails (default: 0)
 * @returns Numeric representation of the value
 * 
 * @example
 * toNumber('123')      // 123
 * toNumber('123.45')   // 123.45
 * toNumber(null, 100)  // 100
 * toNumber('invalid')  // 0
 */
export function toNumber(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  if (typeof value === 'number') {
    return value;
  }
  
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Converts a value to a boolean, handling various truthy representations
 * @param value - The value to convert
 * @param defaultValue - Default value if input is null/undefined (default: false)
 * @returns Boolean representation of the value
 * 
 * @example
 * toBoolean(true)      // true
 * toBoolean('true')    // true
 * toBoolean('TRUE')    // true
 * toBoolean(1)         // true
 * toBoolean('1')       // true
 * toBoolean(false)     // false
 * toBoolean('false')   // false
 * toBoolean(0)         // false
 * toBoolean(null)      // false
 */
export function toBoolean(value: any, defaultValue: boolean = false): boolean {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'number') {
    return value !== 0;
  }
  
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  
  return defaultValue;
}

/**
 * Parses a JSON array string or converts existing array to string array
 * @param value - The value to parse (JSON string, array, or single value)
 * @param defaultValue - Default value if parsing fails (default: empty array)
 * @returns Array of strings
 * 
 * @example
 * toStringArray('["1A", "2B"]')           // ["1A", "2B"]
 * toStringArray(['1A', '2B'])             // ["1A", "2B"]
 * toStringArray('1A')                     // ["1A"]
 * toStringArray(null)                     // []
 * toStringArray('invalid json', ['1A'])   // ["1A"]
 */
export function toStringArray(value: any, defaultValue: string[] = []): string[] {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  // Already an array
  if (Array.isArray(value)) {
    return value.map(item => String(item));
  }
  
  // Try to parse as JSON
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item));
      }
      // If JSON parsed but not an array, treat as single value
      return [String(parsed)];
    } catch {
      // If not valid JSON, treat as single value
      return [value];
    }
  }
  
  // Convert single value to array
  return [String(value)];
}

/**
 * Converts an ISO date string to a valid date string, or returns current timestamp
 * @param value - The date value to convert
 * @param useCurrentIfInvalid - Whether to use current timestamp if value is invalid (default: true)
 * @returns ISO date string
 * 
 * @example
 * toDateString('2024-01-15T10:30:00Z')  // '2024-01-15T10:30:00Z'
 * toDateString(null)                     // Current timestamp
 * toDateString('invalid', false)         // 'invalid'
 */
export function toDateString(value: any, useCurrentIfInvalid: boolean = true): string {
  if (value === null || value === undefined || value === '') {
    return useCurrentIfInvalid ? new Date().toISOString() : '';
  }
  
  const dateStr = String(value);
  
  // Check if it's already a valid ISO date string
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }
  
  // If invalid and should use current timestamp
  if (useCurrentIfInvalid) {
    return new Date().toISOString();
  }
  
  // Return original value if not using current timestamp
  return dateStr;
}

/**
 * Maps a row of data from Excel/CSV to an object using headers
 * @param headers - Array of column headers from the first row
 * @param row - Array of cell values from a data row
 * @returns Object with header keys mapped to row values
 * 
 * @example
 * const headers = ['student_id', 'name', 'marks'];
 * const row = ['STU001', 'John', 85];
 * mapRowToObject(headers, row);
 * // Returns: { student_id: 'STU001', name: 'John', marks: 85 }
 */
export function mapRowToObject(headers: any[], row: any[]): Record<string, any> {
  const record: Record<string, any> = {};
  headers.forEach((header, index) => {
    if (header) {
      record[String(header)] = row[index];
    }
  });
  return record;
}

/**
 * Validates that a required field exists and is not empty
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns Object with valid flag and optional error message
 * 
 * @example
 * validateRequiredField('STU001', 'student_id')
 * // Returns: { valid: true }
 * 
 * validateRequiredField(null, 'student_id')
 * // Returns: { valid: false, error: 'Missing student_id' }
 */
export function validateRequiredField(
  value: any,
  fieldName: string
): { valid: boolean; error?: string } {
  if (value === null || value === undefined || value === '') {
    return {
      valid: false,
      error: `Missing ${fieldName}`,
    };
  }
  return { valid: true };
}

/**
 * Schema mapping documentation for students
 * This describes how Excel/CSV columns map to DynamoDB attributes
 */
export const STUDENT_SCHEMA_MAPPING = {
  student_id: { type: 'string', required: true, description: 'Unique student identifier' },
  name_1: { type: 'string', required: false, description: 'Student name (primary language)' },
  name_2: { type: 'string', required: false, description: 'Student name (secondary language)' },
  marks: { type: 'number', required: false, description: 'Student marks/score' },
  class: { type: 'string', required: false, description: 'Class designation (e.g., 1A, 2B)' },
  class_no: { type: 'string', required: false, description: 'Class number/position' },
  last_login: { type: 'date', required: false, description: 'Last login timestamp' },
  last_update: { type: 'date', required: false, description: 'Last update timestamp' },
  teacher_id: { type: 'string', required: false, description: 'Associated teacher ID' },
  password: { type: 'string', required: false, description: 'Hashed password' },
  created_at: { type: 'date', required: false, description: 'Record creation timestamp (auto-generated)' },
  updated_at: { type: 'date', required: false, description: 'Record update timestamp (auto-generated)' },
};

/**
 * Schema mapping documentation for teachers
 * This describes how Excel/CSV columns map to DynamoDB attributes
 */
export const TEACHER_SCHEMA_MAPPING = {
  teacher_id: { type: 'string', required: true, description: 'Unique teacher identifier' },
  name: { type: 'string', required: false, description: 'Teacher name' },
  password: { type: 'string', required: false, description: 'Hashed password' },
  responsible_class: { type: 'array', required: false, description: 'Array of classes (JSON format in Excel/CSV)' },
  last_login: { type: 'date', required: false, description: 'Last login timestamp' },
  is_admin: { type: 'boolean', required: false, description: 'Admin flag (true/false/1/0)' },
  created_at: { type: 'date', required: false, description: 'Record creation timestamp (auto-generated)' },
  updated_at: { type: 'date', required: false, description: 'Record update timestamp (auto-generated)' },
};

/**
 * Schema mapping documentation for games
 * This describes how Excel/CSV columns map to DynamoDB attributes
 */
export const GAME_SCHEMA_MAPPING = {
  game_id: { type: 'string', required: true, description: 'Unique game identifier' },
  game_name: { type: 'string', required: false, description: 'Display name of the game' },
  student_id: { type: 'string', required: false, description: 'ID of student who created the game' },
  subject: { type: 'string', required: false, description: 'Subject category' },
  difficulty: { type: 'string', required: false, description: 'Difficulty level (Beginner/Intermediate/Advanced)' },
  teacher_id: { type: 'string', required: false, description: 'Associated teacher ID' },
  last_update: { type: 'date', required: false, description: 'Last update timestamp' },
  scratch_api: { type: 'string', required: false, description: 'Scratch project URL' },
  accumulated_click: { type: 'number', required: false, description: 'Total click count (preserved on update)' },
  created_at: { type: 'date', required: false, description: 'Record creation timestamp (auto-generated)' },
  updated_at: { type: 'date', required: false, description: 'Record update timestamp (auto-generated)' },
};
