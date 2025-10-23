/**
 * Games Lambda Handler - List all games
 * Returns all games from DynamoDB
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// Create DynamoDB client
const mode = process.env.DYNAMODB_MODE || 'aws';
const clientConfig: any = {
  region: process.env.AWS_REGION || 'us-east-1',
};

if (mode === 'local') {
  const endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8002';
  clientConfig.endpoint = endpoint;
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
  };
  console.log(`[DynamoDB] Connecting to local DynamoDB at ${endpoint}`);
}

const client = new DynamoDBClient(clientConfig);
const dynamoDBClient = DynamoDBDocumentClient.from(client);

const tableNames = {
  games: process.env.GAMES_TABLE_NAME || 'ho-yu-games',
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Fetching all games from DynamoDB');

    const command = new ScanCommand({
      TableName: tableNames.games,
    });

    const result = await dynamoDBClient.send(command);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result.Items || []),
    };
  } catch (error) {
    console.error('Error fetching games:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Internal server error', error: String(error) }),
    };
  }
};

