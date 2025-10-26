/**
 * Upload Validation Tests
 * Tests to verify that upload handlers properly validate and return errors
 * when no records are successfully processed
 */

import { handler as gamesHandler } from '../../lambda/upload/games';
import { handler as studentsHandler } from '../../lambda/upload/students';
import { handler as teachersHandler } from '../../lambda/upload/teachers';
import { APIGatewayProxyEvent } from 'aws-lambda';
import * as XLSX from 'xlsx';

describe('Upload Validation - Zero Records Processed', () => {
  describe('Games Upload Handler', () => {
    test('should return error when no records are processed', async () => {
      // Create an Excel file with only invalid records (missing game_id)
      const worksheetData = [
        ['game_id', 'game_name', 'student_id', 'subject'],
        ['', 'Invalid Game 1', 'STU001', 'Math'], // Missing game_id
        ['', 'Invalid Game 2', 'STU002', 'Science'], // Missing game_id
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Games');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const base64File = buffer.toString('base64');

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({ file: base64File }),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/upload/games',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const result = await gamesHandler(event);
      const body = JSON.parse(result.body);

      // Should return 400 error
      expect(result.statusCode).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toContain('No records were successfully processed');
      expect(body.errors).toBeDefined();
      expect(body.errors.length).toBeGreaterThan(0);
    });

    // Note: Testing successful upload requires mocking DynamoDB client
    // The important test is that validation properly rejects when NO records are processed
  });

  describe('Students Upload Handler', () => {
    test('should return error when no records are processed', async () => {
      // Create an Excel file with only invalid records (missing student_id)
      const worksheetData = [
        ['student_id', 'name', 'class', 'teacher_id'],
        ['', 'Invalid Student 1', '1A', 'TCH001'], // Missing student_id
        ['', 'Invalid Student 2', '1B', 'TCH002'], // Missing student_id
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const base64File = buffer.toString('base64');

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({ file: base64File }),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/upload/students',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const result = await studentsHandler(event);
      const body = JSON.parse(result.body);

      // Should return 400 error
      expect(result.statusCode).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toContain('No records were successfully processed');
      expect(body.errors).toBeDefined();
      expect(body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Teachers Upload Handler', () => {
    test('should return error when no records are processed', async () => {
      // Create an Excel file with only invalid records (missing teacher_id)
      const worksheetData = [
        ['teacher_id', 'name', 'password'],
        ['', 'Invalid Teacher 1', 'pass123'], // Missing teacher_id
        ['', 'Invalid Teacher 2', 'pass123'], // Missing teacher_id
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Teachers');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const base64File = buffer.toString('base64');

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify({ file: base64File }),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/upload/teachers',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };

      const result = await teachersHandler(event);
      const body = JSON.parse(result.body);

      // Should return 400 error
      expect(result.statusCode).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toContain('No records were successfully processed');
      expect(body.errors).toBeDefined();
      expect(body.errors.length).toBeGreaterThan(0);
    });
  });
});
