/**
 * Response Utility Functions
 * Helper functions for creating standardized API Gateway responses
 */

import { APIGatewayProxyResult } from 'aws-lambda';
import { JSON_RESPONSE_HEADERS, EXCEL_RESPONSE_HEADERS, HTTP_STATUS } from '../constants';
import type { ErrorResponse, SuccessResponse } from '../types';

/**
 * Create a standardized error response
 * @param statusCode - HTTP status code
 * @param message - Error message
 * @param additionalData - Optional additional data to include in response
 * @returns APIGatewayProxyResult with error details
 */
export const createErrorResponse = (
  statusCode: number,
  message: string,
  additionalData?: Record<string, any>
): APIGatewayProxyResult => {
  const response: ErrorResponse = {
    success: false,
    message,
    ...additionalData,
  };

  return {
    statusCode,
    headers: JSON_RESPONSE_HEADERS,
    body: JSON.stringify(response),
  };
};

/**
 * Create a standardized success response
 * @param data - Response data
 * @param statusCode - HTTP status code (default: 200)
 * @returns APIGatewayProxyResult with success data
 */
export const createSuccessResponse = (
  data: Record<string, any>,
  statusCode: number = HTTP_STATUS.OK
): APIGatewayProxyResult => {
  const response: SuccessResponse = {
    success: true,
    ...data,
  };

  return {
    statusCode,
    headers: JSON_RESPONSE_HEADERS,
    body: JSON.stringify(response),
  };
};

/**
 * Create a response for Excel file downloads
 * @param buffer - Excel file buffer
 * @param filename - Filename for download
 * @returns APIGatewayProxyResult with Excel file
 */
export const createExcelResponse = (
  buffer: Buffer,
  filename: string
): APIGatewayProxyResult => ({
  statusCode: HTTP_STATUS.OK,
  headers: {
    ...EXCEL_RESPONSE_HEADERS,
    'Content-Disposition': `attachment; filename="${filename}"`,
  },
  body: buffer.toString('base64'),
  isBase64Encoded: true,
});

/**
 * Create a bad request (400) error response
 * @param message - Error message
 * @param additionalData - Optional additional data
 * @returns APIGatewayProxyResult with 400 status
 */
export const createBadRequestResponse = (
  message: string,
  additionalData?: Record<string, any>
): APIGatewayProxyResult =>
  createErrorResponse(HTTP_STATUS.BAD_REQUEST, message, additionalData);

/**
 * Create an unauthorized (401) error response
 * @param message - Error message
 * @returns APIGatewayProxyResult with 401 status
 */
export const createUnauthorizedResponse = (
  message: string = 'Unauthorized'
): APIGatewayProxyResult =>
  createErrorResponse(HTTP_STATUS.UNAUTHORIZED, message);

/**
 * Create a not found (404) error response
 * @param message - Error message
 * @returns APIGatewayProxyResult with 404 status
 */
export const createNotFoundResponse = (
  message: string = 'Resource not found'
): APIGatewayProxyResult =>
  createErrorResponse(HTTP_STATUS.NOT_FOUND, message);

/**
 * Create an internal server error (500) response
 * @param error - Error object or message
 * @returns APIGatewayProxyResult with 500 status
 */
export const createInternalErrorResponse = (
  error: Error | string
): APIGatewayProxyResult => {
  const message = 'Internal server error';
  const errorDetails = error instanceof Error ? error.message : String(error);
  
  console.error('Internal server error:', errorDetails);
  
  return createErrorResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, message, {
    error: errorDetails,
  });
};

/**
 * Parse request body safely
 * @param body - Request body string
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed object or default value
 */
export const parseRequestBody = <T = any>(
  body: string | null | undefined,
  defaultValue: T = {} as T
): T => {
  if (!body) {
    return defaultValue;
  }

  try {
    return JSON.parse(body) as T;
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return defaultValue;
  }
};

/**
 * Get current ISO timestamp
 * @returns Current timestamp in ISO format
 */
export const getCurrentTimestamp = (): string => new Date().toISOString();

/**
 * Get date string for file naming (YYYY-MM-DD)
 * @returns Date string in YYYY-MM-DD format
 */
export const getDateString = (): string => new Date().toISOString().split('T')[0];
