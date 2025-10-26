import pino from 'pino';

/**
 * Pino logger configured for AWS Lambda environment
 * 
 * Features:
 * - JSON formatted logs for CloudWatch
 * - Log level from environment variable or defaults to 'info'
 * - Minimal overhead for Lambda cold starts
 * - Includes Lambda request context when available
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Detect if running in Lambda environment
const isLambda = !!(process.env.LAMBDA_TASK_ROOT || process.env.AWS_EXECUTION_ENV);

// Create logger with appropriate configuration
const logger = pino({
  level: LOG_LEVEL,
  // Use JSON formatting for production/Lambda, pretty print for local development
  ...(isLambda
    ? {
        // Production Lambda configuration
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        // Local development configuration with pretty printing
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }),
  base: {
    service: 'ho-yu-college-backend',
    environment: process.env.NODE_ENV || 'development',
  },
});

/**
 * Create a child logger with additional context
 * Useful for adding request-specific context to all logs
 * 
 * @example
 * const requestLogger = createLogger({ requestId: event.requestContext.requestId });
 * requestLogger.info('Processing request');
 */
export const createLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};

/**
 * Create a logger for a Lambda handler with request context
 * 
 * @example
 * export const handler = async (event: APIGatewayProxyEvent) => {
 *   const log = createLambdaLogger(event);
 *   log.info({ path: event.path }, 'Received request');
 * };
 */
export const createLambdaLogger = (event: any) => {
  const context: Record<string, unknown> = {
    handler: 'lambda',
  };

  // Add request ID if available (API Gateway)
  if (event.requestContext?.requestId) {
    context.requestId = event.requestContext.requestId;
  }

  // Add path if available
  if (event.path) {
    context.path = event.path;
  }

  // Add HTTP method if available
  if (event.httpMethod) {
    context.method = event.httpMethod;
  }

  return logger.child(context);
};

// Export default logger instance
export default logger;
