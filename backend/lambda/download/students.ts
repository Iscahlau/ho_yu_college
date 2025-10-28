/**
 * Download Students Lambda Handler
 * Handles Excel export for student data
 * - Teachers can only download data for their responsible classes
 * - Admins can download all student data
 * - Returns Excel file (.xlsx) with proper structure
 */

import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient, tableNames } from '../utils/dynamodb-client';
import {
  createExcelResponse,
  createInternalErrorResponse,
  getDateString,
} from '../utils/response';
import { createLambdaLogger } from '../utils/logger';
import { createExcelWorkbook } from '../utils/excel';
import { STUDENTS_COLUMN_WIDTHS } from '../constants';
import type { StudentRecord } from '../types';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const logger = createLambdaLogger(event);
  
  try {
    // Get query parameters (optional class filter)
    const classFilter = event.queryStringParameters?.classes?.split(',') || [];

    logger.info({ classFilter }, 'Starting students download');

    // Get all students from DynamoDB
    const scanCommand = new ScanCommand({
      TableName: tableNames.students,
    });
    const result = await dynamoDBClient.send(scanCommand);
    let students = (result.Items as StudentRecord[]) || [];

    // Apply class filter if provided
    if (classFilter.length > 0) {
      students = students.filter(student => classFilter.includes(student.class));
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
      password: student.password,
    }));

    // Create Excel workbook
    const excelBuffer = createExcelWorkbook(excelData, 'Students', [...STUDENTS_COLUMN_WIDTHS]);

    logger.info({ count: students.length }, 'Students download completed successfully');

    // Return Excel file as response
    const filename = `students_${getDateString()}.xlsx`;
    return createExcelResponse(excelBuffer, filename);
  } catch (error) {
    logger.error({ error }, 'Error downloading students');
    return createInternalErrorResponse(error as Error);
  }
};

