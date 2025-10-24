/**
 * Unit Tests for Data Conversion Utilities
 * Tests all conversion functions that transform Excel/CSV data to DynamoDB format
 */

import {
  toString,
  toNumber,
  toBoolean,
  toStringArray,
  toDateString,
  mapRowToObject,
  validateRequiredField,
  STUDENT_SCHEMA_MAPPING,
  TEACHER_SCHEMA_MAPPING,
  GAME_SCHEMA_MAPPING,
} from '../../../lambda/upload/utils/conversionUtils';

describe('Data Conversion Utilities', () => {
  describe('toString', () => {
    test('should convert string to string', () => {
      expect(toString('hello')).toBe('hello');
    });

    test('should convert number to string', () => {
      expect(toString(123)).toBe('123');
      expect(toString(123.45)).toBe('123.45');
    });

    test('should convert boolean to string', () => {
      expect(toString(true)).toBe('true');
      expect(toString(false)).toBe('false');
    });

    test('should handle null and undefined with default value', () => {
      expect(toString(null)).toBe('');
      expect(toString(undefined)).toBe('');
      expect(toString(null, 'default')).toBe('default');
      expect(toString(undefined, 'default')).toBe('default');
    });

    test('should convert empty string to empty string', () => {
      expect(toString('')).toBe('');
    });
  });

  describe('toNumber', () => {
    test('should convert number to number', () => {
      expect(toNumber(123)).toBe(123);
      expect(toNumber(123.45)).toBe(123.45);
      expect(toNumber(-50)).toBe(-50);
      expect(toNumber(0)).toBe(0);
    });

    test('should convert numeric string to number', () => {
      expect(toNumber('123')).toBe(123);
      expect(toNumber('123.45')).toBe(123.45);
      expect(toNumber('-50')).toBe(-50);
    });

    test('should handle null and undefined with default value', () => {
      expect(toNumber(null)).toBe(0);
      expect(toNumber(undefined)).toBe(0);
      expect(toNumber(null, 100)).toBe(100);
      expect(toNumber(undefined, 100)).toBe(100);
    });

    test('should handle empty string with default value', () => {
      expect(toNumber('')).toBe(0);
      expect(toNumber('', 50)).toBe(50);
    });

    test('should handle invalid number string with default value', () => {
      expect(toNumber('invalid')).toBe(0);
      expect(toNumber('abc123', 99)).toBe(99);
      expect(toNumber('NaN')).toBe(0);
    });
  });

  describe('toBoolean', () => {
    test('should convert boolean to boolean', () => {
      expect(toBoolean(true)).toBe(true);
      expect(toBoolean(false)).toBe(false);
    });

    test('should convert truthy strings to true', () => {
      expect(toBoolean('true')).toBe(true);
      expect(toBoolean('TRUE')).toBe(true);
      expect(toBoolean('True')).toBe(true);
      expect(toBoolean('1')).toBe(true);
      expect(toBoolean('yes')).toBe(true);
      expect(toBoolean('YES')).toBe(true);
    });

    test('should convert falsy strings to false', () => {
      expect(toBoolean('false')).toBe(false);
      expect(toBoolean('FALSE')).toBe(false);
      expect(toBoolean('0')).toBe(false);
      expect(toBoolean('no')).toBe(false);
      expect(toBoolean('anything')).toBe(false);
    });

    test('should convert numbers to boolean', () => {
      expect(toBoolean(1)).toBe(true);
      expect(toBoolean(100)).toBe(true);
      expect(toBoolean(-1)).toBe(true);
      expect(toBoolean(0)).toBe(false);
    });

    test('should handle null and undefined with default value', () => {
      expect(toBoolean(null)).toBe(false);
      expect(toBoolean(undefined)).toBe(false);
      expect(toBoolean(null, true)).toBe(true);
      expect(toBoolean(undefined, true)).toBe(true);
    });

    test('should handle whitespace in strings', () => {
      expect(toBoolean(' true ')).toBe(true);
      expect(toBoolean(' 1 ')).toBe(true);
      expect(toBoolean(' false ')).toBe(false);
    });
  });

  describe('toStringArray', () => {
    test('should parse JSON array string', () => {
      expect(toStringArray('["1A", "2B"]')).toEqual(['1A', '2B']);
      expect(toStringArray('["Math", "English", "Science"]')).toEqual(['Math', 'English', 'Science']);
    });

    test('should convert existing array to string array', () => {
      expect(toStringArray(['1A', '2B'])).toEqual(['1A', '2B']);
      expect(toStringArray([1, 2, 3])).toEqual(['1', '2', '3']);
      expect(toStringArray([true, false])).toEqual(['true', 'false']);
    });

    test('should convert single value to array', () => {
      expect(toStringArray('1A')).toEqual(['1A']);
      expect(toStringArray('Math')).toEqual(['Math']);
    });

    test('should handle null and undefined with default value', () => {
      expect(toStringArray(null)).toEqual([]);
      expect(toStringArray(undefined)).toEqual([]);
      expect(toStringArray('', ['default'])).toEqual(['default']);
    });

    test('should handle invalid JSON as single value', () => {
      expect(toStringArray('not valid json')).toEqual(['not valid json']);
      expect(toStringArray('[invalid')).toEqual(['[invalid']);
    });

    test('should handle JSON non-array as single value', () => {
      expect(toStringArray('{"key": "value"}')).toEqual(['[object Object]']);
      expect(toStringArray('"string"')).toEqual(['string']);
    });

    test('should handle empty array', () => {
      expect(toStringArray('[]')).toEqual([]);
      expect(toStringArray([])).toEqual([]);
    });
  });

  describe('toDateString', () => {
    test('should convert valid ISO date string', () => {
      const isoDate = '2024-01-15T10:30:00Z';
      const result = toDateString(isoDate);
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    test('should convert valid date formats', () => {
      const date1 = toDateString('2024-01-15');
      expect(date1).toContain('2024-01-15');
      
      const date2 = toDateString('2024/01/15');
      expect(date2).toContain('2024-01-15');
    });

    test('should use current timestamp for null/undefined when flag is true', () => {
      const before = new Date().toISOString();
      const result1 = toDateString(null);
      const result2 = toDateString(undefined);
      const after = new Date().toISOString();
      
      expect(result1 >= before && result1 <= after).toBe(true);
      expect(result2 >= before && result2 <= after).toBe(true);
    });

    test('should return empty string for null/undefined when flag is false', () => {
      expect(toDateString(null, false)).toBe('');
      expect(toDateString(undefined, false)).toBe('');
    });

    test('should use current timestamp for invalid date when flag is true', () => {
      const before = new Date().toISOString();
      const result = toDateString('invalid date');
      const after = new Date().toISOString();
      
      expect(result >= before && result <= after).toBe(true);
    });

    test('should return original value for invalid date when flag is false', () => {
      expect(toDateString('invalid date', false)).toBe('invalid date');
    });
  });

  describe('mapRowToObject', () => {
    test('should map headers to row values', () => {
      const headers = ['student_id', 'name', 'marks'];
      const row = ['STU001', 'John', 85];
      const result = mapRowToObject(headers, row);
      
      expect(result).toEqual({
        student_id: 'STU001',
        name: 'John',
        marks: 85,
      });
    });

    test('should handle more headers than row values', () => {
      const headers = ['student_id', 'name', 'marks', 'class'];
      const row = ['STU001', 'John', 85];
      const result = mapRowToObject(headers, row);
      
      expect(result).toEqual({
        student_id: 'STU001',
        name: 'John',
        marks: 85,
        class: undefined,
      });
    });

    test('should handle more row values than headers', () => {
      const headers = ['student_id', 'name'];
      const row = ['STU001', 'John', 85, '1A'];
      const result = mapRowToObject(headers, row);
      
      expect(result).toEqual({
        student_id: 'STU001',
        name: 'John',
      });
    });

    test('should handle empty headers', () => {
      const headers = ['student_id', '', 'marks'];
      const row = ['STU001', 'ignored', 85];
      const result = mapRowToObject(headers, row);
      
      expect(result).toEqual({
        student_id: 'STU001',
        marks: 85,
      });
    });

    test('should handle null/undefined values in row', () => {
      const headers = ['student_id', 'name', 'marks'];
      const row = ['STU001', null, undefined];
      const result = mapRowToObject(headers, row);
      
      expect(result).toEqual({
        student_id: 'STU001',
        name: null,
        marks: undefined,
      });
    });
  });

  describe('validateRequiredField', () => {
    test('should validate non-empty values', () => {
      expect(validateRequiredField('STU001', 'student_id')).toEqual({ valid: true });
      expect(validateRequiredField('John', 'name')).toEqual({ valid: true });
      expect(validateRequiredField(123, 'id')).toEqual({ valid: true });
      expect(validateRequiredField(0, 'value')).toEqual({ valid: true });
      expect(validateRequiredField(false, 'flag')).toEqual({ valid: true });
    });

    test('should reject null values', () => {
      expect(validateRequiredField(null, 'student_id')).toEqual({
        valid: false,
        error: 'Missing student_id',
      });
    });

    test('should reject undefined values', () => {
      expect(validateRequiredField(undefined, 'teacher_id')).toEqual({
        valid: false,
        error: 'Missing teacher_id',
      });
    });

    test('should reject empty string', () => {
      expect(validateRequiredField('', 'game_id')).toEqual({
        valid: false,
        error: 'Missing game_id',
      });
    });

    test('should use correct field name in error message', () => {
      expect(validateRequiredField(null, 'custom_field')).toEqual({
        valid: false,
        error: 'Missing custom_field',
      });
    });
  });

  describe('Schema Mappings', () => {
    test('STUDENT_SCHEMA_MAPPING should have all required fields', () => {
      expect(STUDENT_SCHEMA_MAPPING.student_id).toBeDefined();
      expect(STUDENT_SCHEMA_MAPPING.student_id.required).toBe(true);
      expect(STUDENT_SCHEMA_MAPPING.student_id.type).toBe('string');
      
      expect(STUDENT_SCHEMA_MAPPING.name_1).toBeDefined();
      expect(STUDENT_SCHEMA_MAPPING.marks).toBeDefined();
      expect(STUDENT_SCHEMA_MAPPING.marks.type).toBe('number');
      
      expect(STUDENT_SCHEMA_MAPPING.created_at).toBeDefined();
      expect(STUDENT_SCHEMA_MAPPING.updated_at).toBeDefined();
    });

    test('TEACHER_SCHEMA_MAPPING should have all required fields', () => {
      expect(TEACHER_SCHEMA_MAPPING.teacher_id).toBeDefined();
      expect(TEACHER_SCHEMA_MAPPING.teacher_id.required).toBe(true);
      expect(TEACHER_SCHEMA_MAPPING.teacher_id.type).toBe('string');
      
      expect(TEACHER_SCHEMA_MAPPING.responsible_class).toBeDefined();
      expect(TEACHER_SCHEMA_MAPPING.responsible_class.type).toBe('array');
      
      expect(TEACHER_SCHEMA_MAPPING.is_admin).toBeDefined();
      expect(TEACHER_SCHEMA_MAPPING.is_admin.type).toBe('boolean');
    });

    test('GAME_SCHEMA_MAPPING should have all required fields', () => {
      expect(GAME_SCHEMA_MAPPING.game_id).toBeDefined();
      expect(GAME_SCHEMA_MAPPING.game_id.required).toBe(true);
      expect(GAME_SCHEMA_MAPPING.game_id.type).toBe('string');
      
      expect(GAME_SCHEMA_MAPPING.accumulated_click).toBeDefined();
      expect(GAME_SCHEMA_MAPPING.accumulated_click.type).toBe('number');
      
      expect(GAME_SCHEMA_MAPPING.scratch_api).toBeDefined();
      expect(GAME_SCHEMA_MAPPING.subject).toBeDefined();
      expect(GAME_SCHEMA_MAPPING.difficulty).toBeDefined();
    });

    test('All schema mappings should have descriptions', () => {
      Object.values(STUDENT_SCHEMA_MAPPING).forEach(field => {
        expect(field.description).toBeDefined();
        expect(typeof field.description).toBe('string');
        expect(field.description.length).toBeGreaterThan(0);
      });

      Object.values(TEACHER_SCHEMA_MAPPING).forEach(field => {
        expect(field.description).toBeDefined();
        expect(typeof field.description).toBe('string');
      });

      Object.values(GAME_SCHEMA_MAPPING).forEach(field => {
        expect(field.description).toBeDefined();
        expect(typeof field.description).toBe('string');
      });
    });
  });

  describe('Integration Tests - Real-world Scenarios', () => {
    test('should convert student row from Excel to DynamoDB format', () => {
      const headers = ['student_id', 'name_1', 'marks', 'class', 'teacher_id'];
      const row = ['STU001', 'John Chan', '150', '1A', 'TCH001'];
      const rawData = mapRowToObject(headers, row);
      
      // Convert to proper types
      const studentRecord = {
        student_id: toString(rawData.student_id),
        name_1: toString(rawData.name_1),
        marks: toNumber(rawData.marks),
        class: toString(rawData.class),
        teacher_id: toString(rawData.teacher_id),
      };
      
      expect(studentRecord).toEqual({
        student_id: 'STU001',
        name_1: 'John Chan',
        marks: 150,
        class: '1A',
        teacher_id: 'TCH001',
      });
    });

    test('should convert numeric password to string for students', () => {
      // Excel often reads numeric passwords as numbers (e.g., 123456)
      const headers = ['student_id', 'name_1', 'password', 'class_no'];
      const row = ['STU001', 'John', 123456, 1]; // password and class_no as numbers
      const rawData = mapRowToObject(headers, row);
      
      const studentRecord = {
        student_id: toString(rawData.student_id),
        name_1: toString(rawData.name_1),
        password: toString(rawData.password),
        class_no: toString(rawData.class_no),
      };
      
      expect(studentRecord).toEqual({
        student_id: 'STU001',
        name_1: 'John',
        password: '123456', // Should be converted to string
        class_no: '1', // Should be converted to string
      });
    });

    test('should convert numeric password with leading zeros to string', () => {
      // Excel may read "000123" as number 123
      const headers = ['student_id', 'password', 'class_no'];
      const row = ['STU001', 123, 1]; // Excel strips leading zeros
      const rawData = mapRowToObject(headers, row);
      
      const studentRecord = {
        student_id: toString(rawData.student_id),
        password: toString(rawData.password),
        class_no: toString(rawData.class_no),
      };
      
      expect(studentRecord.password).toBe('123');
      expect(studentRecord.class_no).toBe('1');
      expect(typeof studentRecord.password).toBe('string');
      expect(typeof studentRecord.class_no).toBe('string');
    });

    test('should convert numeric password to string for teachers', () => {
      // Excel often reads numeric passwords as numbers
      const headers = ['teacher_id', 'name', 'password'];
      const row = ['TCH001', 'Mr. Smith', 654321]; // password as number
      const rawData = mapRowToObject(headers, row);
      
      const teacherRecord = {
        teacher_id: toString(rawData.teacher_id),
        name: toString(rawData.name),
        password: toString(rawData.password),
      };
      
      expect(teacherRecord).toEqual({
        teacher_id: 'TCH001',
        name: 'Mr. Smith',
        password: '654321', // Should be converted to string
      });
    });

    test('should convert teacher row with JSON array from Excel to DynamoDB format', () => {
      const headers = ['teacher_id', 'name', 'responsible_class', 'is_admin'];
      const row = ['TCH001', 'Mr. Wong', '["1A", "2A"]', 'false'];
      const rawData = mapRowToObject(headers, row);
      
      // Convert to proper types
      const teacherRecord = {
        teacher_id: toString(rawData.teacher_id),
        name: toString(rawData.name),
        responsible_class: toStringArray(rawData.responsible_class),
        is_admin: toBoolean(rawData.is_admin),
      };
      
      expect(teacherRecord).toEqual({
        teacher_id: 'TCH001',
        name: 'Mr. Wong',
        responsible_class: ['1A', '2A'],
        is_admin: false,
      });
    });

    test('should convert game row from Excel to DynamoDB format', () => {
      const headers = ['game_id', 'game_name', 'student_id', 'difficulty', 'accumulated_click'];
      const row = ['1207260630', 'Character Match', 'STU001', 'Beginner', '15'];
      const rawData = mapRowToObject(headers, row);
      
      // Convert to proper types
      const gameRecord = {
        game_id: toString(rawData.game_id),
        game_name: toString(rawData.game_name),
        student_id: toString(rawData.student_id),
        difficulty: toString(rawData.difficulty),
        accumulated_click: toNumber(rawData.accumulated_click),
      };
      
      expect(gameRecord).toEqual({
        game_id: '1207260630',
        game_name: 'Character Match',
        student_id: 'STU001',
        difficulty: 'Beginner',
        accumulated_click: 15,
      });
    });

    test('should handle missing optional fields gracefully', () => {
      const headers = ['student_id', 'name_1', 'marks'];
      const row = ['STU001', null, ''];
      const rawData = mapRowToObject(headers, row);
      
      const studentRecord = {
        student_id: toString(rawData.student_id),
        name_1: toString(rawData.name_1),
        marks: toNumber(rawData.marks),
      };
      
      expect(studentRecord).toEqual({
        student_id: 'STU001',
        name_1: '',
        marks: 0,
      });
    });
  });
});
