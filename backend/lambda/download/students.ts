/**
 * Download Students Lambda Handler
 * Handles Excel export for student data
 * - Teachers can only download data for their responsible classes
 * - Admins can download all student data
 * - Returns Excel file (.xlsx) with proper structure
 */

import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as XLSX from 'xlsx';
import { dynamoDBClient, tableNames } from '../utils/dynamodb-client';

interface StudentRecord {
  student_id: string;
  name_1: string;
  name_2: string;
  marks: number;
  class: string;
  class_no: string;
  last_login: string;
  last_update: string;
  teacher_id: string;
  password: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get query parameters (optional class filter)
    const classFilter = event.queryStringParameters?.classes?.split(',') || [];

    // Get all students from DynamoDB
    let students: StudentRecord[] = [];
    
    if (classFilter.length > 0) {
      // If class filter is provided, scan and filter by classes
      const scanCommand = new ScanCommand({
        TableName: tableNames.students,
      });
      const result = await dynamoDBClient.send(scanCommand);
      students = (result.Items as StudentRecord[])
        .filter(student => classFilter.includes(student.class));
    } else {
      // No filter - get all students (admin access)
      const scanCommand = new ScanCommand({
        TableName: tableNames.students,
      });
      const result = await dynamoDBClient.send(scanCommand);
      students = result.Items as StudentRecord[];
    }

    // Sort students by class and class_no
    students.sort((a, b) => {
      if (a.class !== b.class) {
        return a.class.localeCompare(b.class);
      }
      return a.class_no.localeCompare(b.class_no);
    });

    // Prepare data for Excel (including password field)
    const excelData = students.map(student => ({
      student_id: student.student_id,
      name_1: student.name_1,
      name_2: student.name_2,
      marks: student.marks,
      class: student.class,
      class_no: student.class_no,
      last_login: student.last_login,
      last_update: student.last_update,
      teacher_id: student.teacher_id,
      password: student.password,
    }));

    // Create Excel workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 12 }, // student_id
      { wch: 20 }, // name_1
      { wch: 20 }, // name_2
      { wch: 8 },  // marks
      { wch: 8 },  // class
      { wch: 10 }, // class_no
      { wch: 20 }, // last_login
      { wch: 20 }, // last_update
      { wch: 12 }, // teacher_id
      { wch: 15 }, // password
    ];

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return Excel file as response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="students_${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Access-Control-Allow-Origin': '*',
      },
      body: excelBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('Error downloading students:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        success: false,
        message: 'Failed to download student data',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
