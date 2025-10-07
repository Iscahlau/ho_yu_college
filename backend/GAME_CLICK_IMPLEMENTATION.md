# Game Click Tracking Implementation

This document explains how the game click tracking feature is implemented across the stack.

## Overview

When a student clicks to play a game, the system increments the `accumulated_click` count for that game in the database. This feature is implemented with atomic operations to safely handle concurrent clicks.

## Architecture

### Frontend Integration

When a student clicks on a game, the frontend should make a POST request to increment the click count:

```javascript
// Example implementation (to be added to frontend)
async function trackGameClick(gameId) {
  try {
    const response = await fetch(`${API_URL}/games/${gameId}/click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log('Click tracked:', data.accumulated_click);
  } catch (error) {
    console.error('Failed to track click:', error);
    // Continue opening the game even if tracking fails
  }
}
```

### Backend Lambda Function

**Location**: `backend/lambda/games/click.ts`

**Key Features**:
1. **Atomic Updates**: Uses DynamoDB's `ADD` expression to safely increment the counter
2. **Race Condition Safe**: Multiple concurrent requests are handled correctly
3. **Validation**: Verifies game exists before attempting update
4. **Error Handling**: Returns appropriate error codes for different failure scenarios

**DynamoDB Update Expression**:
```typescript
UpdateExpression: 'ADD accumulated_click :increment',
ExpressionAttributeValues: {
  ':increment': 1,
}
```

This ensures that even if multiple students click the same game simultaneously, each click is properly counted without race conditions.

### Mock Server

**Location**: `backend/mock-server/server.ts`

The mock server provides the same API endpoint for local development:
- Endpoint: `POST /games/:gameId/click`
- Uses in-memory Map for click tracking
- Simulates the same behavior as production Lambda

## API Specification

### Endpoint
`POST /games/{gameId}/click`

### Request
No request body required. The game ID is specified in the URL path.

### Success Response (200)
```json
{
  "success": true,
  "accumulated_click": 16
}
```

### Error Responses

**400 Bad Request** - Missing game ID
```json
{
  "message": "Missing gameId parameter"
}
```

**404 Not Found** - Game doesn't exist
```json
{
  "message": "Game not found"
}
```

**500 Internal Server Error** - Server error
```json
{
  "message": "Internal server error"
}
```

## Testing

### Unit Tests
- Location: `backend/test/lambda/game-click.test.ts`
- Coverage: 10 test cases
- Tests include: validation, concurrent clicks, error handling, CORS headers

### Manual Testing with Mock Server

```bash
# Start the mock server
cd backend
npm run mock-server

# Test clicking a game
curl -X POST http://localhost:3000/games/1207260630/click

# Test concurrent clicks
for i in {1..10}; do curl -X POST http://localhost:3000/games/1207260630/click & done

# Verify the count increased correctly
curl http://localhost:3000/games/1207260630 | grep accumulated_click
```

## Concurrency Handling

The implementation is designed to handle concurrent clicks safely:

1. **DynamoDB Atomic Operations**: The `ADD` expression in DynamoDB is atomic, meaning:
   - If 5 students click simultaneously, all 5 increments will be applied
   - No race conditions or lost updates
   - No need for application-level locking

2. **Test Coverage**: The test suite includes scenarios for rapid sequential clicks to verify correct behavior

## Deployment

### AWS Resources Created
- Lambda function: `ho-yu-game-click`
- API Gateway endpoint: `POST /games/{gameId}/click`
- IAM permissions: Lambda has read/write access to Games DynamoDB table

### Environment Variables
The Lambda function uses:
- `GAMES_TABLE_NAME`: Name of the DynamoDB table containing game records

## Future Enhancements

Potential improvements for this feature:

1. **Analytics**: Track which students clicked which games for behavioral insights
2. **Rate Limiting**: Prevent abuse by limiting clicks per user per game per day
3. **Click Details**: Record timestamp and user ID for each click
4. **Metrics**: CloudWatch metrics for tracking click patterns
5. **Caching**: Add caching layer to reduce DynamoDB read costs

## Troubleshooting

### Lambda Function Not Incrementing

Check:
1. Lambda has correct IAM permissions for DynamoDB
2. Environment variable `GAMES_TABLE_NAME` is set correctly
3. Game exists in the database
4. CloudWatch logs for error details

### Mock Server Not Working

Check:
1. Server is running on port 3000 (or configured port)
2. Game ID exists in mock data
3. No port conflicts

### Frontend Not Tracking Clicks

Check:
1. API URL is configured correctly
2. CORS headers are present in API responses
3. Network tab shows POST request being made
4. Game ID is being passed correctly in URL
