/**
 * Upload Students Lambda Handler
 * Handles Excel/CSV file uploads for student data
 * - Skips header row
 * - Upserts records based on student_id
 * - No delete functionality
 */

import { PutCommand, GetCommand, BatchGetCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as XLSX from 'xlsx';
import { dynamoDBClient, tableNames } from '../utils/dynamodb-client';
import { toString } from './utils/conversionUtils';
import { createLambdaLogger } from '../utils/logger';
import logger from '../utils/logger';

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
  created_at?: string;
  updated_at?: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { file: base64File } = body;

    if (!base64File) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          success: false,
          message: 'No file uploaded' 
        }),
      };
    }

    // Decode base64 to buffer
    const fileBuffer = Buffer.from(base64File, 'base64');

    // Parse Excel/CSV file
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON, using first row as headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    // Validate file has data
    if (jsonData.length < 2) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          success: false,
          message: 'File is empty or contains no data rows' 
        }),
      };
    }

    // Extract headers (first row) and data rows (skip first row)
    const headers = jsonData[0];
    const dataRows = jsonData.slice(1).filter(row => 
      row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== '')
    );

    // Validate maximum 4000 records
    if (dataRows.length > 4000) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          success: false,
          message: `File contains ${dataRows.length} records. Maximum allowed is 4,000 records.` 
        }),
      };
    }

    // Process records in batches for better performance
    const results = {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: [] as string[],
    };

    const now = new Date().toISOString();
    
    // Map all rows to records first, validating required fields
    const parsedRecords: Array<{ index: number; record: any }> = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const record: any = {};
      headers.forEach((header, index) => {
        record[header] = row[index];
      });

      // Validate required field
      if (!record.student_id) {
        results.errors.push(`Row ${i + 2}: Missing student_id`);
        continue;
      }

      parsedRecords.push({ index: i, record });
    }

    // Batch check which records already exist (25 items per batch)
    const BATCH_SIZE = 25;
    const existingRecordsMap = new Map<string, StudentRecord>();
    
    for (let i = 0; i < parsedRecords.length; i += BATCH_SIZE) {
      const batch = parsedRecords.slice(i, i + BATCH_SIZE);
      const keys = batch.map(({ record }) => ({ student_id: record.student_id }));
      
      try {
        const batchGetCommand = new BatchGetCommand({
          RequestItems: {
            [tableNames.students]: {
              Keys: keys,
            },
          },
        });
        
        const batchResult = await dynamoDBClient.send(batchGetCommand);
        const items = batchResult.Responses?.[tableNames.students] || [];
        
        items.forEach((item) => {
          existingRecordsMap.set(item.student_id, item as StudentRecord);
        });
      } catch (error) {
        logger.error({ error }, 'Error batch getting students');
        // If batch get fails, fall back to individual checks for this batch
        for (const { record } of batch) {
          try {
            const existing = await getStudent(record.student_id);
            if (existing) {
              existingRecordsMap.set(record.student_id, existing);
            }
          } catch (err) {
            logger.error({ error: err, student_id: record.student_id }, `Error getting student ${record.student_id}`);
          }
        }
      }
    }

    // Batch write records (25 items per batch)
    for (let i = 0; i < parsedRecords.length; i += BATCH_SIZE) {
      const batch = parsedRecords.slice(i, i + BATCH_SIZE);
      const putRequests: any[] = [];
      
      for (const { index, record } of batch) {
        try {
          const existingRecord = existingRecordsMap.get(record.student_id);
          
          // Prepare student record
          const studentRecord: StudentRecord = {
            student_id: record.student_id,
            name_1: record.name_1 || '',
            name_2: record.name_2 || '',
            marks: typeof record.marks === 'number' ? record.marks : 0,
            class: record.class || '',
            class_no: toString(record.class_no),
            last_login: record.last_login || now,
            last_update: now,
            teacher_id: record.teacher_id || '',
            password: toString(record.password),
            created_at: existingRecord ? existingRecord.created_at : now,
            updated_at: now,
          };

          // Check if data has actually changed
          let hasChanges = !existingRecord;
          if (existingRecord) {
            hasChanges = (
              studentRecord.name_1 !== existingRecord.name_1 ||
              studentRecord.name_2 !== existingRecord.name_2 ||
              studentRecord.marks !== existingRecord.marks ||
              studentRecord.class !== existingRecord.class ||
              studentRecord.class_no !== existingRecord.class_no ||
              studentRecord.teacher_id !== existingRecord.teacher_id ||
              studentRecord.password !== existingRecord.password
            );
          }

          // Only update timestamps if there are actual changes
          if (!hasChanges && existingRecord) {
            studentRecord.last_update = existingRecord.last_update;
            studentRecord.updated_at = existingRecord.updated_at;
          }

          putRequests.push({
            PutRequest: {
              Item: studentRecord,
            },
          });
          
          if (existingRecord) {
            results.updated++;
          } else {
            results.inserted++;
          }
          results.processed++;
        } catch (error) {
          results.errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Execute batch write
      if (putRequests.length > 0) {
        try {
          const batchWriteCommand = new BatchWriteCommand({
            RequestItems: {
              [tableNames.students]: putRequests,
            },
          });
          
          const batchResult = await dynamoDBClient.send(batchWriteCommand);
          
          // Check for unprocessed items
          const unprocessedItems = batchResult.UnprocessedItems?.[tableNames.students];
          if (unprocessedItems && unprocessedItems.length > 0) {
            logger.warn({ count: unprocessedItems.length }, `Batch write had ${unprocessedItems.length} unprocessed items for students`);
            // Try individual writes for unprocessed items
            for (const unprocessedItem of unprocessedItems) {
              try {
                await putStudent(unprocessedItem.PutRequest!.Item as StudentRecord);
              } catch (err) {
                const studentId = (unprocessedItem.PutRequest!.Item as any).student_id;
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                logger.error({ error: err, studentId }, `Error writing unprocessed student ${studentId}`);
                results.errors.push(`Student ${studentId}: ${errorMsg}`);
                // Adjust counts since this item failed
                if (existingRecordsMap.has(studentId)) {
                  results.updated--;
                } else {
                  results.inserted--;
                }
                results.processed--;
              }
            }
          }
        } catch (error) {
          logger.error({ error }, 'Error batch writing students');
          // If batch write fails, fall back to individual writes for this batch
          for (let j = 0; j < putRequests.length; j++) {
            const request = putRequests[j];
            try {
              await putStudent(request.PutRequest.Item);
            } catch (err) {
              const studentId = request.PutRequest.Item.student_id;
              const errorMsg = err instanceof Error ? err.message : 'Unknown error';
              logger.error({ error: err, studentId }, `Error writing student ${studentId}`);
              results.errors.push(`Student ${studentId}: ${errorMsg}`);
              // Adjust counts since this item failed
              if (existingRecordsMap.has(studentId)) {
                results.updated--;
              } else {
                results.inserted--;
              }
              results.processed--;
            }
          }
        }
      }
    }

    // Check if any records were successfully processed
    if (results.processed === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          message: 'Failed to upload student data. No records were successfully processed.',
          errors: results.errors.length > 0 ? results.errors : ['Unknown error occurred during upload'],
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: `Successfully processed ${results.processed} students (${results.inserted} inserted, ${results.updated} updated)`,
        processed: results.processed,
        inserted: results.inserted,
        updated: results.updated,
        errors: results.errors.length > 0 ? results.errors : undefined,
      }),
    };
  } catch (error) {
    const contextLogger = createLambdaLogger(event); contextLogger.error({ error }, 'Error in student upload handler');
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

async function getStudent(studentId: string) {
  try {
    const command = new GetCommand({
      TableName: tableNames.students,
      Key: { student_id: studentId },
    });
    const result = await dynamoDBClient.send(command);
    return result.Item as StudentRecord | undefined;
  } catch (error) {
    logger.error({ error, studentId }, `Error getting student ${studentId}`);
    return undefined;
  }
}

async function putStudent(student: StudentRecord) {
  const command = new PutCommand({
    TableName: tableNames.students,
    Item: student,
  });
  await dynamoDBClient.send(command);
}
