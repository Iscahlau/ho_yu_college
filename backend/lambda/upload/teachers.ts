/**
 * Upload Teachers Lambda Handler
 * Handles Excel/CSV file uploads for teacher data
 * - Skips header row
 * - Upserts records based on teacher_id
 * - No delete functionality
 */

import { PutCommand, GetCommand, BatchGetCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as XLSX from 'xlsx';
import { dynamoDBClient, tableNames } from '../utils/dynamodb-client';

interface TeacherRecord {
  teacher_id: string;
  name: string;
  password: string;
  responsible_class: string[]; // JSON array stored as array in DynamoDB
  last_login: string;
  is_admin: boolean;
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
      if (!record.teacher_id) {
        results.errors.push(`Row ${i + 2}: Missing teacher_id`);
        continue;
      }

      parsedRecords.push({ index: i, record });
    }

    // Batch check which records already exist (25 items per batch)
    const BATCH_SIZE = 25;
    const existingRecordsMap = new Map<string, TeacherRecord>();
    
    for (let i = 0; i < parsedRecords.length; i += BATCH_SIZE) {
      const batch = parsedRecords.slice(i, i + BATCH_SIZE);
      const keys = batch.map(({ record }) => ({ teacher_id: record.teacher_id }));
      
      try {
        const batchGetCommand = new BatchGetCommand({
          RequestItems: {
            [tableNames.teachers]: {
              Keys: keys,
            },
          },
        });
        
        const batchResult = await dynamoDBClient.send(batchGetCommand);
        const items = batchResult.Responses?.[tableNames.teachers] || [];
        
        items.forEach((item) => {
          existingRecordsMap.set(item.teacher_id, item as TeacherRecord);
        });
      } catch (error) {
        console.error('Error batch getting teachers:', error);
        // If batch get fails, fall back to individual checks for this batch
        for (const { record } of batch) {
          try {
            const existing = await getTeacher(record.teacher_id);
            if (existing) {
              existingRecordsMap.set(record.teacher_id, existing);
            }
          } catch (err) {
            console.error(`Error getting teacher ${record.teacher_id}:`, err);
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
          const existingRecord = existingRecordsMap.get(record.teacher_id);
          
          // Parse responsible_class - it may be a JSON string
          let responsibleClass: string[] = [];
          if (record.responsible_class) {
            if (typeof record.responsible_class === 'string') {
              try {
                responsibleClass = JSON.parse(record.responsible_class);
              } catch {
                // If not valid JSON, treat as single class
                responsibleClass = [record.responsible_class];
              }
            } else if (Array.isArray(record.responsible_class)) {
              responsibleClass = record.responsible_class;
            }
          }

          // Prepare teacher record
          const teacherRecord: TeacherRecord = {
            teacher_id: record.teacher_id,
            name: record.name || '',
            password: record.password || '',
            responsible_class: responsibleClass,
            last_login: record.last_login || now,
            is_admin: record.is_admin === true || record.is_admin === 'true' || record.is_admin === 1,
            created_at: existingRecord ? existingRecord.created_at : now,
            updated_at: now,
          };

          putRequests.push({
            PutRequest: {
              Item: teacherRecord,
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
              [tableNames.teachers]: putRequests,
            },
          });
          
          await dynamoDBClient.send(batchWriteCommand);
        } catch (error) {
          console.error('Error batch writing teachers:', error);
          // If batch write fails, fall back to individual writes for this batch
          for (const request of putRequests) {
            try {
              await putTeacher(request.PutRequest.Item);
            } catch (err) {
              console.error('Error writing teacher:', err);
            }
          }
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: `Successfully processed ${results.processed} teachers (${results.inserted} inserted, ${results.updated} updated)`,
        processed: results.processed,
        inserted: results.inserted,
        updated: results.updated,
        errors: results.errors.length > 0 ? results.errors : undefined,
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
      body: JSON.stringify({ 
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

async function getTeacher(teacherId: string) {
  try {
    const command = new GetCommand({
      TableName: tableNames.teachers,
      Key: { teacher_id: teacherId },
    });
    const result = await dynamoDBClient.send(command);
    return result.Item as TeacherRecord | undefined;
  } catch (error) {
    console.error(`Error getting teacher ${teacherId}:`, error);
    return undefined;
  }
}

async function putTeacher(teacher: TeacherRecord) {
  const command = new PutCommand({
    TableName: tableNames.teachers,
    Item: teacher,
  });
  await dynamoDBClient.send(command);
}
