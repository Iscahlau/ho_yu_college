/**
 * Games Lambda Handler - List all games
 * Returns all games from DynamoDB with optional pagination
 */

import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient, tableNames } from '../utils/dynamodb-client';
import {
  createSuccessResponse,
  createInternalErrorResponse,
} from '../utils/response';
import type { ListGamesResponse } from '../types';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Fetching games from DynamoDB');

    // Support pagination via query parameters
    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit, 10)
      : undefined;
    const lastEvaluatedKey = event.queryStringParameters?.lastKey
      ? JSON.parse(decodeURIComponent(event.queryStringParameters.lastKey))
      : undefined;

    const command = new ScanCommand({
      TableName: tableNames.games,
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const result = await dynamoDBClient.send(command);

    // Build response with pagination metadata
    const response: ListGamesResponse = {
      items: (result.Items || []) as any,
      count: result.Items?.length || 0,
      hasMore: !!result.LastEvaluatedKey,
    };

    // Include pagination token if there are more items
    if (result.LastEvaluatedKey) {
      response.lastKey = encodeURIComponent(JSON.stringify(result.LastEvaluatedKey));
    }

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Error fetching games:', error);
    return createInternalErrorResponse(error as Error);
  }
};

