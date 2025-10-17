/**
 * Download Teachers Lambda Handler
 * Handles Excel export for teacher data
 * - Admin only - access control should be enforced at API Gateway level
 * - Returns Excel file (.xlsx) with proper structure
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
