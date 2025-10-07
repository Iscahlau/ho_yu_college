/**
 * Game Click Lambda Handler
 * Increments the accumulated_click count for a game
 * Uses atomic DynamoDB operations to handle concurrent clicks safely
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

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

    // First verify the game exists
    const getCommand = new GetCommand({
      TableName: process.env.GAMES_TABLE_NAME,
      Key: { game_id: gameId },
    });

    const getResult = await docClient.send(getCommand);
    
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

    // Use atomic ADD operation to increment the click count
    // This ensures thread-safety even with concurrent requests
    const updateCommand = new UpdateCommand({
      TableName: process.env.GAMES_TABLE_NAME,
      Key: { game_id: gameId },
      UpdateExpression: 'ADD accumulated_click :increment',
      ExpressionAttributeValues: {
        ':increment': 1,
      },
      ReturnValues: 'ALL_NEW',
    });

    const updateResult = await docClient.send(updateCommand);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        accumulated_click: updateResult.Attributes?.accumulated_click,
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
