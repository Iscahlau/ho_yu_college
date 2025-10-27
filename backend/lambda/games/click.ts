/**
 * Game Click Lambda Handler
 * Increments the accumulated_click count for a game
 * Updates student marks based on game difficulty when a student clicks
 * Uses atomic DynamoDB operations to handle concurrent clicks safely
 */

import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient, tableNames } from '../utils/dynamodb-client';
import {
  createBadRequestResponse,
  createNotFoundResponse,
  createSuccessResponse,
  createInternalErrorResponse,
  parseRequestBody,
} from '../utils/response';
import { createLambdaLogger } from '../utils/logger';
import { MARKS_BY_DIFFICULTY, DIFFICULTY_MULTIPLIERS } from '../constants';
import type { ClickRequestBody } from '../types';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const logger = createLambdaLogger(event);
  
  try {
    const gameId = event.pathParameters?.gameId;

    if (!gameId) {
      logger.warn('Click request missing gameId parameter');
      return createBadRequestResponse('Missing gameId parameter');
    }

    // Parse request body for user context
    const requestBody = parseRequestBody<ClickRequestBody>(event.body);

    // First verify the game exists and get its difficulty
    const getCommand = new GetCommand({
      TableName: tableNames.games,
      Key: { game_id: gameId },
    });

    const getResult = await dynamoDBClient.send(getCommand);

    if (!getResult.Item) {
      logger.warn({ gameId }, 'Game not found');
      return createNotFoundResponse('Game not found');
    }

    const game = getResult.Item;

    // Use atomic ADD operation to increment the click count
    // This ensures thread-safety even with concurrent requests
    const updateCommand = new UpdateCommand({
      TableName: tableNames.games,
      Key: { game_id: gameId },
      UpdateExpression: 'ADD accumulated_click :increment',
      ExpressionAttributeValues: {
        ':increment': 1,
      },
      ReturnValues: 'ALL_NEW',
    });

    const updateResult = await dynamoDBClient.send(updateCommand);

    // Update student marks if this is a student clicking
    let updatedMarks: number | undefined;
    if (requestBody.student_id && requestBody.role === 'student' && game.difficulty) {
      updatedMarks = await updateStudentMarks(
        requestBody.student_id, 
        game.difficulty, 
        requestBody.time_spent,
        logger
      );
    }

    logger.info(
      { gameId, accumulated_click: updateResult.Attributes?.accumulated_click, student_id: requestBody.student_id },
      'Game click recorded successfully'
    );

    return createSuccessResponse({
      accumulated_click: updateResult.Attributes?.accumulated_click,
      marks: updatedMarks,
    });
  } catch (error) {
    logger.error({ error }, 'Error incrementing game click');
    return createInternalErrorResponse(error as Error);
  }
};

/**
 * Update student marks based on game difficulty and time spent
 * Formula: Math.ceil(timeInSeconds / 60) * DIFFICULTY_MULTIPLIERS[difficulty]
 * Minimum time is 1 minute (if time < 60 seconds, treat as 1 minute)
 */
const updateStudentMarks = async (
  studentId: string,
  difficulty: string,
  timeSpent: number | undefined,
  logger: any
): Promise<number | undefined> => {
  // If no time provided, fall back to old method for backward compatibility
  if (timeSpent === undefined) {
    const marksToAdd = MARKS_BY_DIFFICULTY[difficulty];
    if (!marksToAdd) {
      logger.info({ difficulty }, 'No marks defined for difficulty');
      return undefined;
    }
    
    try {
      const studentUpdateCommand = new UpdateCommand({
        TableName: tableNames.students,
        Key: { student_id: studentId },
        UpdateExpression: 'ADD marks :marksIncrement',
        ExpressionAttributeValues: {
          ':marksIncrement': marksToAdd,
        },
        ReturnValues: 'ALL_NEW',
      });

      const studentUpdateResult = await dynamoDBClient.send(studentUpdateCommand);
      logger.info(
        { studentId, difficulty, marksAdded: marksToAdd, totalMarks: studentUpdateResult.Attributes?.marks },
        'Student marks updated (legacy method)'
      );
      return studentUpdateResult.Attributes?.marks;
    } catch (error) {
      logger.error({ studentId, difficulty, error }, 'Failed to update student marks');
      return undefined;
    }
  }

  // New time-based calculation
  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[difficulty];
  
  if (!difficultyMultiplier) {
    logger.info({ difficulty }, 'No multiplier defined for difficulty');
    return undefined;
  }

  // Calculate marks: time in minutes (minimum 1) × difficulty multiplier
  const timeInMinutes = Math.ceil(timeSpent / 60);
  const marksToAdd = timeInMinutes * difficultyMultiplier;

  try {
    const studentUpdateCommand = new UpdateCommand({
      TableName: tableNames.students,
      Key: { student_id: studentId },
      UpdateExpression: 'ADD marks :marksIncrement',
      ExpressionAttributeValues: {
        ':marksIncrement': marksToAdd,
      },
      ReturnValues: 'ALL_NEW',
    });

    const studentUpdateResult = await dynamoDBClient.send(studentUpdateCommand);
    logger.info(
      { studentId, difficulty, marksAdded: marksToAdd, totalMarks: studentUpdateResult.Attributes?.marks },
      'Student marks updated'
    );
    return studentUpdateResult.Attributes?.marks;
  } catch (error) {
    logger.error({ studentId, difficulty, error }, 'Failed to update student marks');
    // Don't throw - click tracking should succeed even if mark update fails
    return undefined;
  }
};
