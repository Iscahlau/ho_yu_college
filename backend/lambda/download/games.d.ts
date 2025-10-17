/**
 * Download Games Lambda Handler
 * Handles Excel export for game data
 * - Accessible by both teachers and admins
 * - Returns Excel file (.xlsx) with proper structure
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
