/**
 * Upload Students Lambda Handler
 * Handles Excel/CSV file uploads for student data
 * - Skips header row
 * - Upserts records based on student_id
 * - No delete functionality
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
