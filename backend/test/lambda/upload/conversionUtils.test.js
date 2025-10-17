"use strict";
/**
 * Unit Tests for Data Conversion Utilities
 * Tests all conversion functions that transform Excel/CSV data to DynamoDB format
 */
Object.defineProperty(exports, "__esModule", { value: true });
const conversionUtils_1 = require("../../../lambda/upload/utils/conversionUtils");
describe('Data Conversion Utilities', () => {
    describe('toString', () => {
        test('should convert string to string', () => {
            expect((0, conversionUtils_1.toString)('hello')).toBe('hello');
        });
        test('should convert number to string', () => {
            expect((0, conversionUtils_1.toString)(123)).toBe('123');
            expect((0, conversionUtils_1.toString)(123.45)).toBe('123.45');
        });
        test('should convert boolean to string', () => {
            expect((0, conversionUtils_1.toString)(true)).toBe('true');
            expect((0, conversionUtils_1.toString)(false)).toBe('false');
        });
        test('should handle null and undefined with default value', () => {
            expect((0, conversionUtils_1.toString)(null)).toBe('');
            expect((0, conversionUtils_1.toString)(undefined)).toBe('');
            expect((0, conversionUtils_1.toString)(null, 'default')).toBe('default');
            expect((0, conversionUtils_1.toString)(undefined, 'default')).toBe('default');
        });
        test('should convert empty string to empty string', () => {
            expect((0, conversionUtils_1.toString)('')).toBe('');
        });
    });
    describe('toNumber', () => {
        test('should convert number to number', () => {
            expect((0, conversionUtils_1.toNumber)(123)).toBe(123);
            expect((0, conversionUtils_1.toNumber)(123.45)).toBe(123.45);
            expect((0, conversionUtils_1.toNumber)(-50)).toBe(-50);
            expect((0, conversionUtils_1.toNumber)(0)).toBe(0);
        });
        test('should convert numeric string to number', () => {
            expect((0, conversionUtils_1.toNumber)('123')).toBe(123);
            expect((0, conversionUtils_1.toNumber)('123.45')).toBe(123.45);
            expect((0, conversionUtils_1.toNumber)('-50')).toBe(-50);
        });
        test('should handle null and undefined with default value', () => {
            expect((0, conversionUtils_1.toNumber)(null)).toBe(0);
            expect((0, conversionUtils_1.toNumber)(undefined)).toBe(0);
            expect((0, conversionUtils_1.toNumber)(null, 100)).toBe(100);
            expect((0, conversionUtils_1.toNumber)(undefined, 100)).toBe(100);
        });
        test('should handle empty string with default value', () => {
            expect((0, conversionUtils_1.toNumber)('')).toBe(0);
            expect((0, conversionUtils_1.toNumber)('', 50)).toBe(50);
        });
        test('should handle invalid number string with default value', () => {
            expect((0, conversionUtils_1.toNumber)('invalid')).toBe(0);
            expect((0, conversionUtils_1.toNumber)('abc123', 99)).toBe(99);
            expect((0, conversionUtils_1.toNumber)('NaN')).toBe(0);
        });
    });
    describe('toBoolean', () => {
        test('should convert boolean to boolean', () => {
            expect((0, conversionUtils_1.toBoolean)(true)).toBe(true);
            expect((0, conversionUtils_1.toBoolean)(false)).toBe(false);
        });
        test('should convert truthy strings to true', () => {
            expect((0, conversionUtils_1.toBoolean)('true')).toBe(true);
            expect((0, conversionUtils_1.toBoolean)('TRUE')).toBe(true);
            expect((0, conversionUtils_1.toBoolean)('True')).toBe(true);
            expect((0, conversionUtils_1.toBoolean)('1')).toBe(true);
            expect((0, conversionUtils_1.toBoolean)('yes')).toBe(true);
            expect((0, conversionUtils_1.toBoolean)('YES')).toBe(true);
        });
        test('should convert falsy strings to false', () => {
            expect((0, conversionUtils_1.toBoolean)('false')).toBe(false);
            expect((0, conversionUtils_1.toBoolean)('FALSE')).toBe(false);
            expect((0, conversionUtils_1.toBoolean)('0')).toBe(false);
            expect((0, conversionUtils_1.toBoolean)('no')).toBe(false);
            expect((0, conversionUtils_1.toBoolean)('anything')).toBe(false);
        });
        test('should convert numbers to boolean', () => {
            expect((0, conversionUtils_1.toBoolean)(1)).toBe(true);
            expect((0, conversionUtils_1.toBoolean)(100)).toBe(true);
            expect((0, conversionUtils_1.toBoolean)(-1)).toBe(true);
            expect((0, conversionUtils_1.toBoolean)(0)).toBe(false);
        });
        test('should handle null and undefined with default value', () => {
            expect((0, conversionUtils_1.toBoolean)(null)).toBe(false);
            expect((0, conversionUtils_1.toBoolean)(undefined)).toBe(false);
            expect((0, conversionUtils_1.toBoolean)(null, true)).toBe(true);
            expect((0, conversionUtils_1.toBoolean)(undefined, true)).toBe(true);
        });
        test('should handle whitespace in strings', () => {
            expect((0, conversionUtils_1.toBoolean)(' true ')).toBe(true);
            expect((0, conversionUtils_1.toBoolean)(' 1 ')).toBe(true);
            expect((0, conversionUtils_1.toBoolean)(' false ')).toBe(false);
        });
    });
    describe('toStringArray', () => {
        test('should parse JSON array string', () => {
            expect((0, conversionUtils_1.toStringArray)('["1A", "2B"]')).toEqual(['1A', '2B']);
            expect((0, conversionUtils_1.toStringArray)('["Math", "English", "Science"]')).toEqual(['Math', 'English', 'Science']);
        });
        test('should convert existing array to string array', () => {
            expect((0, conversionUtils_1.toStringArray)(['1A', '2B'])).toEqual(['1A', '2B']);
            expect((0, conversionUtils_1.toStringArray)([1, 2, 3])).toEqual(['1', '2', '3']);
            expect((0, conversionUtils_1.toStringArray)([true, false])).toEqual(['true', 'false']);
        });
        test('should convert single value to array', () => {
            expect((0, conversionUtils_1.toStringArray)('1A')).toEqual(['1A']);
            expect((0, conversionUtils_1.toStringArray)('Math')).toEqual(['Math']);
        });
        test('should handle null and undefined with default value', () => {
            expect((0, conversionUtils_1.toStringArray)(null)).toEqual([]);
            expect((0, conversionUtils_1.toStringArray)(undefined)).toEqual([]);
            expect((0, conversionUtils_1.toStringArray)('', ['default'])).toEqual(['default']);
        });
        test('should handle invalid JSON as single value', () => {
            expect((0, conversionUtils_1.toStringArray)('not valid json')).toEqual(['not valid json']);
            expect((0, conversionUtils_1.toStringArray)('[invalid')).toEqual(['[invalid']);
        });
        test('should handle JSON non-array as single value', () => {
            expect((0, conversionUtils_1.toStringArray)('{"key": "value"}')).toEqual(['[object Object]']);
            expect((0, conversionUtils_1.toStringArray)('"string"')).toEqual(['string']);
        });
        test('should handle empty array', () => {
            expect((0, conversionUtils_1.toStringArray)('[]')).toEqual([]);
            expect((0, conversionUtils_1.toStringArray)([])).toEqual([]);
        });
    });
    describe('toDateString', () => {
        test('should convert valid ISO date string', () => {
            const isoDate = '2024-01-15T10:30:00Z';
            const result = (0, conversionUtils_1.toDateString)(isoDate);
            expect(result).toBe('2024-01-15T10:30:00.000Z');
        });
        test('should convert valid date formats', () => {
            const date1 = (0, conversionUtils_1.toDateString)('2024-01-15');
            expect(date1).toContain('2024-01-15');
            const date2 = (0, conversionUtils_1.toDateString)('2024/01/15');
            expect(date2).toContain('2024-01-15');
        });
        test('should use current timestamp for null/undefined when flag is true', () => {
            const before = new Date().toISOString();
            const result1 = (0, conversionUtils_1.toDateString)(null);
            const result2 = (0, conversionUtils_1.toDateString)(undefined);
            const after = new Date().toISOString();
            expect(result1 >= before && result1 <= after).toBe(true);
            expect(result2 >= before && result2 <= after).toBe(true);
        });
        test('should return empty string for null/undefined when flag is false', () => {
            expect((0, conversionUtils_1.toDateString)(null, false)).toBe('');
            expect((0, conversionUtils_1.toDateString)(undefined, false)).toBe('');
        });
        test('should use current timestamp for invalid date when flag is true', () => {
            const before = new Date().toISOString();
            const result = (0, conversionUtils_1.toDateString)('invalid date');
            const after = new Date().toISOString();
            expect(result >= before && result <= after).toBe(true);
        });
        test('should return original value for invalid date when flag is false', () => {
            expect((0, conversionUtils_1.toDateString)('invalid date', false)).toBe('invalid date');
        });
    });
    describe('mapRowToObject', () => {
        test('should map headers to row values', () => {
            const headers = ['student_id', 'name', 'marks'];
            const row = ['STU001', 'John', 85];
            const result = (0, conversionUtils_1.mapRowToObject)(headers, row);
            expect(result).toEqual({
                student_id: 'STU001',
                name: 'John',
                marks: 85,
            });
        });
        test('should handle more headers than row values', () => {
            const headers = ['student_id', 'name', 'marks', 'class'];
            const row = ['STU001', 'John', 85];
            const result = (0, conversionUtils_1.mapRowToObject)(headers, row);
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
            const result = (0, conversionUtils_1.mapRowToObject)(headers, row);
            expect(result).toEqual({
                student_id: 'STU001',
                name: 'John',
            });
        });
        test('should handle empty headers', () => {
            const headers = ['student_id', '', 'marks'];
            const row = ['STU001', 'ignored', 85];
            const result = (0, conversionUtils_1.mapRowToObject)(headers, row);
            expect(result).toEqual({
                student_id: 'STU001',
                marks: 85,
            });
        });
        test('should handle null/undefined values in row', () => {
            const headers = ['student_id', 'name', 'marks'];
            const row = ['STU001', null, undefined];
            const result = (0, conversionUtils_1.mapRowToObject)(headers, row);
            expect(result).toEqual({
                student_id: 'STU001',
                name: null,
                marks: undefined,
            });
        });
    });
    describe('validateRequiredField', () => {
        test('should validate non-empty values', () => {
            expect((0, conversionUtils_1.validateRequiredField)('STU001', 'student_id')).toEqual({ valid: true });
            expect((0, conversionUtils_1.validateRequiredField)('John', 'name')).toEqual({ valid: true });
            expect((0, conversionUtils_1.validateRequiredField)(123, 'id')).toEqual({ valid: true });
            expect((0, conversionUtils_1.validateRequiredField)(0, 'value')).toEqual({ valid: true });
            expect((0, conversionUtils_1.validateRequiredField)(false, 'flag')).toEqual({ valid: true });
        });
        test('should reject null values', () => {
            expect((0, conversionUtils_1.validateRequiredField)(null, 'student_id')).toEqual({
                valid: false,
                error: 'Missing student_id',
            });
        });
        test('should reject undefined values', () => {
            expect((0, conversionUtils_1.validateRequiredField)(undefined, 'teacher_id')).toEqual({
                valid: false,
                error: 'Missing teacher_id',
            });
        });
        test('should reject empty string', () => {
            expect((0, conversionUtils_1.validateRequiredField)('', 'game_id')).toEqual({
                valid: false,
                error: 'Missing game_id',
            });
        });
        test('should use correct field name in error message', () => {
            expect((0, conversionUtils_1.validateRequiredField)(null, 'custom_field')).toEqual({
                valid: false,
                error: 'Missing custom_field',
            });
        });
    });
    describe('Schema Mappings', () => {
        test('STUDENT_SCHEMA_MAPPING should have all required fields', () => {
            expect(conversionUtils_1.STUDENT_SCHEMA_MAPPING.student_id).toBeDefined();
            expect(conversionUtils_1.STUDENT_SCHEMA_MAPPING.student_id.required).toBe(true);
            expect(conversionUtils_1.STUDENT_SCHEMA_MAPPING.student_id.type).toBe('string');
            expect(conversionUtils_1.STUDENT_SCHEMA_MAPPING.name_1).toBeDefined();
            expect(conversionUtils_1.STUDENT_SCHEMA_MAPPING.marks).toBeDefined();
            expect(conversionUtils_1.STUDENT_SCHEMA_MAPPING.marks.type).toBe('number');
            expect(conversionUtils_1.STUDENT_SCHEMA_MAPPING.created_at).toBeDefined();
            expect(conversionUtils_1.STUDENT_SCHEMA_MAPPING.updated_at).toBeDefined();
        });
        test('TEACHER_SCHEMA_MAPPING should have all required fields', () => {
            expect(conversionUtils_1.TEACHER_SCHEMA_MAPPING.teacher_id).toBeDefined();
            expect(conversionUtils_1.TEACHER_SCHEMA_MAPPING.teacher_id.required).toBe(true);
            expect(conversionUtils_1.TEACHER_SCHEMA_MAPPING.teacher_id.type).toBe('string');
            expect(conversionUtils_1.TEACHER_SCHEMA_MAPPING.responsible_class).toBeDefined();
            expect(conversionUtils_1.TEACHER_SCHEMA_MAPPING.responsible_class.type).toBe('array');
            expect(conversionUtils_1.TEACHER_SCHEMA_MAPPING.is_admin).toBeDefined();
            expect(conversionUtils_1.TEACHER_SCHEMA_MAPPING.is_admin.type).toBe('boolean');
        });
        test('GAME_SCHEMA_MAPPING should have all required fields', () => {
            expect(conversionUtils_1.GAME_SCHEMA_MAPPING.game_id).toBeDefined();
            expect(conversionUtils_1.GAME_SCHEMA_MAPPING.game_id.required).toBe(true);
            expect(conversionUtils_1.GAME_SCHEMA_MAPPING.game_id.type).toBe('string');
            expect(conversionUtils_1.GAME_SCHEMA_MAPPING.accumulated_click).toBeDefined();
            expect(conversionUtils_1.GAME_SCHEMA_MAPPING.accumulated_click.type).toBe('number');
            expect(conversionUtils_1.GAME_SCHEMA_MAPPING.scratch_api).toBeDefined();
            expect(conversionUtils_1.GAME_SCHEMA_MAPPING.subject).toBeDefined();
            expect(conversionUtils_1.GAME_SCHEMA_MAPPING.difficulty).toBeDefined();
        });
        test('All schema mappings should have descriptions', () => {
            Object.values(conversionUtils_1.STUDENT_SCHEMA_MAPPING).forEach(field => {
                expect(field.description).toBeDefined();
                expect(typeof field.description).toBe('string');
                expect(field.description.length).toBeGreaterThan(0);
            });
            Object.values(conversionUtils_1.TEACHER_SCHEMA_MAPPING).forEach(field => {
                expect(field.description).toBeDefined();
                expect(typeof field.description).toBe('string');
            });
            Object.values(conversionUtils_1.GAME_SCHEMA_MAPPING).forEach(field => {
                expect(field.description).toBeDefined();
                expect(typeof field.description).toBe('string');
            });
        });
    });
    describe('Integration Tests - Real-world Scenarios', () => {
        test('should convert student row from Excel to DynamoDB format', () => {
            const headers = ['student_id', 'name_1', 'marks', 'class', 'teacher_id'];
            const row = ['STU001', 'John Chan', '150', '1A', 'TCH001'];
            const rawData = (0, conversionUtils_1.mapRowToObject)(headers, row);
            // Convert to proper types
            const studentRecord = {
                student_id: (0, conversionUtils_1.toString)(rawData.student_id),
                name_1: (0, conversionUtils_1.toString)(rawData.name_1),
                marks: (0, conversionUtils_1.toNumber)(rawData.marks),
                class: (0, conversionUtils_1.toString)(rawData.class),
                teacher_id: (0, conversionUtils_1.toString)(rawData.teacher_id),
            };
            expect(studentRecord).toEqual({
                student_id: 'STU001',
                name_1: 'John Chan',
                marks: 150,
                class: '1A',
                teacher_id: 'TCH001',
            });
        });
        test('should convert teacher row with JSON array from Excel to DynamoDB format', () => {
            const headers = ['teacher_id', 'name', 'responsible_class', 'is_admin'];
            const row = ['TCH001', 'Mr. Wong', '["1A", "2A"]', 'false'];
            const rawData = (0, conversionUtils_1.mapRowToObject)(headers, row);
            // Convert to proper types
            const teacherRecord = {
                teacher_id: (0, conversionUtils_1.toString)(rawData.teacher_id),
                name: (0, conversionUtils_1.toString)(rawData.name),
                responsible_class: (0, conversionUtils_1.toStringArray)(rawData.responsible_class),
                is_admin: (0, conversionUtils_1.toBoolean)(rawData.is_admin),
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
            const rawData = (0, conversionUtils_1.mapRowToObject)(headers, row);
            // Convert to proper types
            const gameRecord = {
                game_id: (0, conversionUtils_1.toString)(rawData.game_id),
                game_name: (0, conversionUtils_1.toString)(rawData.game_name),
                student_id: (0, conversionUtils_1.toString)(rawData.student_id),
                difficulty: (0, conversionUtils_1.toString)(rawData.difficulty),
                accumulated_click: (0, conversionUtils_1.toNumber)(rawData.accumulated_click),
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
            const rawData = (0, conversionUtils_1.mapRowToObject)(headers, row);
            const studentRecord = {
                student_id: (0, conversionUtils_1.toString)(rawData.student_id),
                name_1: (0, conversionUtils_1.toString)(rawData.name_1),
                marks: (0, conversionUtils_1.toNumber)(rawData.marks),
            };
            expect(studentRecord).toEqual({
                student_id: 'STU001',
                name_1: '',
                marks: 0,
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udmVyc2lvblV0aWxzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb252ZXJzaW9uVXRpbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOztBQUVILGtGQVdzRDtBQUV0RCxRQUFRLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO0lBQ3pDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7WUFDM0MsTUFBTSxDQUFDLElBQUEsMEJBQVEsRUFBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMxQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7WUFDM0MsTUFBTSxDQUFDLElBQUEsMEJBQVEsRUFBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNsQyxNQUFNLENBQUMsSUFBQSwwQkFBUSxFQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtZQUM1QyxNQUFNLENBQUMsSUFBQSwwQkFBUSxFQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3BDLE1BQU0sQ0FBQyxJQUFBLDBCQUFRLEVBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMscURBQXFELEVBQUUsR0FBRyxFQUFFO1lBQy9ELE1BQU0sQ0FBQyxJQUFBLDBCQUFRLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFD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RUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDakMsTUFBTSxPQUFPLEdBQUcsSUFBQSxnQ0FBYyxFQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztZQUU3QyxNQUFNLGFBQWEsR0FBRztnQkFDcEIsVUFBVSxFQUFFLElBQUEsMEJBQVEsRUFBQyxPQUFPLENBQUMsVUFBVSxDQUFDO2dCQUN4QyxNQUFNLEVBQUUsSUFBQSwwQkFBUSxFQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7Z0JBQ2hDLEtBQUssRUFBRSxJQUFBLDBCQUFRLEVBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQzthQUMvQixDQUFDO1lBRUYsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLE9BQU8sQ0FBQztnQkFDNUIsVUFBVSxFQUFFLFFBQVE7Z0JBQ3BCLE1BQU0sRUFBRSxFQUFFO2dCQUNWLEtBQUssRUFBRSxDQUFDO2FBQ1QsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBVbml0IFRlc3RzIGZvciBEYXRhIENvbnZlcnNpb24gVXRpbGl0aWVzXG4gKiBUZXN0cyBhbGwgY29udmVyc2lvbiBmdW5jdGlvbnMgdGhhdCB0cmFuc2Zvcm0gRXhjZWwvQ1NWIGRhdGEgdG8gRHluYW1vREIgZm9ybWF0XG4gKi9cblxuaW1wb3J0IHtcbiAgdG9TdHJpbmcsXG4gIHRvTnVtYmVyLFxuICB0b0Jvb2xlYW4sXG4gIHRvU3RyaW5nQXJyYXksXG4gIHRvRGF0ZVN0cmluZyxcbiAgbWFwUm93VG9PYmplY3QsXG4gIHZhbGlkYXRlUmVxdWlyZWRGaWVsZCxcbiAgU1RVREVOVF9TQ0hFTUFfTUFQUElORyxcbiAgVEVBQ0hFUl9TQ0hFTUFfTUFQUElORyxcbiAgR0FNRV9TQ0hFTUFfTUFQUElORyxcbn0gZnJvbSAnLi4vLi4vLi4vbGFtYmRhL3VwbG9hZC91dGlscy9jb252ZXJzaW9uVXRpbHMnO1xuXG5kZXNjcmliZSgnRGF0YSBDb252ZXJzaW9uIFV0aWxpdGllcycsICgpID0+IHtcbiAgZGVzY3JpYmUoJ3RvU3RyaW5nJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBjb252ZXJ0IHN0cmluZyB0byBzdHJpbmcnLCAoKSA9PiB7XG4gICAgICBleHBlY3QodG9TdHJpbmcoJ2hlbGxvJykpLnRvQmUoJ2hlbGxvJyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgY29udmVydCBudW1iZXIgdG8gc3RyaW5nJywgKCkgPT4ge1xuICAgICAgZXhwZWN0KHRvU3RyaW5nKDEyMykpLnRvQmUoJzEyMycpO1xuICAgICAgZXhwZWN0KHRvU3RyaW5nKDEyMy40NSkpLnRvQmUoJzEyMy40NScpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGNvbnZlcnQgYm9vbGVhbiB0byBzdHJpbmcnLCAoKSA9PiB7XG4gICAgICBleHBlY3QodG9TdHJpbmcodHJ1ZSkpLnRvQmUoJ3RydWUnKTtcbiAgICAgIGV4cGVjdCh0b1N0cmluZyhmYWxzZSkpLnRvQmUoJ2ZhbHNlJyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgaGFuZGxlIG51bGwgYW5kIHVuZGVmaW5lZCB3aXRoIGRlZmF1bHQgdmFsdWUnLCAoKSA9PiB7XG4gICAgICBleHBlY3QodG9TdHJpbmcobnVsbCkpLnRvQmUoJycpO1xuICAgICAgZXhwZWN0KHRvU3RyaW5nKHVuZGVmaW5lZCkpLnRvQmUoJycpO1xuICAgICAgZXhwZWN0KHRvU3RyaW5nKG51bGwsICdkZWZhdWx0JykpLnRvQmUoJ2RlZmF1bHQnKTtcbiAgICAgIGV4cGVjdCh0b1N0cmluZyh1bmRlZmluZWQsICdkZWZhdWx0JykpLnRvQmUoJ2RlZmF1bHQnKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBjb252ZXJ0IGVtcHR5IHN0cmluZyB0byBlbXB0eSBzdHJpbmcnLCAoKSA9PiB7XG4gICAgICBleHBlY3QodG9TdHJpbmcoJycpKS50b0JlKCcnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ3RvTnVtYmVyJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBjb252ZXJ0IG51bWJlciB0byBudW1iZXInLCAoKSA9PiB7XG4gICAgICBleHBlY3QodG9OdW1iZXIoMTIzKSkudG9CZSgxMjMpO1xuICAgICAgZXhwZWN0KHRvTnVtYmVyKDEyMy40NSkpLnRvQmUoMTIzLjQ1KTtcbiAgICAgIGV4cGVjdCh0b051bWJlcigtNTApKS50b0JlKC01MCk7XG4gICAgICBleHBlY3QodG9OdW1iZXIoMCkpLnRvQmUoMCk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgY29udmVydCBudW1lcmljIHN0cmluZyB0byBudW1iZXInLCAoKSA9PiB7XG4gICAgICBleHBlY3QodG9OdW1iZXIoJzEyMycpKS50b0JlKDEyMyk7XG4gICAgICBleHBlY3QodG9OdW1iZXIoJzEyMy40NScpKS50b0JlKDEyMy40NSk7XG4gICAgICBleHBlY3QodG9OdW1iZXIoJy01MCcpKS50b0JlKC01MCk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgaGFuZGxlIG51bGwgYW5kIHVuZGVmaW5lZCB3aXRoIGRlZmF1bHQgdmFsdWUnLCAoKSA9PiB7XG4gICAgICBleHBlY3QodG9OdW1iZXIobnVsbCkpLnRvQmUoMCk7XG4gICAgICBleHBlY3QodG9OdW1iZXIodW5kZWZpbmVkKSkudG9CZSgwKTtcbiAgICAgIGV4cGVjdCh0b051bWJlcihudWxsLCAxMDApKS50b0JlKDEwMCk7XG4gICAgICBleHBlY3QodG9OdW1iZXIodW5kZWZpbmVkLCAxMDApKS50b0JlKDEwMCk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgaGFuZGxlIGVtcHR5IHN0cmluZyB3aXRoIGRlZmF1bHQgdmFsdWUnLCAoKSA9PiB7XG4gICAgICBleHBlY3QodG9OdW1iZXIoJycpKS50b0JlKDApO1xuICAgICAgZXhwZWN0KHRvTnVtYmVyKCcnLCA1MCkpLnRvQmUoNTApO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGhhbmRsZSBpbnZhbGlkIG51bWJlciBzdHJpbmcgd2l0aCBkZWZhdWx0IHZhbHVlJywgKCkgPT4ge1xuICAgICAgZXhwZWN0KHRvTnVtYmVyKCdpbnZhbGlkJykpLnRvQmUoMCk7XG4gICAgICBleHBlY3QodG9OdW1iZXIoJ2FiYzEyMycsIDk5KSkudG9CZSg5OSk7XG4gICAgICBleHBlY3QodG9OdW1iZXIoJ05hTicpKS50b0JlKDApO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgndG9Cb29sZWFuJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBjb252ZXJ0IGJvb2xlYW4gdG8gYm9vbGVhbicsICgpID0+IHtcbiAgICAgIGV4cGVjdCh0b0Jvb2xlYW4odHJ1ZSkpLnRvQmUodHJ1ZSk7XG4gICAgICBleHBlY3QodG9Cb29sZWFuKGZhbHNlKSkudG9CZShmYWxzZSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgY29udmVydCB0cnV0aHkgc3RyaW5ncyB0byB0cnVlJywgKCkgPT4ge1xuICAgICAgZXhwZWN0KHRvQm9vbGVhbigndHJ1ZScpKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KHRvQm9vbGVhbignVFJVRScpKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KHRvQm9vbGVhbignVHJ1ZScpKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KHRvQm9vbGVhbignMScpKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KHRvQm9vbGVhbigneWVzJykpLnRvQmUodHJ1ZSk7XG4gICAgICBleHBlY3QodG9Cb29sZWFuKCdZRVMnKSkudG9CZSh0cnVlKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBjb252ZXJ0IGZhbHN5IHN0cmluZ3MgdG8gZmFsc2UnLCAoKSA9PiB7XG4gICAgICBleHBlY3QodG9Cb29sZWFuKCdmYWxzZScpKS50b0JlKGZhbHNlKTtcbiAgICAgIGV4cGVjdCh0b0Jvb2xlYW4oJ0ZBTFNFJykpLnRvQmUoZmFsc2UpO1xuICAgICAgZXhwZWN0KHRvQm9vbGVhbignMCcpKS50b0JlKGZhbHNlKTtcbiAgICAgIGV4cGVjdCh0b0Jvb2xlYW4oJ25vJykpLnRvQmUoZmFsc2UpO1xuICAgICAgZXhwZWN0KHRvQm9vbGVhbignYW55dGhpbmcnKSkudG9CZShmYWxzZSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgY29udmVydCBudW1iZXJzIHRvIGJvb2xlYW4nLCAoKSA9PiB7XG4gICAgICBleHBlY3QodG9Cb29sZWFuKDEpKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KHRvQm9vbGVhbigxMDApKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KHRvQm9vbGVhbigtMSkpLnRvQmUodHJ1ZSk7XG4gICAgICBleHBlY3QodG9Cb29sZWFuKDApKS50b0JlKGZhbHNlKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBoYW5kbGUgbnVsbCBhbmQgdW5kZWZpbmVkIHdpdGggZGVmYXVsdCB2YWx1ZScsICgpID0+IHtcbiAgICAgIGV4cGVjdCh0b0Jvb2xlYW4obnVsbCkpLnRvQmUoZmFsc2UpO1xuICAgICAgZXhwZWN0KHRvQm9vbGVhbih1bmRlZmluZWQpKS50b0JlKGZhbHNlKTtcbiAgICAgIGV4cGVjdCh0b0Jvb2xlYW4obnVsbCwgdHJ1ZSkpLnRvQmUodHJ1ZSk7XG4gICAgICBleHBlY3QodG9Cb29sZWFuKHVuZGVmaW5lZCwgdHJ1ZSkpLnRvQmUodHJ1ZSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgaGFuZGxlIHdoaXRlc3BhY2UgaW4gc3RyaW5ncycsICgpID0+IHtcbiAgICAgIGV4cGVjdCh0b0Jvb2xlYW4oJyB0cnVlICcpKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KHRvQm9vbGVhbignIDEgJykpLnRvQmUodHJ1ZSk7XG4gICAgICBleHBlY3QodG9Cb29sZWFuKCcgZmFsc2UgJykpLnRvQmUoZmFsc2UpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgndG9TdHJpbmdBcnJheScsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgcGFyc2UgSlNPTiBhcnJheSBzdHJpbmcnLCAoKSA9PiB7XG4gICAgICBleHBlY3QodG9TdHJpbmdBcnJheSgnW1wiMUFcIiwgXCIyQlwiXScpKS50b0VxdWFsKFsnMUEnLCAnMkInXSk7XG4gICAgICBleHBlY3QodG9TdHJpbmdBcnJheSgnW1wiTWF0aFwiLCBcIkVuZ2xpc2hcIiwgXCJTY2llbmNlXCJdJykpLnRvRXF1YWwoWydNYXRoJywgJ0VuZ2xpc2gnLCAnU2NpZW5jZSddKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBjb252ZXJ0IGV4aXN0aW5nIGFycmF5IHRvIHN0cmluZyBhcnJheScsICgpID0+IHtcbiAgICAgIGV4cGVjdCh0b1N0cmluZ0FycmF5KFsnMUEnLCAnMkInXSkpLnRvRXF1YWwoWycxQScsICcyQiddKTtcbiAgICAgIGV4cGVjdCh0b1N0cmluZ0FycmF5KFsxLCAyLCAzXSkpLnRvRXF1YWwoWycxJywgJzInLCAnMyddKTtcbiAgICAgIGV4cGVjdCh0b1N0cmluZ0FycmF5KFt0cnVlLCBmYWxzZV0pKS50b0VxdWFsKFsndHJ1ZScsICdmYWxzZSddKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBjb252ZXJ0IHNpbmdsZSB2YWx1ZSB0byBhcnJheScsICgpID0+IHtcbiAgICAgIGV4cGVjdCh0b1N0cmluZ0FycmF5KCcxQScpKS50b0VxdWFsKFsnMUEnXSk7XG4gICAgICBleHBlY3QodG9TdHJpbmdBcnJheSgnTWF0aCcpKS50b0VxdWFsKFsnTWF0aCddKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBoYW5kbGUgbnVsbCBhbmQgdW5kZWZpbmVkIHdpdGggZGVmYXVsdCB2YWx1ZScsICgpID0+IHtcbiAgICAgIGV4cGVjdCh0b1N0cmluZ0FycmF5KG51bGwpKS50b0VxdWFsKFtdKTtcbiAgICAgIGV4cGVjdCh0b1N0cmluZ0FycmF5KHVuZGVmaW5lZCkpLnRvRXF1YWwoW10pO1xuICAgICAgZXhwZWN0KHRvU3RyaW5nQXJyYXkoJycsIFsnZGVmYXVsdCddKSkudG9FcXVhbChbJ2RlZmF1bHQnXSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgaGFuZGxlIGludmFsaWQgSlNPTiBhcyBzaW5nbGUgdmFsdWUnLCAoKSA9PiB7XG4gICAgICBleHBlY3QodG9TdHJpbmdBcnJheSgnbm90IHZhbGlkIGpzb24nKSkudG9FcXVhbChbJ25vdCB2YWxpZCBqc29uJ10pO1xuICAgICAgZXhwZWN0KHRvU3RyaW5nQXJyYXkoJ1tpbnZhbGlkJykpLnRvRXF1YWwoWydbaW52YWxpZCddKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBoYW5kbGUgSlNPTiBub24tYXJyYXkgYXMgc2luZ2xlIHZhbHVlJywgKCkgPT4ge1xuICAgICAgZXhwZWN0KHRvU3RyaW5nQXJyYXkoJ3tcImtleVwiOiBcInZhbHVlXCJ9JykpLnRvRXF1YWwoWydbb2JqZWN0IE9iamVjdF0nXSk7XG4gICAgICBleHBlY3QodG9TdHJpbmdBcnJheSgnXCJzdHJpbmdcIicpKS50b0VxdWFsKFsnc3RyaW5nJ10pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGhhbmRsZSBlbXB0eSBhcnJheScsICgpID0+IHtcbiAgICAgIGV4cGVjdCh0b1N0cmluZ0FycmF5KCdbXScpKS50b0VxdWFsKFtdKTtcbiAgICAgIGV4cGVjdCh0b1N0cmluZ0FycmF5KFtdKSkudG9FcXVhbChbXSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCd0b0RhdGVTdHJpbmcnLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGNvbnZlcnQgdmFsaWQgSVNPIGRhdGUgc3RyaW5nJywgKCkgPT4ge1xuICAgICAgY29uc3QgaXNvRGF0ZSA9ICcyMDI0LTAxLTE1VDEwOjMwOjAwWic7XG4gICAgICBjb25zdCByZXN1bHQgPSB0b0RhdGVTdHJpbmcoaXNvRGF0ZSk7XG4gICAgICBleHBlY3QocmVzdWx0KS50b0JlKCcyMDI0LTAxLTE1VDEwOjMwOjAwLjAwMFonKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBjb252ZXJ0IHZhbGlkIGRhdGUgZm9ybWF0cycsICgpID0+IHtcbiAgICAgIGNvbnN0IGRhdGUxID0gdG9EYXRlU3RyaW5nKCcyMDI0LTAxLTE1Jyk7XG4gICAgICBleHBlY3QoZGF0ZTEpLnRvQ29udGFpbignMjAyNC0wMS0xNScpO1xuICAgICAgXG4gICAgICBjb25zdCBkYXRlMiA9IHRvRGF0ZVN0cmluZygnMjAyNC8wMS8xNScpO1xuICAgICAgZXhwZWN0KGRhdGUyKS50b0NvbnRhaW4oJzIwMjQtMDEtMTUnKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCB1c2UgY3VycmVudCB0aW1lc3RhbXAgZm9yIG51bGwvdW5kZWZpbmVkIHdoZW4gZmxhZyBpcyB0cnVlJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmVmb3JlID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgY29uc3QgcmVzdWx0MSA9IHRvRGF0ZVN0cmluZyhudWxsKTtcbiAgICAgIGNvbnN0IHJlc3VsdDIgPSB0b0RhdGVTdHJpbmcodW5kZWZpbmVkKTtcbiAgICAgIGNvbnN0IGFmdGVyID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgXG4gICAgICBleHBlY3QocmVzdWx0MSA+PSBiZWZvcmUgJiYgcmVzdWx0MSA8PSBhZnRlcikudG9CZSh0cnVlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQyID49IGJlZm9yZSAmJiByZXN1bHQyIDw9IGFmdGVyKS50b0JlKHRydWUpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHJldHVybiBlbXB0eSBzdHJpbmcgZm9yIG51bGwvdW5kZWZpbmVkIHdoZW4gZmxhZyBpcyBmYWxzZScsICgpID0+IHtcbiAgICAgIGV4cGVjdCh0b0RhdGVTdHJpbmcobnVsbCwgZmFsc2UpKS50b0JlKCcnKTtcbiAgICAgIGV4cGVjdCh0b0RhdGVTdHJpbmcodW5kZWZpbmVkLCBmYWxzZSkpLnRvQmUoJycpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHVzZSBjdXJyZW50IHRpbWVzdGFtcCBmb3IgaW52YWxpZCBkYXRlIHdoZW4gZmxhZyBpcyB0cnVlJywgKCkgPT4ge1xuICAgICAgY29uc3QgYmVmb3JlID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gdG9EYXRlU3RyaW5nKCdpbnZhbGlkIGRhdGUnKTtcbiAgICAgIGNvbnN0IGFmdGVyID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgXG4gICAgICBleHBlY3QocmVzdWx0ID49IGJlZm9yZSAmJiByZXN1bHQgPD0gYWZ0ZXIpLnRvQmUodHJ1ZSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgcmV0dXJuIG9yaWdpbmFsIHZhbHVlIGZvciBpbnZhbGlkIGRhdGUgd2hlbiBmbGFnIGlzIGZhbHNlJywgKCkgPT4ge1xuICAgICAgZXhwZWN0KHRvRGF0ZVN0cmluZygnaW52YWxpZCBkYXRlJywgZmFsc2UpKS50b0JlKCdpbnZhbGlkIGRhdGUnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ21hcFJvd1RvT2JqZWN0JywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBtYXAgaGVhZGVycyB0byByb3cgdmFsdWVzJywgKCkgPT4ge1xuICAgICAgY29uc3QgaGVhZGVycyA9IFsnc3R1ZGVudF9pZCcsICduYW1lJywgJ21hcmtzJ107XG4gICAgICBjb25zdCByb3cgPSBbJ1NUVTAwMScsICdKb2huJywgODVdO1xuICAgICAgY29uc3QgcmVzdWx0ID0gbWFwUm93VG9PYmplY3QoaGVhZGVycywgcm93KTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbCh7XG4gICAgICAgIHN0dWRlbnRfaWQ6ICdTVFUwMDEnLFxuICAgICAgICBuYW1lOiAnSm9obicsXG4gICAgICAgIG1hcmtzOiA4NSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGhhbmRsZSBtb3JlIGhlYWRlcnMgdGhhbiByb3cgdmFsdWVzJywgKCkgPT4ge1xuICAgICAgY29uc3QgaGVhZGVycyA9IFsnc3R1ZGVudF9pZCcsICduYW1lJywgJ21hcmtzJywgJ2NsYXNzJ107XG4gICAgICBjb25zdCByb3cgPSBbJ1NUVTAwMScsICdKb2huJywgODVdO1xuICAgICAgY29uc3QgcmVzdWx0ID0gbWFwUm93VG9PYmplY3QoaGVhZGVycywgcm93KTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbCh7XG4gICAgICAgIHN0dWRlbnRfaWQ6ICdTVFUwMDEnLFxuICAgICAgICBuYW1lOiAnSm9obicsXG4gICAgICAgIG1hcmtzOiA4NSxcbiAgICAgICAgY2xhc3M6IHVuZGVmaW5lZCxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGhhbmRsZSBtb3JlIHJvdyB2YWx1ZXMgdGhhbiBoZWFkZXJzJywgKCkgPT4ge1xuICAgICAgY29uc3QgaGVhZGVycyA9IFsnc3R1ZGVudF9pZCcsICduYW1lJ107XG4gICAgICBjb25zdCByb3cgPSBbJ1NUVTAwMScsICdKb2huJywgODUsICcxQSddO1xuICAgICAgY29uc3QgcmVzdWx0ID0gbWFwUm93VG9PYmplY3QoaGVhZGVycywgcm93KTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbCh7XG4gICAgICAgIHN0dWRlbnRfaWQ6ICdTVFUwMDEnLFxuICAgICAgICBuYW1lOiAnSm9obicsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBoYW5kbGUgZW1wdHkgaGVhZGVycycsICgpID0+IHtcbiAgICAgIGNvbnN0IGhlYWRlcnMgPSBbJ3N0dWRlbnRfaWQnLCAnJywgJ21hcmtzJ107XG4gICAgICBjb25zdCByb3cgPSBbJ1NUVTAwMScsICdpZ25vcmVkJywgODVdO1xuICAgICAgY29uc3QgcmVzdWx0ID0gbWFwUm93VG9PYmplY3QoaGVhZGVycywgcm93KTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbCh7XG4gICAgICAgIHN0dWRlbnRfaWQ6ICdTVFUwMDEnLFxuICAgICAgICBtYXJrczogODUsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBoYW5kbGUgbnVsbC91bmRlZmluZWQgdmFsdWVzIGluIHJvdycsICgpID0+IHtcbiAgICAgIGNvbnN0IGhlYWRlcnMgPSBbJ3N0dWRlbnRfaWQnLCAnbmFtZScsICdtYXJrcyddO1xuICAgICAgY29uc3Qgcm93ID0gWydTVFUwMDEnLCBudWxsLCB1bmRlZmluZWRdO1xuICAgICAgY29uc3QgcmVzdWx0ID0gbWFwUm93VG9PYmplY3QoaGVhZGVycywgcm93KTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbCh7XG4gICAgICAgIHN0dWRlbnRfaWQ6ICdTVFUwMDEnLFxuICAgICAgICBuYW1lOiBudWxsLFxuICAgICAgICBtYXJrczogdW5kZWZpbmVkLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCd2YWxpZGF0ZVJlcXVpcmVkRmllbGQnLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIHZhbGlkYXRlIG5vbi1lbXB0eSB2YWx1ZXMnLCAoKSA9PiB7XG4gICAgICBleHBlY3QodmFsaWRhdGVSZXF1aXJlZEZpZWxkKCdTVFUwMDEnLCAnc3R1ZGVudF9pZCcpKS50b0VxdWFsKHsgdmFsaWQ6IHRydWUgfSk7XG4gICAgICBleHBlY3QodmFsaWRhdGVSZXF1aXJlZEZpZWxkKCdKb2huJywgJ25hbWUnKSkudG9FcXVhbCh7IHZhbGlkOiB0cnVlIH0pO1xuICAgICAgZXhwZWN0KHZhbGlkYXRlUmVxdWlyZWRGaWVsZCgxMjMsICdpZCcpKS50b0VxdWFsKHsgdmFsaWQ6IHRydWUgfSk7XG4gICAgICBleHBlY3QodmFsaWRhdGVSZXF1aXJlZEZpZWxkKDAsICd2YWx1ZScpKS50b0VxdWFsKHsgdmFsaWQ6IHRydWUgfSk7XG4gICAgICBleHBlY3QodmFsaWRhdGVSZXF1aXJlZEZpZWxkKGZhbHNlLCAnZmxhZycpKS50b0VxdWFsKHsgdmFsaWQ6IHRydWUgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgcmVqZWN0IG51bGwgdmFsdWVzJywgKCkgPT4ge1xuICAgICAgZXhwZWN0KHZhbGlkYXRlUmVxdWlyZWRGaWVsZChudWxsLCAnc3R1ZGVudF9pZCcpKS50b0VxdWFsKHtcbiAgICAgICAgdmFsaWQ6IGZhbHNlLFxuICAgICAgICBlcnJvcjogJ01pc3Npbmcgc3R1ZGVudF9pZCcsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCByZWplY3QgdW5kZWZpbmVkIHZhbHVlcycsICgpID0+IHtcbiAgICAgIGV4cGVjdCh2YWxpZGF0ZVJlcXVpcmVkRmllbGQodW5kZWZpbmVkLCAndGVhY2hlcl9pZCcpKS50b0VxdWFsKHtcbiAgICAgICAgdmFsaWQ6IGZhbHNlLFxuICAgICAgICBlcnJvcjogJ01pc3NpbmcgdGVhY2hlcl9pZCcsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCByZWplY3QgZW1wdHkgc3RyaW5nJywgKCkgPT4ge1xuICAgICAgZXhwZWN0KHZhbGlkYXRlUmVxdWlyZWRGaWVsZCgnJywgJ2dhbWVfaWQnKSkudG9FcXVhbCh7XG4gICAgICAgIHZhbGlkOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6ICdNaXNzaW5nIGdhbWVfaWQnLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgdXNlIGNvcnJlY3QgZmllbGQgbmFtZSBpbiBlcnJvciBtZXNzYWdlJywgKCkgPT4ge1xuICAgICAgZXhwZWN0KHZhbGlkYXRlUmVxdWlyZWRGaWVsZChudWxsLCAnY3VzdG9tX2ZpZWxkJykpLnRvRXF1YWwoe1xuICAgICAgICB2YWxpZDogZmFsc2UsXG4gICAgICAgIGVycm9yOiAnTWlzc2luZyBjdXN0b21fZmllbGQnLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdTY2hlbWEgTWFwcGluZ3MnLCAoKSA9PiB7XG4gICAgdGVzdCgnU1RVREVOVF9TQ0hFTUFfTUFQUElORyBzaG91bGQgaGF2ZSBhbGwgcmVxdWlyZWQgZmllbGRzJywgKCkgPT4ge1xuICAgICAgZXhwZWN0KFNUVURFTlRfU0NIRU1BX01BUFBJTkcuc3R1ZGVudF9pZCkudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChTVFVERU5UX1NDSEVNQV9NQVBQSU5HLnN0dWRlbnRfaWQucmVxdWlyZWQpLnRvQmUodHJ1ZSk7XG4gICAgICBleHBlY3QoU1RVREVOVF9TQ0hFTUFfTUFQUElORy5zdHVkZW50X2lkLnR5cGUpLnRvQmUoJ3N0cmluZycpO1xuICAgICAgXG4gICAgICBleHBlY3QoU1RVREVOVF9TQ0hFTUFfTUFQUElORy5uYW1lXzEpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoU1RVREVOVF9TQ0hFTUFfTUFQUElORy5tYXJrcykudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChTVFVERU5UX1NDSEVNQV9NQVBQSU5HLm1hcmtzLnR5cGUpLnRvQmUoJ251bWJlcicpO1xuICAgICAgXG4gICAgICBleHBlY3QoU1RVREVOVF9TQ0hFTUFfTUFQUElORy5jcmVhdGVkX2F0KS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KFNUVURFTlRfU0NIRU1BX01BUFBJTkcudXBkYXRlZF9hdCkudG9CZURlZmluZWQoKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ1RFQUNIRVJfU0NIRU1BX01BUFBJTkcgc2hvdWxkIGhhdmUgYWxsIHJlcXVpcmVkIGZpZWxkcycsICgpID0+IHtcbiAgICAgIGV4cGVjdChURUFDSEVSX1NDSEVNQV9NQVBQSU5HLnRlYWNoZXJfaWQpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoVEVBQ0hFUl9TQ0hFTUFfTUFQUElORy50ZWFjaGVyX2lkLnJlcXVpcmVkKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KFRFQUNIRVJfU0NIRU1BX01BUFBJTkcudGVhY2hlcl9pZC50eXBlKS50b0JlKCdzdHJpbmcnKTtcbiAgICAgIFxuICAgICAgZXhwZWN0KFRFQUNIRVJfU0NIRU1BX01BUFBJTkcucmVzcG9uc2libGVfY2xhc3MpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoVEVBQ0hFUl9TQ0hFTUFfTUFQUElORy5yZXNwb25zaWJsZV9jbGFzcy50eXBlKS50b0JlKCdhcnJheScpO1xuICAgICAgXG4gICAgICBleHBlY3QoVEVBQ0hFUl9TQ0hFTUFfTUFQUElORy5pc19hZG1pbikudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChURUFDSEVSX1NDSEVNQV9NQVBQSU5HLmlzX2FkbWluLnR5cGUpLnRvQmUoJ2Jvb2xlYW4nKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ0dBTUVfU0NIRU1BX01BUFBJTkcgc2hvdWxkIGhhdmUgYWxsIHJlcXVpcmVkIGZpZWxkcycsICgpID0+IHtcbiAgICAgIGV4cGVjdChHQU1FX1NDSEVNQV9NQVBQSU5HLmdhbWVfaWQpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoR0FNRV9TQ0hFTUFfTUFQUElORy5nYW1lX2lkLnJlcXVpcmVkKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KEdBTUVfU0NIRU1BX01BUFBJTkcuZ2FtZV9pZC50eXBlKS50b0JlKCdzdHJpbmcnKTtcbiAgICAgIFxuICAgICAgZXhwZWN0KEdBTUVfU0NIRU1BX01BUFBJTkcuYWNjdW11bGF0ZWRfY2xpY2spLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoR0FNRV9TQ0hFTUFfTUFQUElORy5hY2N1bXVsYXRlZF9jbGljay50eXBlKS50b0JlKCdudW1iZXInKTtcbiAgICAgIFxuICAgICAgZXhwZWN0KEdBTUVfU0NIRU1BX01BUFBJTkcuc2NyYXRjaF9hcGkpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoR0FNRV9TQ0hFTUFfTUFQUElORy5zdWJqZWN0KS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KEdBTUVfU0NIRU1BX01BUFBJTkcuZGlmZmljdWx0eSkudG9CZURlZmluZWQoKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ0FsbCBzY2hlbWEgbWFwcGluZ3Mgc2hvdWxkIGhhdmUgZGVzY3JpcHRpb25zJywgKCkgPT4ge1xuICAgICAgT2JqZWN0LnZhbHVlcyhTVFVERU5UX1NDSEVNQV9NQVBQSU5HKS5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgZXhwZWN0KGZpZWxkLmRlc2NyaXB0aW9uKS50b0JlRGVmaW5lZCgpO1xuICAgICAgICBleHBlY3QodHlwZW9mIGZpZWxkLmRlc2NyaXB0aW9uKS50b0JlKCdzdHJpbmcnKTtcbiAgICAgICAgZXhwZWN0KGZpZWxkLmRlc2NyaXB0aW9uLmxlbmd0aCkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgICAgfSk7XG5cbiAgICAgIE9iamVjdC52YWx1ZXMoVEVBQ0hFUl9TQ0hFTUFfTUFQUElORykuZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgIGV4cGVjdChmaWVsZC5kZXNjcmlwdGlvbikudG9CZURlZmluZWQoKTtcbiAgICAgICAgZXhwZWN0KHR5cGVvZiBmaWVsZC5kZXNjcmlwdGlvbikudG9CZSgnc3RyaW5nJyk7XG4gICAgICB9KTtcblxuICAgICAgT2JqZWN0LnZhbHVlcyhHQU1FX1NDSEVNQV9NQVBQSU5HKS5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgZXhwZWN0KGZpZWxkLmRlc2NyaXB0aW9uKS50b0JlRGVmaW5lZCgpO1xuICAgICAgICBleHBlY3QodHlwZW9mIGZpZWxkLmRlc2NyaXB0aW9uKS50b0JlKCdzdHJpbmcnKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnSW50ZWdyYXRpb24gVGVzdHMgLSBSZWFsLXdvcmxkIFNjZW5hcmlvcycsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgY29udmVydCBzdHVkZW50IHJvdyBmcm9tIEV4Y2VsIHRvIER5bmFtb0RCIGZvcm1hdCcsICgpID0+IHtcbiAgICAgIGNvbnN0IGhlYWRlcnMgPSBbJ3N0dWRlbnRfaWQnLCAnbmFtZV8xJywgJ21hcmtzJywgJ2NsYXNzJywgJ3RlYWNoZXJfaWQnXTtcbiAgICAgIGNvbnN0IHJvdyA9IFsnU1RVMDAxJywgJ0pvaG4gQ2hhbicsICcxNTAnLCAnMUEnLCAnVENIMDAxJ107XG4gICAgICBjb25zdCByYXdEYXRhID0gbWFwUm93VG9PYmplY3QoaGVhZGVycywgcm93KTtcbiAgICAgIFxuICAgICAgLy8gQ29udmVydCB0byBwcm9wZXIgdHlwZXNcbiAgICAgIGNvbnN0IHN0dWRlbnRSZWNvcmQgPSB7XG4gICAgICAgIHN0dWRlbnRfaWQ6IHRvU3RyaW5nKHJhd0RhdGEuc3R1ZGVudF9pZCksXG4gICAgICAgIG5hbWVfMTogdG9TdHJpbmcocmF3RGF0YS5uYW1lXzEpLFxuICAgICAgICBtYXJrczogdG9OdW1iZXIocmF3RGF0YS5tYXJrcyksXG4gICAgICAgIGNsYXNzOiB0b1N0cmluZyhyYXdEYXRhLmNsYXNzKSxcbiAgICAgICAgdGVhY2hlcl9pZDogdG9TdHJpbmcocmF3RGF0YS50ZWFjaGVyX2lkKSxcbiAgICAgIH07XG4gICAgICBcbiAgICAgIGV4cGVjdChzdHVkZW50UmVjb3JkKS50b0VxdWFsKHtcbiAgICAgICAgc3R1ZGVudF9pZDogJ1NUVTAwMScsXG4gICAgICAgIG5hbWVfMTogJ0pvaG4gQ2hhbicsXG4gICAgICAgIG1hcmtzOiAxNTAsXG4gICAgICAgIGNsYXNzOiAnMUEnLFxuICAgICAgICB0ZWFjaGVyX2lkOiAnVENIMDAxJyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGNvbnZlcnQgdGVhY2hlciByb3cgd2l0aCBKU09OIGFycmF5IGZyb20gRXhjZWwgdG8gRHluYW1vREIgZm9ybWF0JywgKCkgPT4ge1xuICAgICAgY29uc3QgaGVhZGVycyA9IFsndGVhY2hlcl9pZCcsICduYW1lJywgJ3Jlc3BvbnNpYmxlX2NsYXNzJywgJ2lzX2FkbWluJ107XG4gICAgICBjb25zdCByb3cgPSBbJ1RDSDAwMScsICdNci4gV29uZycsICdbXCIxQVwiLCBcIjJBXCJdJywgJ2ZhbHNlJ107XG4gICAgICBjb25zdCByYXdEYXRhID0gbWFwUm93VG9PYmplY3QoaGVhZGVycywgcm93KTtcbiAgICAgIFxuICAgICAgLy8gQ29udmVydCB0byBwcm9wZXIgdHlwZXNcbiAgICAgIGNvbnN0IHRlYWNoZXJSZWNvcmQgPSB7XG4gICAgICAgIHRlYWNoZXJfaWQ6IHRvU3RyaW5nKHJhd0RhdGEudGVhY2hlcl9pZCksXG4gICAgICAgIG5hbWU6IHRvU3RyaW5nKHJhd0RhdGEubmFtZSksXG4gICAgICAgIHJlc3BvbnNpYmxlX2NsYXNzOiB0b1N0cmluZ0FycmF5KHJhd0RhdGEucmVzcG9uc2libGVfY2xhc3MpLFxuICAgICAgICBpc19hZG1pbjogdG9Cb29sZWFuKHJhd0RhdGEuaXNfYWRtaW4pLFxuICAgICAgfTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHRlYWNoZXJSZWNvcmQpLnRvRXF1YWwoe1xuICAgICAgICB0ZWFjaGVyX2lkOiAnVENIMDAxJyxcbiAgICAgICAgbmFtZTogJ01yLiBXb25nJyxcbiAgICAgICAgcmVzcG9uc2libGVfY2xhc3M6IFsnMUEnLCAnMkEnXSxcbiAgICAgICAgaXNfYWRtaW46IGZhbHNlLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgY29udmVydCBnYW1lIHJvdyBmcm9tIEV4Y2VsIHRvIER5bmFtb0RCIGZvcm1hdCcsICgpID0+IHtcbiAgICAgIGNvbnN0IGhlYWRlcnMgPSBbJ2dhbWVfaWQnLCAnZ2FtZV9uYW1lJywgJ3N0dWRlbnRfaWQnLCAnZGlmZmljdWx0eScsICdhY2N1bXVsYXRlZF9jbGljayddO1xuICAgICAgY29uc3Qgcm93ID0gWycxMjA3MjYwNjMwJywgJ0NoYXJhY3RlciBNYXRjaCcsICdTVFUwMDEnLCAnQmVnaW5uZXInLCAnMTUnXTtcbiAgICAgIGNvbnN0IHJhd0RhdGEgPSBtYXBSb3dUb09iamVjdChoZWFkZXJzLCByb3cpO1xuICAgICAgXG4gICAgICAvLyBDb252ZXJ0IHRvIHByb3BlciB0eXBlc1xuICAgICAgY29uc3QgZ2FtZVJlY29yZCA9IHtcbiAgICAgICAgZ2FtZV9pZDogdG9TdHJpbmcocmF3RGF0YS5nYW1lX2lkKSxcbiAgICAgICAgZ2FtZV9uYW1lOiB0b1N0cmluZyhyYXdEYXRhLmdhbWVfbmFtZSksXG4gICAgICAgIHN0dWRlbnRfaWQ6IHRvU3RyaW5nKHJhd0RhdGEuc3R1ZGVudF9pZCksXG4gICAgICAgIGRpZmZpY3VsdHk6IHRvU3RyaW5nKHJhd0RhdGEuZGlmZmljdWx0eSksXG4gICAgICAgIGFjY3VtdWxhdGVkX2NsaWNrOiB0b051bWJlcihyYXdEYXRhLmFjY3VtdWxhdGVkX2NsaWNrKSxcbiAgICAgIH07XG4gICAgICBcbiAgICAgIGV4cGVjdChnYW1lUmVjb3JkKS50b0VxdWFsKHtcbiAgICAgICAgZ2FtZV9pZDogJzEyMDcyNjA2MzAnLFxuICAgICAgICBnYW1lX25hbWU6ICdDaGFyYWN0ZXIgTWF0Y2gnLFxuICAgICAgICBzdHVkZW50X2lkOiAnU1RVMDAxJyxcbiAgICAgICAgZGlmZmljdWx0eTogJ0JlZ2lubmVyJyxcbiAgICAgICAgYWNjdW11bGF0ZWRfY2xpY2s6IDE1LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgaGFuZGxlIG1pc3Npbmcgb3B0aW9uYWwgZmllbGRzIGdyYWNlZnVsbHknLCAoKSA9PiB7XG4gICAgICBjb25zdCBoZWFkZXJzID0gWydzdHVkZW50X2lkJywgJ25hbWVfMScsICdtYXJrcyddO1xuICAgICAgY29uc3Qgcm93ID0gWydTVFUwMDEnLCBudWxsLCAnJ107XG4gICAgICBjb25zdCByYXdEYXRhID0gbWFwUm93VG9PYmplY3QoaGVhZGVycywgcm93KTtcbiAgICAgIFxuICAgICAgY29uc3Qgc3R1ZGVudFJlY29yZCA9IHtcbiAgICAgICAgc3R1ZGVudF9pZDogdG9TdHJpbmcocmF3RGF0YS5zdHVkZW50X2lkKSxcbiAgICAgICAgbmFtZV8xOiB0b1N0cmluZyhyYXdEYXRhLm5hbWVfMSksXG4gICAgICAgIG1hcmtzOiB0b051bWJlcihyYXdEYXRhLm1hcmtzKSxcbiAgICAgIH07XG4gICAgICBcbiAgICAgIGV4cGVjdChzdHVkZW50UmVjb3JkKS50b0VxdWFsKHtcbiAgICAgICAgc3R1ZGVudF9pZDogJ1NUVTAwMScsXG4gICAgICAgIG5hbWVfMTogJycsXG4gICAgICAgIG1hcmtzOiAwLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xufSk7XG4iXX0=