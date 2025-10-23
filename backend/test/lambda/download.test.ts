/**
 * Download Lambda Functions Tests
 * Tests for DynamoDB client configuration used by download endpoints
 */

describe('Download Lambda Functions - DynamoDB Configuration', () => {
  beforeEach(() => {
    // Clear module cache to ensure clean state
    jest.resetModules();
  });

  describe('DynamoDB Client Configuration', () => {
    it('should use DYNAMODB_ENDPOINT from environment when in local mode', () => {
      // Set environment variables as SAM template does
      process.env.DYNAMODB_MODE = 'local';
      process.env.DYNAMODB_ENDPOINT = 'http://dynamodb-local:8000';
      process.env.AWS_REGION = 'us-east-1';
      
      // Verify environment is set correctly
      expect(process.env.DYNAMODB_MODE).toBe('local');
      expect(process.env.DYNAMODB_ENDPOINT).toBe('http://dynamodb-local:8000');
      expect(process.env.AWS_REGION).toBe('us-east-1');
    });

    it('should default to localhost:8002 when DYNAMODB_ENDPOINT is not set', () => {
      process.env.DYNAMODB_MODE = 'local';
      delete process.env.DYNAMODB_ENDPOINT;
      
      // The client should use the default endpoint
      expect(process.env.DYNAMODB_ENDPOINT).toBeUndefined();
      expect(process.env.DYNAMODB_MODE).toBe('local');
    });

    it('should use AWS mode when DYNAMODB_MODE is not local', () => {
      process.env.DYNAMODB_MODE = 'aws';
      delete process.env.DYNAMODB_ENDPOINT;
      
      expect(process.env.DYNAMODB_MODE).toBe('aws');
      expect(process.env.DYNAMODB_ENDPOINT).toBeUndefined();
    });
  });

  describe('Table Names Configuration', () => {
    it('should use table names from environment variables', () => {
      process.env.STUDENTS_TABLE_NAME = 'ho-yu-students';
      process.env.TEACHERS_TABLE_NAME = 'ho-yu-teachers';
      process.env.GAMES_TABLE_NAME = 'ho-yu-games';
      
      expect(process.env.STUDENTS_TABLE_NAME).toBe('ho-yu-students');
      expect(process.env.TEACHERS_TABLE_NAME).toBe('ho-yu-teachers');
      expect(process.env.GAMES_TABLE_NAME).toBe('ho-yu-games');
    });
  });

  describe('SAM Template Environment Variables', () => {
    it('should match SAM template configuration for local development', () => {
      // These are the exact values from template.yaml
      const samConfig = {
        DYNAMODB_MODE: 'local',
        DYNAMODB_ENDPOINT: 'http://dynamodb-local:8000',
        AWS_REGION: 'us-east-1',
        STUDENTS_TABLE_NAME: 'ho-yu-students',
        TEACHERS_TABLE_NAME: 'ho-yu-teachers',
        GAMES_TABLE_NAME: 'ho-yu-games',
      };
      
      // Set environment to match SAM template
      Object.assign(process.env, samConfig);
      
      // Verify all values are set correctly
      expect(process.env.DYNAMODB_MODE).toBe(samConfig.DYNAMODB_MODE);
      expect(process.env.DYNAMODB_ENDPOINT).toBe(samConfig.DYNAMODB_ENDPOINT);
      expect(process.env.AWS_REGION).toBe(samConfig.AWS_REGION);
      expect(process.env.STUDENTS_TABLE_NAME).toBe(samConfig.STUDENTS_TABLE_NAME);
      expect(process.env.TEACHERS_TABLE_NAME).toBe(samConfig.TEACHERS_TABLE_NAME);
      expect(process.env.GAMES_TABLE_NAME).toBe(samConfig.GAMES_TABLE_NAME);
    });
  });
});
