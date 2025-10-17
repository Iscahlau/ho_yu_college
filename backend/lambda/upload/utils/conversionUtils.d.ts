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
export declare function toString(value: any, defaultValue?: string): string;
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
export declare function toNumber(value: any, defaultValue?: number): number;
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
export declare function toBoolean(value: any, defaultValue?: boolean): boolean;
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
export declare function toStringArray(value: any, defaultValue?: string[]): string[];
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
export declare function toDateString(value: any, useCurrentIfInvalid?: boolean): string;
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
export declare function mapRowToObject(headers: any[], row: any[]): Record<string, any>;
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
export declare function validateRequiredField(value: any, fieldName: string): {
    valid: boolean;
    error?: string;
};
/**
 * Schema mapping documentation for students
 * This describes how Excel/CSV columns map to DynamoDB attributes
 */
export declare const STUDENT_SCHEMA_MAPPING: {
    student_id: {
        type: string;
        required: boolean;
        description: string;
    };
    name_1: {
        type: string;
        required: boolean;
        description: string;
    };
    name_2: {
        type: string;
        required: boolean;
        description: string;
    };
    marks: {
        type: string;
        required: boolean;
        description: string;
    };
    class: {
        type: string;
        required: boolean;
        description: string;
    };
    class_no: {
        type: string;
        required: boolean;
        description: string;
    };
    last_login: {
        type: string;
        required: boolean;
        description: string;
    };
    last_update: {
        type: string;
        required: boolean;
        description: string;
    };
    teacher_id: {
        type: string;
        required: boolean;
        description: string;
    };
    password: {
        type: string;
        required: boolean;
        description: string;
    };
    created_at: {
        type: string;
        required: boolean;
        description: string;
    };
    updated_at: {
        type: string;
        required: boolean;
        description: string;
    };
};
/**
 * Schema mapping documentation for teachers
 * This describes how Excel/CSV columns map to DynamoDB attributes
 */
export declare const TEACHER_SCHEMA_MAPPING: {
    teacher_id: {
        type: string;
        required: boolean;
        description: string;
    };
    name: {
        type: string;
        required: boolean;
        description: string;
    };
    password: {
        type: string;
        required: boolean;
        description: string;
    };
    responsible_class: {
        type: string;
        required: boolean;
        description: string;
    };
    last_login: {
        type: string;
        required: boolean;
        description: string;
    };
    is_admin: {
        type: string;
        required: boolean;
        description: string;
    };
    created_at: {
        type: string;
        required: boolean;
        description: string;
    };
    updated_at: {
        type: string;
        required: boolean;
        description: string;
    };
};
/**
 * Schema mapping documentation for games
 * This describes how Excel/CSV columns map to DynamoDB attributes
 */
export declare const GAME_SCHEMA_MAPPING: {
    game_id: {
        type: string;
        required: boolean;
        description: string;
    };
    game_name: {
        type: string;
        required: boolean;
        description: string;
    };
    student_id: {
        type: string;
        required: boolean;
        description: string;
    };
    subject: {
        type: string;
        required: boolean;
        description: string;
    };
    difficulty: {
        type: string;
        required: boolean;
        description: string;
    };
    teacher_id: {
        type: string;
        required: boolean;
        description: string;
    };
    last_update: {
        type: string;
        required: boolean;
        description: string;
    };
    scratch_id: {
        type: string;
        required: boolean;
        description: string;
    };
    scratch_api: {
        type: string;
        required: boolean;
        description: string;
    };
    accumulated_click: {
        type: string;
        required: boolean;
        description: string;
    };
    created_at: {
        type: string;
        required: boolean;
        description: string;
    };
    updated_at: {
        type: string;
        required: boolean;
        description: string;
    };
};
