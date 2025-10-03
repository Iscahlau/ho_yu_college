/**
 * Mock Teacher Data
 * 3 teacher records with different roles and responsibilities
 */

import * as crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export const mockTeachers = [
  {
    teacher_id: 'TCH001',
    password: hashPassword('teacher123'),
    responsible_class: ['1A', '2A'],
    last_login: '2024-01-15T08:00:00.000Z',
    is_admin: false,
  },
  {
    teacher_id: 'TCH002',
    password: hashPassword('teacher123'),
    responsible_class: ['1B'],
    last_login: '2024-01-16T08:30:00.000Z',
    is_admin: false,
  },
  {
    teacher_id: 'TCH003',
    password: hashPassword('admin123'),
    responsible_class: ['2B'],
    last_login: '2024-01-17T07:45:00.000Z',
    is_admin: true,
  },
];

// Export passwords for testing purposes
export const MOCK_TEACHER_PASSWORD = 'teacher123';
export const MOCK_TEACHER_PASSWORD_HASH = hashPassword('teacher123');
export const MOCK_ADMIN_PASSWORD = 'admin123';
export const MOCK_ADMIN_PASSWORD_HASH = hashPassword('admin123');
