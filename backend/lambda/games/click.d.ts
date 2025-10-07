/**
 * Game Click Lambda Handler
 * Increments the accumulated_click count for a game
 * Uses atomic DynamoDB operations to handle concurrent clicks safely
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
