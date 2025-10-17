/**
 * Auth Lambda Handler - Login functionality
 * Handles student and teacher authentication
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

interface LoginRequest {
  id: string;
  password: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body: LoginRequest = JSON.parse(event.body || '{}');
    const { id, password } = body;

    if (!id || !password) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Missing id or password' }),
      };
    }

    // Try to find student first
    let user = await getStudent(id);
    let role: 'student' | 'teacher' | 'admin' = 'student';

    // If not found, try teacher
    if (!user) {
      user = await getTeacher(id);
      if (user) {
        role = (user as any).is_admin ? 'admin' : 'teacher';
      }
    }

    // Verify user exists and password matches (plain text comparison)
    if (!user || user.password !== password) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Invalid credentials' }),
      };
    }

    // Update last login timestamp
    await updateLastLogin(id, role);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        user: userWithoutPassword,
        role,
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

async function getStudent(studentId: string) {
  const command = new GetCommand({
    TableName: process.env.STUDENTS_TABLE_NAME,
    Key: { student_id: studentId },
  });

  const result = await docClient.send(command);
  return result.Item;
}

async function getTeacher(teacherId: string) {
  const command = new GetCommand({
    TableName: process.env.TEACHERS_TABLE_NAME,
    Key: { teacher_id: teacherId },
  });

  const result = await docClient.send(command);
  return result.Item;
}

async function updateLastLogin(id: string, role: 'student' | 'teacher' | 'admin') {
  // Implementation would update the last_login timestamp
  // This is a placeholder for the actual implementation
  console.log(`Updating last login for ${role} ${id}`);
}
