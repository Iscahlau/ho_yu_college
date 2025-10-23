/**
 * Game Click Lambda Handler
 * Increments the accumulated_click count for a game
 * Updates student marks based on game difficulty when a student clicks
 * Uses atomic DynamoDB operations to handle concurrent clicks safely
 */

import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient, tableNames } from '../utils/dynamodb-client';

interface ClickRequestBody {
  student_id?: string;
  role?: 'student' | 'teacher' | 'admin';
}

// Mark values based on difficulty
const MARKS_BY_DIFFICULTY: Record<string, number> = {
  'Beginner': 5,
  'Intermediate': 10,
  'Advanced': 15,
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const gameId = event.pathParameters?.gameId;

    if (!gameId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Missing gameId parameter' }),
      };
    }

    // Parse request body for user context
    let requestBody: ClickRequestBody = {};
    if (event.body) {
      try {
        requestBody = JSON.parse(event.body);
      } catch (err) {
        // If body can't be parsed, continue without user context
        console.log('Could not parse request body, continuing without user context');
      }
    }

    // First verify the game exists and get its difficulty
    const getCommand = new GetCommand({
      TableName: tableNames.games,
      Key: { game_id: gameId },
    });

    const getResult = await dynamoDBClient.send(getCommand);
    
    if (!getResult.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Game not found' }),
      };
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
      const marksToAdd = MARKS_BY_DIFFICULTY[game.difficulty];
      
      if (marksToAdd) {
        try {
          const studentUpdateCommand = new UpdateCommand({
            TableName: tableNames.students,
            Key: { student_id: requestBody.student_id },
            UpdateExpression: 'ADD marks :marksIncrement',
            ExpressionAttributeValues: {
              ':marksIncrement': marksToAdd,
            },
            ReturnValues: 'ALL_NEW',
          });

          const studentUpdateResult = await dynamoDBClient.send(studentUpdateCommand);
          updatedMarks = studentUpdateResult.Attributes?.marks;
        } catch (studentUpdateError) {
          console.error('Failed to update student marks:', studentUpdateError);
          // Continue even if mark update fails - don't fail the click tracking
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
        accumulated_click: updateResult.Attributes?.accumulated_click,
        marks: updatedMarks,
      }),
    };
  } catch (error) {
    console.error('Error incrementing game click:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
