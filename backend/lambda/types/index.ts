/**
 * Shared Type Definitions
 * Common interfaces used across all Lambda functions
 */

// ===== DATABASE RECORD TYPES =====

/**
 * Game record as stored in DynamoDB
 */
export interface GameRecord {
  game_id: string;
  game_name: string;
  student_id: string;
  subject: string;
  difficulty: string;
  teacher_id: string;
  last_update: string;
  scratch_api: string;
  accumulated_click: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Student record as stored in DynamoDB
 */
export interface StudentRecord {
  student_id: string;
  name_1: string;
  name_2: string;
  marks: number;
  class: string;
  class_no: string;
  last_login: string;
  last_update: string;
  password: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Teacher record as stored in DynamoDB
 */
export interface TeacherRecord {
  teacher_id: string;
  name: string;
  password: string;
  responsible_class: string[];
  last_login: string;
  is_admin: boolean;
}

// ===== REQUEST/RESPONSE TYPES =====

/**
 * Login request body
 */
export interface LoginRequest {
  id: string;
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  success: boolean;
  user?: Omit<StudentRecord | TeacherRecord, 'password'>;
  role?: 'student' | 'teacher' | 'admin';
  message?: string;
}

/**
 * Game click request body
 */
export interface ClickRequestBody {
  student_id?: string;
  role?: 'student' | 'teacher' | 'admin';
  time_spent?: number; // Time spent in seconds
}

/**
 * Upload request body
 */
export interface UploadRequest {
  file: string; // Base64 encoded file
}

/**
 * Upload results
 */
export interface UploadResults {
  processed: number;
  inserted: number;
  updated: number;
  errors: string[];
}

/**
 * Upload response
 */
export interface UploadResponse {
  success: boolean;
  message: string;
  processed?: number;
  inserted?: number;
  updated?: number;
  errors?: string[];
}

/**
 * List games response
 */
export interface ListGamesResponse {
  items: GameRecord[];
  count: number;
  lastKey?: string;
  hasMore: boolean;
}

/**
 * Error response
 */
export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  [key: string]: any;
}

/**
 * Success response
 */
export interface SuccessResponse {
  success: true;
  [key: string]: any;
}

// ===== UTILITY TYPES =====

/**
 * Parsed record from Excel with row index
 */
export interface ParsedRecord {
  index: number;
  record: Record<string, any>;
}

/**
 * Header validation result
 */
export interface HeaderValidationResult {
  valid: boolean;
  message?: string;
  expectedHeaders?: string[];
}

/**
 * User role type
 */
export type UserRole = 'student' | 'teacher' | 'admin';

/**
 * DynamoDB table names
 */
export interface TableNames {
  students: string;
  teachers: string;
  games: string;
}
