/**
 * Shared Constants
 * Application-wide constants used across Lambda functions
 */

// ===== BATCH PROCESSING =====

/**
 * DynamoDB batch operation size limit
 */
export const BATCH_SIZE = 25;

/**
 * Maximum records allowed in a single upload
 */
export const MAX_RECORDS = 4000;

// ===== HTTP HEADERS =====

/**
 * Standard CORS headers for API responses
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
} as const;

/**
 * Standard JSON response headers
 */
export const JSON_RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  ...CORS_HEADERS,
} as const;

/**
 * Excel file response headers
 */
export const EXCEL_RESPONSE_HEADERS = {
  'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ...CORS_HEADERS,
} as const;

// ===== EXPECTED HEADERS =====

/**
 * Expected headers for games upload
 */
export const GAMES_EXPECTED_HEADERS = [
  'game_id',
  'game_name',
  'student_id',
  'subject',
  'difficulty',
  'teacher_id',
  'scratch_id',
  'scratch_api',
  'accumulated_click',
  'description',
] as const;

/**
 * Required headers for games upload
 */
export const GAMES_REQUIRED_HEADERS = ['game_id'] as const;

/**
 * Expected headers for students upload
 */
export const STUDENTS_EXPECTED_HEADERS = [
  'student_id',
  'name_1',
  'name_2',
  'marks',
  'class',
  'class_no',
  'last_login',
  'last_update',
  'teacher_id',
  'password',
] as const;

/**
 * Required headers for students upload
 */
export const STUDENTS_REQUIRED_HEADERS = ['student_id'] as const;

/**
 * Expected headers for teachers upload
 */
export const TEACHERS_EXPECTED_HEADERS = [
  'teacher_id',
  'name',
  'email',
  'password',
  'classes',
  'is_admin',
  'last_login',
  'last_update',
] as const;

/**
 * Required headers for teachers upload
 */
export const TEACHERS_REQUIRED_HEADERS = ['teacher_id'] as const;

// ===== MARKS CONFIGURATION =====

/**
 * Mark values based on game difficulty level
 */
export const MARKS_BY_DIFFICULTY: Record<string, number> = {
  Beginner: 5,
  Intermediate: 10,
  Advanced: 15,
} as const;

// ===== EXCEL COLUMN WIDTHS =====

/**
 * Column widths for games Excel export
 */
export const GAMES_COLUMN_WIDTHS = [
  { wch: 12 }, // game_id
  { wch: 30 }, // game_name
  { wch: 12 }, // student_id
  { wch: 25 }, // subject
  { wch: 15 }, // difficulty
  { wch: 12 }, // teacher_id
  { wch: 20 }, // last_update
  { wch: 15 }, // scratch_id
  { wch: 40 }, // scratch_api
  { wch: 15 }, // accumulated_click
  { wch: 50 }, // description
] as const;

/**
 * Column widths for students Excel export
 */
export const STUDENTS_COLUMN_WIDTHS = [
  { wch: 12 }, // student_id
  { wch: 20 }, // name_1
  { wch: 20 }, // name_2
  { wch: 8 },  // marks
  { wch: 8 },  // class
  { wch: 10 }, // class_no
  { wch: 20 }, // last_login
  { wch: 20 }, // last_update
  { wch: 12 }, // teacher_id
  { wch: 15 }, // password
] as const;

/**
 * Column widths for teachers Excel export
 */
export const TEACHERS_COLUMN_WIDTHS = [
  { wch: 12 }, // teacher_id
  { wch: 25 }, // name
  { wch: 30 }, // email
  { wch: 15 }, // password
  { wch: 30 }, // classes
  { wch: 10 }, // is_admin
  { wch: 20 }, // last_login
  { wch: 20 }, // last_update
] as const;

// ===== HTTP STATUS CODES =====

/**
 * HTTP status codes for common scenarios
 */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;
