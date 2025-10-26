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
import { createLambdaLogger } from '../utils/logger';
import type { ListGamesResponse } from '../types';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const logger = createLambdaLogger(event);
  
  try {
    logger.info('Fetching games from DynamoDB');

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

    logger.info({ count: response.count, hasMore: response.hasMore }, 'Successfully fetched games');
    return createSuccessResponse(response);
  } catch (error) {
    logger.error({ error }, 'Error fetching games');
    return createInternalErrorResponse(error as Error);
  }
};

