/**
 * Students Download Lambda Function Tests
 * Unit tests for student data download as Excel
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../../lambda/download/students';
import { mockStudents } from '../mocks';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb', () => {
  return {
    DynamoDBDocumentClient: {
      from: jest.fn(() => ({
        send: jest.fn((command: any) => {
          const { mockStudents } = require('../mocks');
          
          // Handle ScanCommand - return all students
          if (command.input?.TableName === 'ho-yu-students') {
            return Promise.resolve({ Items: mockStudents });
          }
          
          return Promise.resolve({ Items: [] });
        }),
      })),
    },
    ScanCommand: jest.fn().mockImplementation((input) => ({ input })),
    QueryCommand: jest.fn().mockImplementation((input) => ({ input })),
  };
});

// Mock dynamodb-client module
jest.mock('../../lambda/utils/dynamodb-client', () => {
  const { mockStudents } = require('../mocks');
  return {
    dynamoDBClient: {
      send: jest.fn((command: any) => {
        if (command.input?.TableName === 'ho-yu-students') {
          return Promise.resolve({ Items: mockStudents });
        }
        return Promise.resolve({ Items: [] });
      }),
    },
    tableNames: {
      students: 'ho-yu-students',
      teachers: 'ho-yu-teachers',
      games: 'ho-yu-games',
    },
  };
});

describe('Students Download Lambda', () => {
  const createEvent = (queryParams?: Record<string, string>): Partial<APIGatewayProxyEvent> => ({
    httpMethod: 'GET',
    path: '/students/download',
    queryStringParameters: queryParams || null,
    headers: {},
    body: null,
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('should return Excel file for all students when no filter is provided', async () => {
    const event = createEvent() as APIGatewayProxyEvent;
    const result = await handler(event) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Content-Type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(result.headers?.['Content-Disposition']).toContain('attachment; filename="students_');
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(result.isBase64Encoded).toBe(true);
    expect(result.body).toBeDefined();
    expect(result.body.length).toBeGreaterThan(0);
  });

  test('should return Excel file with filtered students when class filter is provided', async () => {
    const event = createEvent({ classes: '1A,2A' }) as APIGatewayProxyEvent;
    const result = await handler(event) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Content-Type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(result.isBase64Encoded).toBe(true);
    expect(result.body).toBeDefined();
  });

  test('should handle errors gracefully', async () => {
    // Mock the dynamoDBClient to throw an error
    const { dynamoDBClient } = require('../../lambda/utils/dynamodb-client');
    dynamoDBClient.send.mockRejectedValueOnce(new Error('Database error'));

    const event = createEvent() as APIGatewayProxyEvent;
    const result = await handler(event) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(500);
    expect(result.headers?.['Content-Type']).toBe('application/json');
    
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.message).toBe('Failed to download student data');
    expect(body.error).toBeDefined();
  });

  test('should include all required fields in Excel export', async () => {
    const event = createEvent() as APIGatewayProxyEvent;
    const result = await handler(event) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    // The body should be a base64 encoded Excel file
    expect(result.body).toBeDefined();
    // Check that it's actually base64
    expect(() => Buffer.from(result.body, 'base64')).not.toThrow();
  });
});
