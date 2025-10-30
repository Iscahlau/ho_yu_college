/**
 * Excel Download Integration Test
 * Tests the complete flow of Excel file generation and download
 */

import * as XLSX from 'xlsx';
import { createExcelWorkbook } from '../lambda/utils/excel';
import { createExcelResponse } from '../lambda/utils/response';

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
