/**
 * Download Games Lambda Handler
 * Handles Excel export for game data
 * - Accessible by both teachers and admins
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
import { GAMES_COLUMN_WIDTHS } from '../constants';
import type { GameRecord } from '../types';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const logger = createLambdaLogger(event);
  
  try {
    logger.info('Starting games download');
    
    // Get all games from DynamoDB
    const scanCommand = new ScanCommand({
      TableName: tableNames.games,
    });
    const result = await dynamoDBClient.send(scanCommand);
    const games = (result.Items as GameRecord[]) || [];

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
    const excelBuffer = createExcelWorkbook(excelData, 'Games', [...GAMES_COLUMN_WIDTHS]);

    logger.info({ count: games.length }, 'Games download completed successfully');

    // Return Excel file as response
    const filename = `games_${getDateString()}.xlsx`;
    return createExcelResponse(excelBuffer, filename);
  } catch (error) {
    logger.error({ error }, 'Error downloading games');
    return createInternalErrorResponse(error as Error);
  }
};

