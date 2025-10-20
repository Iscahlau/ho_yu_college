/**
 * Upload Games Lambda Handler
 * Handles Excel/CSV file uploads for game data
 * - Skips header row
 * - Upserts records based on game_id
 * - No delete functionality
 */

import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
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
        if (!record.game_id) {
          results.errors.push(`Row ${i + 2}: Missing game_id`);
          continue;
        }

        // Check if record exists
        const existingRecord = await getGame(record.game_id);
        const now = new Date().toISOString();

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

        // Upsert record
        await putGame(gameRecord);
        
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
