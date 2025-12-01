/**
 * Excel Download Integration Test
 * Tests the complete flow of Excel file generation and download
 */

import * as XLSX from 'xlsx';
import { createExcelWorkbook } from '../lambda/utils/excel';
import { createExcelResponse, convertToHKT } from '../lambda/utils/response';

describe('Excel Download', () => {
  it('should create valid Excel file buffer', () => {
    const testData = [
      { id: '1', name: 'Test User', email: 'test@example.com' },
      { id: '2', name: 'Another User', email: 'another@example.com' },
    ];

    const buffer = createExcelWorkbook(testData, 'Test');
    
    // Verify buffer is created
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    
    // Verify the buffer can be read by XLSX
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    expect(workbook.SheetNames).toContain('Test');
    
    const worksheet = workbook.Sheets['Test'];
    const data = XLSX.utils.sheet_to_json(worksheet);
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({ id: '1', name: 'Test User' });
  });

  it('should create valid base64 encoded response', () => {
    const testData = [
      { id: '1', name: 'Test' },
    ];

    const buffer = createExcelWorkbook(testData, 'Test');
    const response = createExcelResponse(buffer, 'test.xlsx');
    
    expect(response.statusCode).toBe(200);
    expect(response.headers?.['Content-Type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(response.headers?.['Content-Disposition']).toContain('test.xlsx');
    expect(response.isBase64Encoded).toBe(true);
    
    // Verify base64 can be decoded back to valid Excel
    const decodedBuffer = Buffer.from(response.body, 'base64');
    const workbook = XLSX.read(decodedBuffer, { type: 'buffer' });
    expect(workbook.SheetNames).toContain('Test');
  });

  it('should match the actual download response format', () => {
    const testData = [
      { teacher_id: 'T001', name: 'Teacher 1', class: '1A' },
    ];

    const buffer = createExcelWorkbook(testData, 'Teachers');
    const response = createExcelResponse(buffer, 'teachers.xlsx');
    
    // Simulate what frontend receives
    const base64Data = response.body;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Verify it can be read as Excel
    const workbook = XLSX.read(bytes, { type: 'array' });
    expect(workbook.SheetNames).toContain('Teachers');
    
    const data = XLSX.utils.sheet_to_json(workbook.Sheets['Teachers']);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ teacher_id: 'T001', name: 'Teacher 1' });
  });
});

describe('HKT Timestamp Conversion', () => {
  it('should convert UTC timestamp to HKT format', () => {
    // Test UTC midnight (00:00:00) -> HKT 08:00:00
    const utcMidnight = '2024-01-01T00:00:00.000Z';
    expect(convertToHKT(utcMidnight)).toBe('2024-01-01 08:00:00');
    
    // Test UTC noon (12:00:00) -> HKT 20:00:00
    const utcNoon = '2024-01-01T12:00:00.000Z';
    expect(convertToHKT(utcNoon)).toBe('2024-01-01 20:00:00');
    
    // Test UTC late evening (16:00:00) -> HKT next day 00:00:00
    const utcEvening = '2024-01-01T16:00:00.000Z';
    expect(convertToHKT(utcEvening)).toBe('2024-01-02 00:00:00');
  });

  it('should handle edge cases correctly', () => {
    // End of year
    const endOfYear = '2023-12-31T20:00:00.000Z';
    expect(convertToHKT(endOfYear)).toBe('2024-01-01 04:00:00');
    
    // End of month
    const endOfMonth = '2024-01-31T20:00:00.000Z';
    expect(convertToHKT(endOfMonth)).toBe('2024-02-01 04:00:00');
  });

  it('should handle invalid inputs', () => {
    expect(convertToHKT(null)).toBe('');
    expect(convertToHKT(undefined)).toBe('');
    expect(convertToHKT('')).toBe('');
    expect(convertToHKT('invalid-date')).toBe('');
  });

  it('should preserve time precision', () => {
    const timestamp = '2024-06-15T14:35:42.123Z';
    expect(convertToHKT(timestamp)).toBe('2024-06-15 22:35:42');
  });
});
