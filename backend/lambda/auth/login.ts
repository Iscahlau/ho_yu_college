/**
 * Auth Lambda Handler - Login functionality
 * Handles student and teacher authentication
 */

import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient, tableNames } from '../utils/dynamodb-client';
import {
  createBadRequestResponse,
  createUnauthorizedResponse,
  createSuccessResponse,
  createInternalErrorResponse,
  parseRequestBody,
  getCurrentTimestamp,
} from '../utils/response';
import type {
  LoginRequest,
  LoginResponse,
  StudentRecord,
  TeacherRecord,
  UserRole,
} from '../types';


// ===== HELPER FUNCTIONS =====

/**
 * Fetch student record from DynamoDB
 */
const getStudent = async (studentId: string): Promise<StudentRecord | undefined> => {
  const command = new GetCommand({
    TableName: tableNames.students,
    Key: { student_id: studentId },
  });

  const result = await dynamoDBClient.send(command);
  return result.Item as StudentRecord | undefined;
};

/**
 * Fetch teacher record from DynamoDB
 */
const getTeacher = async (teacherId: string): Promise<TeacherRecord | undefined> => {
  const command = new GetCommand({
    TableName: tableNames.teachers,
    Key: { teacher_id: teacherId },
  });

  const result = await dynamoDBClient.send(command);
  return result.Item as TeacherRecord | undefined;
};

/**
 * Update last login timestamp for a user
 */
const updateLastLogin = async (id: string, role: UserRole): Promise<void> => {
  const tableName = role === 'student' ? tableNames.students : tableNames.teachers;
  const keyField = role === 'student' ? 'student_id' : 'teacher_id';
  const now = getCurrentTimestamp();

  const command = new UpdateCommand({
    TableName: tableName,
    Key: { [keyField]: id },
    UpdateExpression: 'SET last_login = :now',
    ExpressionAttributeValues: {
      ':now': now,
    },
  });

  try {
    await dynamoDBClient.send(command);
    console.log(`Updated last login for ${role} ${id}`);
  } catch (error) {
    console.error(`Failed to update last login for ${role} ${id}:`, error);
    // Don't throw - login should succeed even if timestamp update fails
  }
};

/**
 * Determine user role based on user record
 */
const determineUserRole = (user: StudentRecord | TeacherRecord): UserRole => {
  if ('is_admin' in user && user.is_admin) {
    return 'admin';
  }
  if ('teacher_id' in user && 'classes' in user) {
    return 'teacher';
  }
  return 'student';
};

// ===== MAIN HANDLER =====

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = parseRequestBody<LoginRequest>(event.body);
    const { id, password } = body;

    // Validate required fields
    if (!id || !password) {
      return createBadRequestResponse('Missing id or password');
    }

    // Try to find student first
    let user: StudentRecord | TeacherRecord | undefined = await getStudent(id);
    let role: UserRole = 'student';

    // If not found, try teacher
    if (!user) {
      user = await getTeacher(id);
      if (user) {
        role = determineUserRole(user);
      }
    }

    // Verify user exists and password matches (plain text comparison)
    if (!user || user.password !== password) {
      return createUnauthorizedResponse('Invalid credentials');
    }

    // Update last login timestamp
    await updateLastLogin(id, role);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    const response: LoginResponse = {
      success: true,
      user: userWithoutPassword,
      role,
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Error in login handler:', error);
    return createInternalErrorResponse(error as Error);
  }
};
