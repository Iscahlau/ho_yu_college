/**
 * Upload Games Lambda Handler
 * Handles Excel/CSV file uploads for game data
 * - Skips header row
 * - Upserts records based on game_id
 * - No delete functionality
 */

import { PutCommand, GetCommand, BatchGetCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as XLSX from 'xlsx';
import { dynamoDBClient, tableNames } from '../utils/dynamodb-client';

interface GameRecord {
  game_id: string;
  game_name: string;
  student_id: string;
  subject: string;
  difficulty: string;
  teacher_id: string;
  last_update: string;
  scratch_id: string;
  scratch_api: string;
  accumulated_click: number;
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
      if (!record.game_id) {
        results.errors.push(`Row ${i + 2}: Missing game_id`);
        continue;
      }

      parsedRecords.push({ index: i, record });
    }

    // Batch check which records already exist (25 items per batch)
    const BATCH_SIZE = 25;
    const existingRecordsMap = new Map<string, GameRecord>();
    
    for (let i = 0; i < parsedRecords.length; i += BATCH_SIZE) {
      const batch = parsedRecords.slice(i, i + BATCH_SIZE);
      const keys = batch.map(({ record }) => ({ game_id: record.game_id }));
      
      try {
        const batchGetCommand = new BatchGetCommand({
          RequestItems: {
            [tableNames.games]: {
              Keys: keys,
            },
          },
        });
        
        const batchResult = await dynamoDBClient.send(batchGetCommand);
        const items = batchResult.Responses?.[tableNames.games] || [];
        
        items.forEach((item) => {
          existingRecordsMap.set(item.game_id, item as GameRecord);
        });
      } catch (error) {
        console.error('Error batch getting games:', error);
        // If batch get fails, fall back to individual checks for this batch
        for (const { record } of batch) {
          try {
            const existing = await getGame(record.game_id);
            if (existing) {
              existingRecordsMap.set(record.game_id, existing);
            }
          } catch (err) {
            console.error(`Error getting game ${record.game_id}:`, err);
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
          const existingRecord = existingRecordsMap.get(record.game_id);
          
          // Prepare game record
          const gameRecord: GameRecord = {
            game_id: record.game_id,
            game_name: record.game_name || '',
            student_id: record.student_id || '',
            subject: record.subject || '',
            difficulty: record.difficulty || '',
            teacher_id: record.teacher_id || '',
            last_update: now,
            scratch_id: record.scratch_id || '',
            scratch_api: record.scratch_api || '',
            accumulated_click: existingRecord 
              ? existingRecord.accumulated_click 
              : (typeof record.accumulated_click === 'number' ? record.accumulated_click : 0),
            created_at: existingRecord ? existingRecord.created_at : now,
            updated_at: now,
          };

          putRequests.push({
            PutRequest: {
              Item: gameRecord,
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
              [tableNames.games]: putRequests,
            },
          });
          
          await dynamoDBClient.send(batchWriteCommand);
        } catch (error) {
          console.error('Error batch writing games:', error);
          // If batch write fails, fall back to individual writes for this batch
          for (const request of putRequests) {
            try {
              await putGame(request.PutRequest.Item);
            } catch (err) {
              console.error('Error writing game:', err);
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
        message: `Successfully processed ${results.processed} games (${results.inserted} inserted, ${results.updated} updated)`,
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

async function getGame(gameId: string) {
  try {
    const command = new GetCommand({
      TableName: tableNames.games,
      Key: { game_id: gameId },
    });
    const result = await dynamoDBClient.send(command);
    return result.Item as GameRecord | undefined;
  } catch (error) {
    console.error(`Error getting game ${gameId}:`, error);
    return undefined;
  }
}

async function putGame(game: GameRecord) {
  const command = new PutCommand({
    TableName: tableNames.games,
    Item: game,
  });
  await dynamoDBClient.send(command);
}
