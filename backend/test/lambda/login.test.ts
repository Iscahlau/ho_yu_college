/**
 * Login Lambda Function Tests
 * Unit tests for authentication logic
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../../lambda/auth/login';
import { mockStudents, mockTeachers, MOCK_STUDENT_PASSWORD, MOCK_TEACHER_PASSWORD, MOCK_ADMIN_PASSWORD } from '../mocks';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb', () => {
  return {
    DynamoDBDocumentClient: {
      from: jest.fn(() => ({
        send: jest.fn((command: any) => {
          // Mock implementation to return data based on command
          const tableName = command.input?.TableName;
          const key = command.input?.Key;
          
          if (tableName === process.env.STUDENTS_TABLE_NAME && key?.student_id) {
            const student = mockStudents.find((s: any) => s.student_id === key.student_id);
            return Promise.resolve({ Item: student });
          }
          
          if (tableName === process.env.TEACHERS_TABLE_NAME && key?.teacher_id) {
            const teacher = mockTeachers.find((t: any) => t.teacher_id === key.teacher_id);
            return Promise.resolve({ Item: teacher });
          }
          
          return Promise.resolve({ Item: undefined });
        }),
      })),
    },
    GetCommand: jest.fn((input: any) => ({ input })),
  };
});

// Set environment variables
process.env.STUDENTS_TABLE_NAME = 'ho-yu-students';
process.env.TEACHERS_TABLE_NAME = 'ho-yu-teachers';

describe('Login Lambda Handler', () => {
  const createEvent = (body: any): APIGatewayProxyEvent => ({
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/auth/login',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
  });

  describe('Input Validation', () => {
    test('should return 400 if id is missing', async () => {
      const event = createEvent({ password: 'test123' });
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ message: 'Missing id or password' });
    });

    test('should return 400 if password is missing', async () => {
      const event = createEvent({ id: 'STU001' });
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ message: 'Missing id or password' });
    });

    test('should return 400 if both id and password are missing', async () => {
      const event = createEvent({});
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ message: 'Missing id or password' });
    });
  });

  describe('Student Authentication', () => {
    test('should successfully authenticate valid student', async () => {
      const event = createEvent({
        id: 'STU001',
        password: MOCK_STUDENT_PASSWORD,
      });
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.role).toBe('student');
      expect(body.user).toBeDefined();
      expect(body.user.student_id).toBe('STU001');
      expect(body.user.password).toBeUndefined(); // Password should be removed
    });

    test('should fail authentication with wrong password', async () => {
      const event = createEvent({
        id: 'STU001',
        password: 'wrongpassword',
      });
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({ message: 'Invalid credentials' });
    });

    test('should fail authentication for non-existent student', async () => {
      const event = createEvent({
        id: 'STU999',
        password: MOCK_STUDENT_PASSWORD,
      });
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({ message: 'Invalid credentials' });
    });

    test('should authenticate multiple students with same password', async () => {
      for (const student of mockStudents.slice(0, 3)) {
        const event = createEvent({
          id: student.student_id,
          password: MOCK_STUDENT_PASSWORD,
        });
        const result: APIGatewayProxyResult = await handler(event);

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.user.student_id).toBe(student.student_id);
      }
    });
  });

  describe('Teacher Authentication', () => {
    test('should successfully authenticate valid teacher', async () => {
      const event = createEvent({
        id: 'TCH001',
        password: MOCK_TEACHER_PASSWORD,
      });
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.role).toBe('teacher');
      expect(body.user).toBeDefined();
      expect(body.user.teacher_id).toBe('TCH001');
      expect(body.user.password).toBeUndefined(); // Password should be removed
    });

    test('should fail authentication with wrong password', async () => {
      const event = createEvent({
        id: 'TCH001',
        password: 'wrongpassword',
      });
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({ message: 'Invalid credentials' });
    });

    test('should fail authentication for non-existent teacher', async () => {
      const event = createEvent({
        id: 'TCH999',
        password: MOCK_TEACHER_PASSWORD,
      });
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({ message: 'Invalid credentials' });
    });
  });

  describe('Admin Authentication', () => {
    test('should successfully authenticate admin and return admin role', async () => {
      const event = createEvent({
        id: 'TCH003',
        password: MOCK_ADMIN_PASSWORD,
      });
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.role).toBe('admin');
      expect(body.user).toBeDefined();
      expect(body.user.teacher_id).toBe('TCH003');
      expect(body.user.is_admin).toBe(true);
      expect(body.user.password).toBeUndefined();
    });

    test('should not authenticate admin with teacher password', async () => {
      const event = createEvent({
        id: 'TCH003',
        password: MOCK_TEACHER_PASSWORD,
      });
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toEqual({ message: 'Invalid credentials' });
    });
  });

  describe('Response Headers', () => {
    test('should include CORS headers in successful response', async () => {
      const event = createEvent({
        id: 'STU001',
        password: MOCK_STUDENT_PASSWORD,
      });
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.headers).toBeDefined();
      expect(result.headers!['Content-Type']).toBe('application/json');
      expect(result.headers!['Access-Control-Allow-Origin']).toBe('*');
    });

    test('should include CORS headers in error response', async () => {
      const event = createEvent({
        id: 'STU001',
        password: 'wrongpassword',
      });
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.headers).toBeDefined();
      expect(result.headers!['Content-Type']).toBe('application/json');
      expect(result.headers!['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  describe('Security', () => {
    test('should not return password in successful response', async () => {
      const event = createEvent({
        id: 'STU001',
        password: MOCK_STUDENT_PASSWORD,
      });
      const result: APIGatewayProxyResult = await handler(event);

      const body = JSON.parse(result.body);
      expect(body.user.password).toBeUndefined();
    });

    test('should not return password hash in response', async () => {
      const event = createEvent({
        id: 'STU001',
        password: MOCK_STUDENT_PASSWORD,
      });
      const result: APIGatewayProxyResult = await handler(event);

      const responseStr = result.body;
      // Ensure no SHA-256 hash (64 hex chars) is in response
      expect(responseStr).not.toMatch(/[a-f0-9]{64}/);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty body gracefully', async () => {
      const event = createEvent(null);
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(500);
    });

    test('should handle malformed JSON body', async () => {
      const event: APIGatewayProxyEvent = {
        body: 'not valid json',
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/auth/login',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
      };
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(500);
    });

    test('should treat empty strings as missing credentials', async () => {
      const event = createEvent({ id: '', password: '' });
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(400);
    });
  });
});
