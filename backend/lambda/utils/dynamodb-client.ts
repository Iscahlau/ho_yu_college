/**
 * DynamoDB Client Configuration
 * Provides a configured DynamoDB client that works with both local and AWS DynamoDB
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * Create a DynamoDB client based on environment configuration
 * - In local mode (DYNAMODB_MODE=local), connects to DynamoDB Local
 * - In AWS mode or production, connects to AWS DynamoDB
 */
export function createDynamoDBClient(): DynamoDBDocumentClient {
  const mode = process.env.DYNAMODB_MODE || 'aws';
  
  const clientConfig: any = {
    region: process.env.AWS_REGION || 'us-east-1',
  };

  // Configure for local DynamoDB
  if (mode === 'local') {
    // Use DYNAMODB_ENDPOINT from environment (set by SAM template or default to localhost)
    // When running in SAM Local Lambda containers, this will be http://dynamodb-local:8000
    // When running outside Docker (e.g., scripts), this can be http://localhost:8002
    const endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8002';
    
    clientConfig.endpoint = endpoint;
    clientConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
    };

    console.log(`[DynamoDB] Connecting to local DynamoDB at ${endpoint}`);
  } else {
    console.log(`[DynamoDB] Connecting to AWS DynamoDB in ${clientConfig.region}`);
  }

  const client = new DynamoDBClient(clientConfig);
  const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertEmptyValues: false,
    },
  });

  return docClient;
}

/**
 * Get table names from environment or use defaults
 */
export function getTableNames() {
  return {
    students: process.env.STUDENTS_TABLE_NAME || 'ho-yu-students',
    teachers: process.env.TEACHERS_TABLE_NAME || 'ho-yu-teachers',
    games: process.env.GAMES_TABLE_NAME || 'ho-yu-games',
  };
}

// Export a singleton instance
export const dynamoDBClient = createDynamoDBClient();
export const tableNames = getTableNames();
