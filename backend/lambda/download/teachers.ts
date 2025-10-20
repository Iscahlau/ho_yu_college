/**
 * Download Teachers Lambda Handler
 * Handles Excel export for teacher data
 * - Admin only - access control should be enforced at API Gateway level
 * - Returns Excel file (.xlsx) with proper structure
 */

import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as XLSX from 'xlsx';
import { dynamoDBClient, tableNames } from '../utils/dynamodb-client';

interface TeacherRecord {
  teacher_id: string;
  name: string;
  password: string;
  responsible_class: string[];
  last_login: string;
  is_admin: boolean;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get all teachers from DynamoDB
    const scanCommand = new ScanCommand({
      TableName: tableNames.teachers,
    });
    const result = await dynamoDBClient.send(scanCommand);
    const teachers = result.Items as TeacherRecord[];

    // Sort teachers by teacher_id
    teachers.sort((a, b) => a.teacher_id.localeCompare(b.teacher_id));

    // Prepare data for Excel (including password field)
    const excelData = teachers.map(teacher => ({
      teacher_id: teacher.teacher_id,
      name: teacher.name,
      responsible_class: teacher.responsible_class.join(', '), // Convert array to comma-separated string
      last_login: teacher.last_login,
      is_admin: teacher.is_admin ? 'Yes' : 'No',
      password: teacher.password,
    }));

    // Create Excel workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Teachers');

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 12 }, // teacher_id
      { wch: 20 }, // name
      { wch: 30 }, // responsible_class
      { wch: 20 }, // last_login
      { wch: 10 }, // is_admin
      { wch: 15 }, // password
    ];

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return Excel file as response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="teachers_${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Access-Control-Allow-Origin': '*',
      },
      body: excelBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('Error downloading teachers:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        success: false,
        message: 'Failed to download teacher data',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
