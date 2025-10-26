/**
 * Download Teachers Lambda Handler
 * Handles Excel export for teacher data
 * - Admin only - access control should be enforced at API Gateway level
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
import { TEACHERS_COLUMN_WIDTHS } from '../constants';
import type { TeacherRecord } from '../types';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const logger = createLambdaLogger(event);
  
  try {
    logger.info('Starting teachers download');
    
    // Get all teachers from DynamoDB
    const scanCommand = new ScanCommand({
      TableName: tableNames.teachers,
    });
    const result = await dynamoDBClient.send(scanCommand);
    const teachers = (result.Items as TeacherRecord[]) || [];

    // Sort teachers by teacher_id
    teachers.sort((a, b) => a.teacher_id.localeCompare(b.teacher_id));

    // Prepare data for Excel (including password field)
    const excelData = teachers.map(teacher => ({
      teacher_id: teacher.teacher_id,
      name: teacher.name,
      email: teacher.email || '',
      password: teacher.password,
      classes: teacher.classes?.join(', ') || '', // Convert array to comma-separated string
      is_admin: teacher.is_admin ? 'Yes' : 'No',
      last_login: teacher.last_login,
      last_update: teacher.last_update,
    }));

    // Create Excel workbook
    const excelBuffer = createExcelWorkbook(excelData, 'Teachers', [...TEACHERS_COLUMN_WIDTHS]);

    logger.info({ count: teachers.length }, 'Teachers download completed successfully');

    // Return Excel file as response
    const filename = `teachers_${getDateString()}.xlsx`;
    return createExcelResponse(excelBuffer, filename);
  } catch (error) {
    logger.error({ error }, 'Error downloading teachers');
    return createInternalErrorResponse(error as Error);
  }
};

