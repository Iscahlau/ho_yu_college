/**
 * Excel Processing Utilities
 * Helper functions for parsing and validating Excel/CSV files
 */

import * as XLSX from 'xlsx';
import type { HeaderValidationResult } from '../types';

/**
 * Parse an Excel file buffer to JSON array
 * @param fileBuffer - Buffer containing Excel file data
 * @returns 2D array of cell values
 */
export const parseExcelFile = (fileBuffer: Buffer): any[][] => {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
};

/**
 * Filter out empty rows from parsed data
 * @param rows - Array of rows to filter
 * @returns Filtered array with only non-empty rows
 */
export const filterEmptyRows = (rows: any[][]): any[][] =>
  rows.filter(row =>
    row?.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== '')
  );

/**
 * Convert a row array to a record object using headers
 * @param row - Row data array
 * @param headers - Column headers
 * @returns Record object with header keys and row values
 */
export const rowToRecord = (row: any[], headers: string[]): Record<string, any> => {
  const record: Record<string, any> = {};
  headers.forEach((header, index) => {
    record[header] = row[index];
  });
  return record;
};

/**
 * Validate Excel file headers
 * @param headers - Array of header strings from Excel file
 * @param requiredHeaders - Array of required header names
 * @param expectedHeaders - Array of all expected header names
 * @returns Validation result with status and error messages
 */
export const validateHeaders = (
  headers: string[],
  requiredHeaders: readonly string[],
  expectedHeaders: readonly string[]
): HeaderValidationResult => {
  const missingRequired = requiredHeaders.filter(h => !headers.includes(h));

  if (missingRequired.length > 0) {
    return {
      valid: false,
      message: `Missing required column(s): ${missingRequired.join(', ')}. Please check your Excel file headers.`,
      expectedHeaders: [...expectedHeaders] as string[],
    };
  }

  const unexpectedHeaders = headers.filter(
    h => h && !(expectedHeaders as readonly string[]).includes(h)
  );
  
  if (unexpectedHeaders.length > 0) {
    console.warn('Unexpected headers found:', unexpectedHeaders);
  }

  return { valid: true };
};

/**
 * Create Excel workbook from data array
 * @param data - Array of objects to convert to Excel
 * @param sheetName - Name for the worksheet
 * @param columnWidths - Optional array of column width configurations
 * @returns Buffer containing Excel file
 */
export const createExcelWorkbook = (
  data: any[],
  sheetName: string,
  columnWidths?: Array<{ wch: number }>
): Buffer => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  
  // Apply column widths if provided
  if (columnWidths) {
    worksheet['!cols'] = columnWidths;
  }
  
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
};

/**
 * Extract headers and data rows from parsed Excel
 * @param jsonData - Parsed Excel data as 2D array
 * @returns Object containing headers and filtered data rows
 */
export const extractHeadersAndRows = (
  jsonData: any[][]
): { headers: string[]; dataRows: any[][] } => {
  if (jsonData.length < 2) {
    throw new Error('File is empty or contains no data rows');
  }

  const [headers, ...rawDataRows] = jsonData;
  const dataRows = filterEmptyRows(rawDataRows);

  return { headers, dataRows };
};

/**
 * Convert data rows to record objects
 * @param dataRows - Array of data rows
 * @param headers - Column headers
 * @returns Array of parsed records with row indices
 */
export const parseDataRows = (
  dataRows: any[][],
  headers: string[]
): Array<{ index: number; record: Record<string, any> }> =>
  dataRows.map((row, index) => ({
    index: index + 2, // +2 because: 1 for 0-based index, 1 for header row
    record: rowToRecord(row, headers),
  }));

/**
 * Validate record count against maximum limit
 * @param count - Number of records
 * @param maxRecords - Maximum allowed records
 * @throws Error if count exceeds maximum
 */
export const validateRecordCount = (count: number, maxRecords: number): void => {
  if (count > maxRecords) {
    throw new Error(
      `File contains ${count} records. Maximum allowed is ${maxRecords.toLocaleString()} records.`
    );
  }
};
