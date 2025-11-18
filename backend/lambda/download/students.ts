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
    // Trim each class name to handle any whitespace issues
    const classesParam = event.queryStringParameters?.classes;
    const classFilter = classesParam 
      ? classesParam.split(',').map(c => c.trim()).filter(c => c.length > 0)
      : [];

    logger.info({ 
      classFilter,
      classFilterLength: classFilter.length,
      rawQueryString: classesParam 
    }, 'Starting students download');

    // Get all students from DynamoDB
    const scanCommand = new ScanCommand({
      TableName: tableNames.students,
    });
    const result = await dynamoDBClient.send(scanCommand);
    let students = (result.Items as StudentRecord[]) || [];

    logger.info({ totalStudents: students.length }, 'Retrieved all students from DynamoDB');

    // Apply class filter if provided
    if (classFilter.length > 0) {
      const beforeFilterCount = students.length;
      students = students.filter(student => {
        // Also trim the student's class in case there's whitespace in the database
        const studentClass = student.class.trim();
        return classFilter.includes(studentClass);
      });
      logger.info({ 
        beforeFilterCount, 
        afterFilterCount: students.length,
        classesIncluded: [...new Set(students.map(s => s.class.trim()))],
        requestedClasses: classFilter
      }, 'Applied class filter');
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

