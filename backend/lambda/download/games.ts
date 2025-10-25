/**
 * Download Games Lambda Handler
 * Handles Excel export for game data
 * - Accessible by both teachers and admins
 * - Returns Excel file (.xlsx) with proper structure
 */

import { ScanCommand } from '@aws-sdk/lib-dynamodb';
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
  description?: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get all games from DynamoDB
    const scanCommand = new ScanCommand({
      TableName: tableNames.games,
    });
    const result = await dynamoDBClient.send(scanCommand);
    const games = result.Items as GameRecord[];

    // Sort games by game_id
    games.sort((a, b) => a.game_id.localeCompare(b.game_id));

    // Prepare data for Excel
    const excelData = games.map(game => ({
      game_id: game.game_id,
      game_name: game.game_name,
      student_id: game.student_id,
      subject: game.subject,
      difficulty: game.difficulty,
      teacher_id: game.teacher_id,
      last_update: game.last_update,
      scratch_id: game.scratch_id,
      scratch_api: game.scratch_api,
      accumulated_click: game.accumulated_click,
      description: game.description || '',
    }));

    // Create Excel workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Games');

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 12 }, // game_id
      { wch: 30 }, // game_name
      { wch: 12 }, // student_id
      { wch: 25 }, // subject
      { wch: 15 }, // difficulty
      { wch: 12 }, // teacher_id
      { wch: 20 }, // last_update
      { wch: 15 }, // scratch_id
      { wch: 40 }, // scratch_api
      { wch: 15 }, // accumulated_click
      { wch: 40 }, // description
    ];

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return Excel file as response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="games_${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Access-Control-Allow-Origin': '*',
      },
      body: excelBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('Error downloading games:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        success: false,
        message: 'Failed to download games data',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
