/**
 * Game Click Lambda Function Tests
 * Unit tests for game click increment logic
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../../lambda/games/click';
import { mockGames } from '../mocks';

// Store click counts in memory for testing - outside the mock to share across tests
const clickCounts = new Map<string, number>();

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb', () => {
  return {
    DynamoDBDocumentClient: {
      from: jest.fn(() => ({
        send: jest.fn((command: any) => {
          const { mockGames } = require('../mocks');
          
          // Handle GetCommand - check if game exists
          if (command.input?.TableName && command.input?.Key?.game_id) {
            const gameId = command.input.Key.game_id;
            const game = mockGames.find((g: any) => g.game_id === gameId);
            
            // If UpdateExpression is present, it's an UpdateCommand
            if (command.input.UpdateExpression) {
              if (!game) {
                return Promise.resolve({ Attributes: undefined });
              }
              
              // Simulate atomic ADD operation
              const currentCount = clickCounts.get(gameId) || game.accumulated_click;
              const newCount = currentCount + 1;
              clickCounts.set(gameId, newCount);
              
              return Promise.resolve({
                Attributes: {
                  ...game,
                  accumulated_click: newCount,
                },
              });
            }
            
            // It's a GetCommand
            return Promise.resolve({ Item: game });
          }
          
          return Promise.resolve({ Item: undefined });
        }),
      })),
    },
    GetCommand: jest.fn((input: any) => ({ input })),
    UpdateCommand: jest.fn((input: any) => ({ input })),
  };
});

// Set environment variables
process.env.GAMES_TABLE_NAME = 'ho-yu-games';

describe('Game Click Lambda Handler', () => {
  // Reset click counts before each test
  beforeEach(() => {
    clickCounts.clear();
    // Initialize with mock data
    mockGames.forEach((game: any) => {
      clickCounts.set(game.game_id, game.accumulated_click);
    });
  });

  const createEvent = (gameId: string | null): APIGatewayProxyEvent => ({
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: `/games/${gameId}/click`,
    pathParameters: gameId ? { gameId } : null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
  });

  describe('Input Validation', () => {
    test('should return 400 if gameId is missing', async () => {
      const event = createEvent(null);
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ message: 'Missing gameId parameter' });
    });
  });

  describe('Game Existence Check', () => {
    test('should return 404 if game does not exist', async () => {
      const event = createEvent('nonexistent-game-id');
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({ message: 'Game not found' });
    });
  });

  describe('Click Increment', () => {
    test('should successfully increment click count for existing game', async () => {
      const game = mockGames[0];
      const event = createEvent(game.game_id);
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.accumulated_click).toBe(game.accumulated_click + 1);
    });

    test('should increment click count multiple times', async () => {
      const game = mockGames[1];
      const initialCount = game.accumulated_click;
      
      // First increment
      let event = createEvent(game.game_id);
      let result: APIGatewayProxyResult = await handler(event);
      let body = JSON.parse(result.body);
      expect(body.accumulated_click).toBe(initialCount + 1);

      // Second increment
      event = createEvent(game.game_id);
      result = await handler(event);
      body = JSON.parse(result.body);
      expect(body.accumulated_click).toBe(initialCount + 2);

      // Third increment
      event = createEvent(game.game_id);
      result = await handler(event);
      body = JSON.parse(result.body);
      expect(body.accumulated_click).toBe(initialCount + 3);
    });

    test('should work for different games independently', async () => {
      const game1 = mockGames[0];
      const game2 = mockGames[1];
      const initialCount1 = game1.accumulated_click;
      const initialCount2 = game2.accumulated_click;

      // Increment game 1
      let event = createEvent(game1.game_id);
      let result: APIGatewayProxyResult = await handler(event);
      let body = JSON.parse(result.body);
      expect(body.accumulated_click).toBe(initialCount1 + 1);

      // Increment game 2
      event = createEvent(game2.game_id);
      result = await handler(event);
      body = JSON.parse(result.body);
      expect(body.accumulated_click).toBe(initialCount2 + 1);

      // Increment game 1 again - should be independent
      event = createEvent(game1.game_id);
      result = await handler(event);
      body = JSON.parse(result.body);
      expect(body.accumulated_click).toBe(initialCount1 + 2);
    });

    test('should work with all mock games', async () => {
      // Test a few random games to ensure it works across the board
      const testGames = [mockGames[2], mockGames[5], mockGames[10], mockGames[15]];
      
      for (const game of testGames) {
        const event = createEvent(game.game_id);
        const result: APIGatewayProxyResult = await handler(event);
        
        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.success).toBe(true);
        expect(body.accumulated_click).toBeGreaterThan(game.accumulated_click);
      }
    });
  });

  describe('Response Headers', () => {
    test('should include CORS headers in successful response', async () => {
      const game = mockGames[0];
      const event = createEvent(game.game_id);
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.headers).toBeDefined();
      expect(result.headers!['Content-Type']).toBe('application/json');
      expect(result.headers!['Access-Control-Allow-Origin']).toBe('*');
    });

    test('should include CORS headers in error response', async () => {
      const event = createEvent('nonexistent-game');
      const result: APIGatewayProxyResult = await handler(event);

      expect(result.headers).toBeDefined();
      expect(result.headers!['Content-Type']).toBe('application/json');
      expect(result.headers!['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  describe('Concurrent Clicks Simulation', () => {
    test('should handle rapid sequential clicks correctly', async () => {
      const game = mockGames[3];
      const initialCount = game.accumulated_click;
      const numClicks = 10;

      // Simulate rapid clicks
      for (let i = 0; i < numClicks; i++) {
        const event = createEvent(game.game_id);
        const result: APIGatewayProxyResult = await handler(event);
        expect(result.statusCode).toBe(200);
      }

      // Verify final count
      const event = createEvent(game.game_id);
      const result: APIGatewayProxyResult = await handler(event);
      const body = JSON.parse(result.body);
      
      // Should have incremented by numClicks + 1 (for the final verification call)
      expect(body.accumulated_click).toBe(initialCount + numClicks + 1);
    });
  });

  describe('Response Format', () => {
    test('should return success flag and click count', async () => {
      const game = mockGames[0];
      const event = createEvent(game.game_id);
      const result: APIGatewayProxyResult = await handler(event);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('accumulated_click');
      expect(typeof body.success).toBe('boolean');
      expect(typeof body.accumulated_click).toBe('number');
    });
  });
});
