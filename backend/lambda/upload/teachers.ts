/**
 * Upload Teachers Lambda Handler
 * Handles Excel/CSV file uploads for teacher data
 * - Skips header row
 * - Upserts records based on teacher_id
 * - No delete functionality
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as XLSX from 'xlsx';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

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

    // Process each row - upsert (update if exists, insert if new)
    const results = {
      processed: 0,
      inserted: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      try {
        // Map row data to object using headers
        const record: any = {};
        headers.forEach((header, index) => {
          record[header] = row[index];
        });

        // Validate required field
        if (!record.teacher_id) {
          results.errors.push(`Row ${i + 2}: Missing teacher_id`);
          continue;
        }

        // Check if record exists
        const existingRecord = await getTeacher(record.teacher_id);
        const now = new Date().toISOString();

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

        // Upsert record
        await putTeacher(teacherRecord);
        
        if (existingRecord) {
          results.updated++;
        } else {
          results.inserted++;
        }
        results.processed++;
      } catch (error) {
        results.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      TableName: process.env.TEACHERS_TABLE_NAME || 'ho-yu-teachers',
      Key: { teacher_id: teacherId },
    });
    const result = await docClient.send(command);
    return result.Item as TeacherRecord | undefined;
  } catch (error) {
    console.error(`Error getting teacher ${teacherId}:`, error);
    return undefined;
  }
}

async function putTeacher(teacher: TeacherRecord) {
  const command = new PutCommand({
    TableName: process.env.TEACHERS_TABLE_NAME || 'ho-yu-teachers',
    Item: teacher,
  });
  await docClient.send(command);
}
