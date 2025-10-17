"use strict";
/**
 * Data Conversion Utilities for Excel/CSV to DynamoDB
 *
 * This module provides utility functions to convert uploaded Excel/CSV data
 * into DynamoDB-compatible formats. It handles data type conversions,
 * validation, and schema mapping for students, teachers, and games.
 *
 * @module conversionUtils
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GAME_SCHEMA_MAPPING = exports.TEACHER_SCHEMA_MAPPING = exports.STUDENT_SCHEMA_MAPPING = void 0;
exports.toString = toString;
exports.toNumber = toNumber;
exports.toBoolean = toBoolean;
exports.toStringArray = toStringArray;
exports.toDateString = toDateString;
exports.mapRowToObject = mapRowToObject;
exports.validateRequiredField = validateRequiredField;
/**
 * Converts a value to a string, handling null/undefined cases
 * @param value - The value to convert
 * @param defaultValue - Default value if input is null/undefined (default: empty string)
 * @returns String representation of the value
 */
function toString(value, defaultValue = '') {
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
function toNumber(value, defaultValue = 0) {
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
function toBoolean(value, defaultValue = false) {
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
function toStringArray(value, defaultValue = []) {
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
        }
        catch {
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
function toDateString(value, useCurrentIfInvalid = true) {
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
function mapRowToObject(headers, row) {
    const record = {};
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
function validateRequiredField(value, fieldName) {
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
exports.STUDENT_SCHEMA_MAPPING = {
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
exports.TEACHER_SCHEMA_MAPPING = {
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
exports.GAME_SCHEMA_MAPPING = {
    game_id: { type: 'string', required: true, description: 'Unique game identifier' },
    game_name: { type: 'string', required: false, description: 'Display name of the game' },
    student_id: { type: 'string', required: false, description: 'ID of student who created the game' },
    subject: { type: 'string', required: false, description: 'Subject category' },
    difficulty: { type: 'string', required: false, description: 'Difficulty level (Beginner/Intermediate/Advanced)' },
    teacher_id: { type: 'string', required: false, description: 'Associated teacher ID' },
    last_update: { type: 'date', required: false, description: 'Last update timestamp' },
    scratch_id: { type: 'string', required: false, description: 'Scratch project ID' },
    scratch_api: { type: 'string', required: false, description: 'Scratch project URL' },
    accumulated_click: { type: 'number', required: false, description: 'Total click count (preserved on update)' },
    created_at: { type: 'date', required: false, description: 'Record creation timestamp (auto-generated)' },
    updated_at: { type: 'date', required: false, description: 'Record update timestamp (auto-generated)' },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udmVyc2lvblV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29udmVyc2lvblV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7R0FRRzs7O0FBUUgsNEJBS0M7QUFjRCw0QkFXQztBQW1CRCw4QkFtQkM7QUFlRCxzQ0EyQkM7QUFhRCxvQ0FvQkM7QUFjRCx3Q0FRQztBQWVELHNEQVdDO0FBck1EOzs7OztHQUtHO0FBQ0gsU0FBZ0IsUUFBUSxDQUFDLEtBQVUsRUFBRSxlQUF1QixFQUFFO0lBQzVELElBQUksS0FBSyxLQUFLLElBQUksSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDMUMsT0FBTyxZQUFZLENBQUM7SUFDdEIsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3ZCLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7R0FXRztBQUNILFNBQWdCLFFBQVEsQ0FBQyxLQUFVLEVBQUUsZUFBdUIsQ0FBQztJQUMzRCxJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksS0FBSyxLQUFLLFNBQVMsSUFBSSxLQUFLLEtBQUssRUFBRSxFQUFFLENBQUM7UUFDMUQsT0FBTyxZQUFZLENBQUM7SUFDdEIsQ0FBQztJQUVELElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDOUIsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzdCLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUMvQyxDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQkc7QUFDSCxTQUFnQixTQUFTLENBQUMsS0FBVSxFQUFFLGVBQXdCLEtBQUs7SUFDakUsSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUUsQ0FB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LFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsbURBQW1ELEVBQUU7SUFDakgsVUFBVSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSx1QkFBdUIsRUFBRTtJQUNyRixXQUFXLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLHVCQUF1QixFQUFFO0lBQ3BGLFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsb0JBQW9CLEVBQUU7SUFDbEYsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxxQkFBcUIsRUFBRTtJQUNwRixpQkFBaUIsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUseUNBQXlDLEVBQUU7SUFDOUcsVUFBVSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSw0Q0FBNEMsRUFBRTtJQUN4RyxVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLDBDQUEwQyxFQUFFO0NBQ3ZHLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIERhdGEgQ29udmVyc2lvbiBVdGlsaXRpZXMgZm9yIEV4Y2VsL0NTViB0byBEeW5hbW9EQlxuICogXG4gKiBUaGlzIG1vZHVsZSBwcm92aWRlcyB1dGlsaXR5IGZ1bmN0aW9ucyB0byBjb252ZXJ0IHVwbG9hZGVkIEV4Y2VsL0NTViBkYXRhXG4gKiBpbnRvIER5bmFtb0RCLWNvbXBhdGlibGUgZm9ybWF0cy4gSXQgaGFuZGxlcyBkYXRhIHR5cGUgY29udmVyc2lvbnMsXG4gKiB2YWxpZGF0aW9uLCBhbmQgc2NoZW1hIG1hcHBpbmcgZm9yIHN0dWRlbnRzLCB0ZWFjaGVycywgYW5kIGdhbWVzLlxuICogXG4gKiBAbW9kdWxlIGNvbnZlcnNpb25VdGlsc1xuICovXG5cbi8qKlxuICogQ29udmVydHMgYSB2YWx1ZSB0byBhIHN0cmluZywgaGFuZGxpbmcgbnVsbC91bmRlZmluZWQgY2FzZXNcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZGVmYXVsdFZhbHVlIC0gRGVmYXVsdCB2YWx1ZSBpZiBpbnB1dCBpcyBudWxsL3VuZGVmaW5lZCAoZGVmYXVsdDogZW1wdHkgc3RyaW5nKVxuICogQHJldHVybnMgU3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSB2YWx1ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9TdHJpbmcodmFsdWU6IGFueSwgZGVmYXVsdFZhbHVlOiBzdHJpbmcgPSAnJyk6IHN0cmluZyB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgfVxuICByZXR1cm4gU3RyaW5nKHZhbHVlKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhIHZhbHVlIHRvIGEgbnVtYmVyLCBoYW5kbGluZyB2YXJpb3VzIGlucHV0IGZvcm1hdHNcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0IChjYW4gYmUgc3RyaW5nLCBudW1iZXIsIG9yIG51bGwpXG4gKiBAcGFyYW0gZGVmYXVsdFZhbHVlIC0gRGVmYXVsdCB2YWx1ZSBpZiBjb252ZXJzaW9uIGZhaWxzIChkZWZhdWx0OiAwKVxuICogQHJldHVybnMgTnVtZXJpYyByZXByZXNlbnRhdGlvbiBvZiB0aGUgdmFsdWVcbiAqIFxuICogQGV4YW1wbGVcbiAqIHRvTnVtYmVyKCcxMjMnKSAgICAgIC8vIDEyM1xuICogdG9OdW1iZXIoJzEyMy40NScpICAgLy8gMTIzLjQ1XG4gKiB0b051bWJlcihudWxsLCAxMDApICAvLyAxMDBcbiAqIHRvTnVtYmVyKCdpbnZhbGlkJykgIC8vIDBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvTnVtYmVyKHZhbHVlOiBhbnksIGRlZmF1bHRWYWx1ZTogbnVtYmVyID0gMCk6IG51bWJlciB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gIH1cbiAgXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIFxuICBjb25zdCBwYXJzZWQgPSBOdW1iZXIodmFsdWUpO1xuICByZXR1cm4gaXNOYU4ocGFyc2VkKSA/IGRlZmF1bHRWYWx1ZSA6IHBhcnNlZDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhIHZhbHVlIHRvIGEgYm9vbGVhbiwgaGFuZGxpbmcgdmFyaW91cyB0cnV0aHkgcmVwcmVzZW50YXRpb25zXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gY29udmVydFxuICogQHBhcmFtIGRlZmF1bHRWYWx1ZSAtIERlZmF1bHQgdmFsdWUgaWYgaW5wdXQgaXMgbnVsbC91bmRlZmluZWQgKGRlZmF1bHQ6IGZhbHNlKVxuICogQHJldHVybnMgQm9vbGVhbiByZXByZXNlbnRhdGlvbiBvZiB0aGUgdmFsdWVcbiAqIFxuICogQGV4YW1wbGVcbiAqIHRvQm9vbGVhbih0cnVlKSAgICAgIC8vIHRydWVcbiAqIHRvQm9vbGVhbigndHJ1ZScpICAgIC8vIHRydWVcbiAqIHRvQm9vbGVhbignVFJVRScpICAgIC8vIHRydWVcbiAqIHRvQm9vbGVhbigxKSAgICAgICAgIC8vIHRydWVcbiAqIHRvQm9vbGVhbignMScpICAgICAgIC8vIHRydWVcbiAqIHRvQm9vbGVhbihmYWxzZSkgICAgIC8vIGZhbHNlXG4gKiB0b0Jvb2xlYW4oJ2ZhbHNlJykgICAvLyBmYWxzZVxuICogdG9Cb29sZWFuKDApICAgICAgICAgLy8gZmFsc2VcbiAqIHRvQm9vbGVhbihudWxsKSAgICAgIC8vIGZhbHNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b0Jvb2xlYW4odmFsdWU6IGFueSwgZGVmYXVsdFZhbHVlOiBib29sZWFuID0gZmFsc2UpOiBib29sZWFuIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICB9XG4gIFxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIHZhbHVlICE9PSAwO1xuICB9XG4gIFxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIGNvbnN0IGxvd2VyID0gdmFsdWUudG9Mb3dlckNhc2UoKS50cmltKCk7XG4gICAgcmV0dXJuIGxvd2VyID09PSAndHJ1ZScgfHwgbG93ZXIgPT09ICcxJyB8fCBsb3dlciA9PT0gJ3llcyc7XG4gIH1cbiAgXG4gIHJldHVybiBkZWZhdWx0VmFsdWU7XG59XG5cbi8qKlxuICogUGFyc2VzIGEgSlNPTiBhcnJheSBzdHJpbmcgb3IgY29udmVydHMgZXhpc3RpbmcgYXJyYXkgdG8gc3RyaW5nIGFycmF5XG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gcGFyc2UgKEpTT04gc3RyaW5nLCBhcnJheSwgb3Igc2luZ2xlIHZhbHVlKVxuICogQHBhcmFtIGRlZmF1bHRWYWx1ZSAtIERlZmF1bHQgdmFsdWUgaWYgcGFyc2luZyBmYWlscyAoZGVmYXVsdDogZW1wdHkgYXJyYXkpXG4gKiBAcmV0dXJucyBBcnJheSBvZiBzdHJpbmdzXG4gKiBcbiAqIEBleGFtcGxlXG4gKiB0b1N0cmluZ0FycmF5KCdbXCIxQVwiLCBcIjJCXCJdJykgICAgICAgICAgIC8vIFtcIjFBXCIsIFwiMkJcIl1cbiAqIHRvU3RyaW5nQXJyYXkoWycxQScsICcyQiddKSAgICAgICAgICAgICAvLyBbXCIxQVwiLCBcIjJCXCJdXG4gKiB0b1N0cmluZ0FycmF5KCcxQScpICAgICAgICAgICAgICAgICAgICAgLy8gW1wiMUFcIl1cbiAqIHRvU3RyaW5nQXJyYXkobnVsbCkgICAgICAgICAgICAgICAgICAgICAvLyBbXVxuICogdG9TdHJpbmdBcnJheSgnaW52YWxpZCBqc29uJywgWycxQSddKSAgIC8vIFtcIjFBXCJdXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b1N0cmluZ0FycmF5KHZhbHVlOiBhbnksIGRlZmF1bHRWYWx1ZTogc3RyaW5nW10gPSBbXSk6IHN0cmluZ1tdIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgfVxuICBcbiAgLy8gQWxyZWFkeSBhbiBhcnJheVxuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWUubWFwKGl0ZW0gPT4gU3RyaW5nKGl0ZW0pKTtcbiAgfVxuICBcbiAgLy8gVHJ5IHRvIHBhcnNlIGFzIEpTT05cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZSh2YWx1ZSk7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShwYXJzZWQpKSB7XG4gICAgICAgIHJldHVybiBwYXJzZWQubWFwKGl0ZW0gPT4gU3RyaW5nKGl0ZW0pKTtcbiAgICAgIH1cbiAgICAgIC8vIElmIEpTT04gcGFyc2VkIGJ1dCBub3QgYW4gYXJyYXksIHRyZWF0IGFzIHNpbmdsZSB2YWx1ZVxuICAgICAgcmV0dXJuIFtTdHJpbmcocGFyc2VkKV07XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBJZiBub3QgdmFsaWQgSlNPTiwgdHJlYXQgYXMgc2luZ2xlIHZhbHVlXG4gICAgICByZXR1cm4gW3ZhbHVlXTtcbiAgICB9XG4gIH1cbiAgXG4gIC8vIENvbnZlcnQgc2luZ2xlIHZhbHVlIHRvIGFycmF5XG4gIHJldHVybiBbU3RyaW5nKHZhbHVlKV07XG59XG5cbi8qKlxuICogQ29udmVydHMgYW4gSVNPIGRhdGUgc3RyaW5nIHRvIGEgdmFsaWQgZGF0ZSBzdHJpbmcsIG9yIHJldHVybnMgY3VycmVudCB0aW1lc3RhbXBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSBkYXRlIHZhbHVlIHRvIGNvbnZlcnRcbiAqIEBwYXJhbSB1c2VDdXJyZW50SWZJbnZhbGlkIC0gV2hldGhlciB0byB1c2UgY3VycmVudCB0aW1lc3RhbXAgaWYgdmFsdWUgaXMgaW52YWxpZCAoZGVmYXVsdDogdHJ1ZSlcbiAqIEByZXR1cm5zIElTTyBkYXRlIHN0cmluZ1xuICogXG4gKiBAZXhhbXBsZVxuICogdG9EYXRlU3RyaW5nKCcyMDI0LTAxLTE1VDEwOjMwOjAwWicpICAvLyAnMjAyNC0wMS0xNVQxMDozMDowMFonXG4gKiB0b0RhdGVTdHJpbmcobnVsbCkgICAgICAgICAgICAgICAgICAgICAvLyBDdXJyZW50IHRpbWVzdGFtcFxuICogdG9EYXRlU3RyaW5nKCdpbnZhbGlkJywgZmFsc2UpICAgICAgICAgLy8gJ2ludmFsaWQnXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b0RhdGVTdHJpbmcodmFsdWU6IGFueSwgdXNlQ3VycmVudElmSW52YWxpZDogYm9vbGVhbiA9IHRydWUpOiBzdHJpbmcge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdXNlQ3VycmVudElmSW52YWxpZCA/IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSA6ICcnO1xuICB9XG4gIFxuICBjb25zdCBkYXRlU3RyID0gU3RyaW5nKHZhbHVlKTtcbiAgXG4gIC8vIENoZWNrIGlmIGl0J3MgYWxyZWFkeSBhIHZhbGlkIElTTyBkYXRlIHN0cmluZ1xuICBjb25zdCBkYXRlID0gbmV3IERhdGUoZGF0ZVN0cik7XG4gIGlmICghaXNOYU4oZGF0ZS5nZXRUaW1lKCkpKSB7XG4gICAgcmV0dXJuIGRhdGUudG9JU09TdHJpbmcoKTtcbiAgfVxuICBcbiAgLy8gSWYgaW52YWxpZCBhbmQgc2hvdWxkIHVzZSBjdXJyZW50IHRpbWVzdGFtcFxuICBpZiAodXNlQ3VycmVudElmSW52YWxpZCkge1xuICAgIHJldHVybiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gIH1cbiAgXG4gIC8vIFJldHVybiBvcmlnaW5hbCB2YWx1ZSBpZiBub3QgdXNpbmcgY3VycmVudCB0aW1lc3RhbXBcbiAgcmV0dXJuIGRhdGVTdHI7XG59XG5cbi8qKlxuICogTWFwcyBhIHJvdyBvZiBkYXRhIGZyb20gRXhjZWwvQ1NWIHRvIGFuIG9iamVjdCB1c2luZyBoZWFkZXJzXG4gKiBAcGFyYW0gaGVhZGVycyAtIEFycmF5IG9mIGNvbHVtbiBoZWFkZXJzIGZyb20gdGhlIGZpcnN0IHJvd1xuICogQHBhcmFtIHJvdyAtIEFycmF5IG9mIGNlbGwgdmFsdWVzIGZyb20gYSBkYXRhIHJvd1xuICogQHJldHVybnMgT2JqZWN0IHdpdGggaGVhZGVyIGtleXMgbWFwcGVkIHRvIHJvdyB2YWx1ZXNcbiAqIFxuICogQGV4YW1wbGVcbiAqIGNvbnN0IGhlYWRlcnMgPSBbJ3N0dWRlbnRfaWQnLCAnbmFtZScsICdtYXJrcyddO1xuICogY29uc3Qgcm93ID0gWydTVFUwMDEnLCAnSm9obicsIDg1XTtcbiAqIG1hcFJvd1RvT2JqZWN0KGhlYWRlcnMsIHJvdyk7XG4gKiAvLyBSZXR1cm5zOiB7IHN0dWRlbnRfaWQ6ICdTVFUwMDEnLCBuYW1lOiAnSm9obicsIG1hcmtzOiA4NSB9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXBSb3dUb09iamVjdChoZWFkZXJzOiBhbnlbXSwgcm93OiBhbnlbXSk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xuICBjb25zdCByZWNvcmQ6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcbiAgaGVhZGVycy5mb3JFYWNoKChoZWFkZXIsIGluZGV4KSA9PiB7XG4gICAgaWYgKGhlYWRlcikge1xuICAgICAgcmVjb3JkW1N0cmluZyhoZWFkZXIpXSA9IHJvd1tpbmRleF07XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHJlY29yZDtcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBhIHJlcXVpcmVkIGZpZWxkIGV4aXN0cyBhbmQgaXMgbm90IGVtcHR5XG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGVcbiAqIEBwYXJhbSBmaWVsZE5hbWUgLSBOYW1lIG9mIHRoZSBmaWVsZCBmb3IgZXJyb3IgbWVzc2FnZXNcbiAqIEByZXR1cm5zIE9iamVjdCB3aXRoIHZhbGlkIGZsYWcgYW5kIG9wdGlvbmFsIGVycm9yIG1lc3NhZ2VcbiAqIFxuICogQGV4YW1wbGVcbiAqIHZhbGlkYXRlUmVxdWlyZWRGaWVsZCgnU1RVMDAxJywgJ3N0dWRlbnRfaWQnKVxuICogLy8gUmV0dXJuczogeyB2YWxpZDogdHJ1ZSB9XG4gKiBcbiAqIHZhbGlkYXRlUmVxdWlyZWRGaWVsZChudWxsLCAnc3R1ZGVudF9pZCcpXG4gKiAvLyBSZXR1cm5zOiB7IHZhbGlkOiBmYWxzZSwgZXJyb3I6ICdNaXNzaW5nIHN0dWRlbnRfaWQnIH1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlUmVxdWlyZWRGaWVsZChcbiAgdmFsdWU6IGFueSxcbiAgZmllbGROYW1lOiBzdHJpbmdcbik6IHsgdmFsaWQ6IGJvb2xlYW47IGVycm9yPzogc3RyaW5nIH0ge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdmFsaWQ6IGZhbHNlLFxuICAgICAgZXJyb3I6IGBNaXNzaW5nICR7ZmllbGROYW1lfWAsXG4gICAgfTtcbiAgfVxuICByZXR1cm4geyB2YWxpZDogdHJ1ZSB9O1xufVxuXG4vKipcbiAqIFNjaGVtYSBtYXBwaW5nIGRvY3VtZW50YXRpb24gZm9yIHN0dWRlbnRzXG4gKiBUaGlzIGRlc2NyaWJlcyBob3cgRXhjZWwvQ1NWIGNvbHVtbnMgbWFwIHRvIER5bmFtb0RCIGF0dHJpYnV0ZXNcbiAqL1xuZXhwb3J0IGNvbnN0IFNUVURFTlRfU0NIRU1BX01BUFBJTkcgPSB7XG4gIHN0dWRlbnRfaWQ6IHsgdHlwZTogJ3N0cmluZycsIHJlcXVpcmVkOiB0cnVlLCBkZXNjcmlwdGlvbjogJ1VuaXF1ZSBzdHVkZW50IGlkZW50aWZpZXInIH0sXG4gIG5hbWVfMTogeyB0eXBlOiAnc3RyaW5nJywgcmVxdWlyZWQ6IGZhbHNlLCBkZXNjcmlwdGlvbjogJ1N0dWRlbnQgbmFtZSAocHJpbWFyeSBsYW5ndWFnZSknIH0sXG4gIG5hbWVfMjogeyB0eXBlOiAnc3RyaW5nJywgcmVxdWlyZWQ6IGZhbHNlLCBkZXNjcmlwdGlvbjogJ1N0dWRlbnQgbmFtZSAoc2Vjb25kYXJ5IGxhbmd1YWdlKScgfSxcbiAgbWFya3M6IHsgdHlwZTogJ251bWJlcicsIHJlcXVpcmVkOiBmYWxzZSwgZGVzY3JpcHRpb246ICdTdHVkZW50IG1hcmtzL3Njb3JlJyB9LFxuICBjbGFzczogeyB0eXBlOiAnc3RyaW5nJywgcmVxdWlyZWQ6IGZhbHNlLCBkZXNjcmlwdGlvbjogJ0NsYXNzIGRlc2lnbmF0aW9uIChlLmcuLCAxQSwgMkIpJyB9LFxuICBjbGFzc19ubzogeyB0eXBlOiAnc3RyaW5nJywgcmVxdWlyZWQ6IGZhbHNlLCBkZXNjcmlwdGlvbjogJ0NsYXNzIG51bWJlci9wb3NpdGlvbicgfSxcbiAgbGFzdF9sb2dpbjogeyB0eXBlOiAnZGF0ZScsIHJlcXVpcmVkOiBmYWxzZSwgZGVzY3JpcHRpb246ICdMYXN0IGxvZ2luIHRpbWVzdGFtcCcgfSxcbiAgbGFzdF91cGRhdGU6IHsgdHlwZTogJ2RhdGUnLCByZXF1aXJlZDogZmFsc2UsIGRlc2NyaXB0aW9uOiAnTGFzdCB1cGRhdGUgdGltZXN0YW1wJyB9LFxuICB0ZWFjaGVyX2lkOiB7IHR5cGU6ICdzdHJpbmcnLCByZXF1aXJlZDogZmFsc2UsIGRlc2NyaXB0aW9uOiAnQXNzb2NpYXRlZCB0ZWFjaGVyIElEJyB9LFxuICBwYXNzd29yZDogeyB0eXBlOiAnc3RyaW5nJywgcmVxdWlyZWQ6IGZhbHNlLCBkZXNjcmlwdGlvbjogJ0hhc2hlZCBwYXNzd29yZCcgfSxcbiAgY3JlYXRlZF9hdDogeyB0eXBlOiAnZGF0ZScsIHJlcXVpcmVkOiBmYWxzZSwgZGVzY3JpcHRpb246ICdSZWNvcmQgY3JlYXRpb24gdGltZXN0YW1wIChhdXRvLWdlbmVyYXRlZCknIH0sXG4gIHVwZGF0ZWRfYXQ6IHsgdHlwZTogJ2RhdGUnLCByZXF1aXJlZDogZmFsc2UsIGRlc2NyaXB0aW9uOiAnUmVjb3JkIHVwZGF0ZSB0aW1lc3RhbXAgKGF1dG8tZ2VuZXJhdGVkKScgfSxcbn07XG5cbi8qKlxuICogU2NoZW1hIG1hcHBpbmcgZG9jdW1lbnRhdGlvbiBmb3IgdGVhY2hlcnNcbiAqIFRoaXMgZGVzY3JpYmVzIGhvdyBFeGNlbC9DU1YgY29sdW1ucyBtYXAgdG8gRHluYW1vREIgYXR0cmlidXRlc1xuICovXG5leHBvcnQgY29uc3QgVEVBQ0hFUl9TQ0hFTUFfTUFQUElORyA9IHtcbiAgdGVhY2hlcl9pZDogeyB0eXBlOiAnc3RyaW5nJywgcmVxdWlyZWQ6IHRydWUsIGRlc2NyaXB0aW9uOiAnVW5pcXVlIHRlYWNoZXIgaWRlbnRpZmllcicgfSxcbiAgbmFtZTogeyB0eXBlOiAnc3RyaW5nJywgcmVxdWlyZWQ6IGZhbHNlLCBkZXNjcmlwdGlvbjogJ1RlYWNoZXIgbmFtZScgfSxcbiAgcGFzc3dvcmQ6IHsgdHlwZTogJ3N0cmluZycsIHJlcXVpcmVkOiBmYWxzZSwgZGVzY3JpcHRpb246ICdIYXNoZWQgcGFzc3dvcmQnIH0sXG4gIHJlc3BvbnNpYmxlX2NsYXNzOiB7IHR5cGU6ICdhcnJheScsIHJlcXVpcmVkOiBmYWxzZSwgZGVzY3JpcHRpb246ICdBcnJheSBvZiBjbGFzc2VzIChKU09OIGZvcm1hdCBpbiBFeGNlbC9DU1YpJyB9LFxuICBsYXN0X2xvZ2luOiB7IHR5cGU6ICdkYXRlJywgcmVxdWlyZWQ6IGZhbHNlLCBkZXNjcmlwdGlvbjogJ0xhc3QgbG9naW4gdGltZXN0YW1wJyB9LFxuICBpc19hZG1pbjogeyB0eXBlOiAnYm9vbGVhbicsIHJlcXVpcmVkOiBmYWxzZSwgZGVzY3JpcHRpb246ICdBZG1pbiBmbGFnICh0cnVlL2ZhbHNlLzEvMCknIH0sXG4gIGNyZWF0ZWRfYXQ6IHsgdHlwZTogJ2RhdGUnLCByZXF1aXJlZDogZmFsc2UsIGRlc2NyaXB0aW9uOiAnUmVjb3JkIGNyZWF0aW9uIHRpbWVzdGFtcCAoYXV0by1nZW5lcmF0ZWQpJyB9LFxuICB1cGRhdGVkX2F0OiB7IHR5cGU6ICdkYXRlJywgcmVxdWlyZWQ6IGZhbHNlLCBkZXNjcmlwdGlvbjogJ1JlY29yZCB1cGRhdGUgdGltZXN0YW1wIChhdXRvLWdlbmVyYXRlZCknIH0sXG59O1xuXG4vKipcbiAqIFNjaGVtYSBtYXBwaW5nIGRvY3VtZW50YXRpb24gZm9yIGdhbWVzXG4gKiBUaGlzIGRlc2NyaWJlcyBob3cgRXhjZWwvQ1NWIGNvbHVtbnMgbWFwIHRvIER5bmFtb0RCIGF0dHJpYnV0ZXNcbiAqL1xuZXhwb3J0IGNvbnN0IEdBTUVfU0NIRU1BX01BUFBJTkcgPSB7XG4gIGdhbWVfaWQ6IHsgdHlwZTogJ3N0cmluZycsIHJlcXVpcmVkOiB0cnVlLCBkZXNjcmlwdGlvbjogJ1VuaXF1ZSBnYW1lIGlkZW50aWZpZXInIH0sXG4gIGdhbWVfbmFtZTogeyB0eXBlOiAnc3RyaW5nJywgcmVxdWlyZWQ6IGZhbHNlLCBkZXNjcmlwdGlvbjogJ0Rpc3BsYXkgbmFtZSBvZiB0aGUgZ2FtZScgfSxcbiAgc3R1ZGVudF9pZDogeyB0eXBlOiAnc3RyaW5nJywgcmVxdWlyZWQ6IGZhbHNlLCBkZXNjcmlwdGlvbjogJ0lEIG9mIHN0dWRlbnQgd2hvIGNyZWF0ZWQgdGhlIGdhbWUnIH0sXG4gIHN1YmplY3Q6IHsgdHlwZTogJ3N0cmluZycsIHJlcXVpcmVkOiBmYWxzZSwgZGVzY3JpcHRpb246ICdTdWJqZWN0IGNhdGVnb3J5JyB9LFxuICBkaWZmaWN1bHR5OiB7IHR5cGU6ICdzdHJpbmcnLCByZXF1aXJlZDogZmFsc2UsIGRlc2NyaXB0aW9uOiAnRGlmZmljdWx0eSBsZXZlbCAoQmVnaW5uZXIvSW50ZXJtZWRpYXRlL0FkdmFuY2VkKScgfSxcbiAgdGVhY2hlcl9pZDogeyB0eXBlOiAnc3RyaW5nJywgcmVxdWlyZWQ6IGZhbHNlLCBkZXNjcmlwdGlvbjogJ0Fzc29jaWF0ZWQgdGVhY2hlciBJRCcgfSxcbiAgbGFzdF91cGRhdGU6IHsgdHlwZTogJ2RhdGUnLCByZXF1aXJlZDogZmFsc2UsIGRlc2NyaXB0aW9uOiAnTGFzdCB1cGRhdGUgdGltZXN0YW1wJyB9LFxuICBzY3JhdGNoX2lkOiB7IHR5cGU6ICdzdHJpbmcnLCByZXF1aXJlZDogZmFsc2UsIGRlc2NyaXB0aW9uOiAnU2NyYXRjaCBwcm9qZWN0IElEJyB9LFxuICBzY3JhdGNoX2FwaTogeyB0eXBlOiAnc3RyaW5nJywgcmVxdWlyZWQ6IGZhbHNlLCBkZXNjcmlwdGlvbjogJ1NjcmF0Y2ggcHJvamVjdCBVUkwnIH0sXG4gIGFjY3VtdWxhdGVkX2NsaWNrOiB7IHR5cGU6ICdudW1iZXInLCByZXF1aXJlZDogZmFsc2UsIGRlc2NyaXB0aW9uOiAnVG90YWwgY2xpY2sgY291bnQgKHByZXNlcnZlZCBvbiB1cGRhdGUpJyB9LFxuICBjcmVhdGVkX2F0OiB7IHR5cGU6ICdkYXRlJywgcmVxdWlyZWQ6IGZhbHNlLCBkZXNjcmlwdGlvbjogJ1JlY29yZCBjcmVhdGlvbiB0aW1lc3RhbXAgKGF1dG8tZ2VuZXJhdGVkKScgfSxcbiAgdXBkYXRlZF9hdDogeyB0eXBlOiAnZGF0ZScsIHJlcXVpcmVkOiBmYWxzZSwgZGVzY3JpcHRpb246ICdSZWNvcmQgdXBkYXRlIHRpbWVzdGFtcCAoYXV0by1nZW5lcmF0ZWQpJyB9LFxufTtcbiJdfQ==