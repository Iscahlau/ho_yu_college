/**
 * Application Constants
 * Centralized configuration values used throughout the application
 */

// Subject options for game filtering
export const SUBJECTS = [
  'Chinese Language',
  'English Language',
  'Mathematics',
  'Humanities and Science',
] as const;

// Difficulty levels for game filtering
export const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;

// File upload limits
export const FILE_UPLOAD_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10 MB in bytes
  MAX_ROWS: 4000, // Maximum 4000 records (students + teachers) per file
  SUPPORTED_FORMATS: ['.xlsx', '.xls', '.csv'],
};

// Timer configuration
export const TIMER_CONFIG = {
  WARNING_DURATION: 60 * 60 * 1000, // 1 hour in milliseconds
  CHECK_INTERVAL: 60 * 1000, // Check every minute
};

// Marks system
export const MARKS_BY_DIFFICULTY = {
  Beginner: 10,
  Intermediate: 20,
  Advanced: 30,
};

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  GAME: '/game/:gameId',
  ADMIN: '/admin',
};

// Scratch API configuration
export const SCRATCH_CONFIG = {
  API_BASE: 'https://api.scratch.mit.edu/projects',
  EMBED_BASE: 'https://scratch.mit.edu/projects',
  THUMBNAIL_SIZE: { width: 135, height: 102 },
};

// User roles
export const USER_ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
