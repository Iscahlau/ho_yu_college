# Game Click Tracking Implementation

This document explains how the game click tracking feature is implemented across the stack.

## Overview

When a student clicks to play a game, the system:
1. Increments the `accumulated_click` count for that game in the database
2. Updates the student's marks based on game difficulty:
   - **Beginner**: +5 marks
   - **Intermediate**: +10 marks
   - **Advanced**: +15 marks
3. Teachers and admins do NOT receive marks when clicking games

This feature is implemented with atomic operations to safely handle concurrent clicks.

## Architecture

### Frontend Integration

**Location**: `frontend/src/pages/Game/Game.tsx`

When a student opens a game page, the frontend automatically tracks the click:

```typescript
// Implemented in Game.tsx
import { trackGameClick } from '../../services/gamesService';
import { updateMarks } from '../../store/slices/authSlice';

// Track game click and update marks when game loads
useEffect(() => {
  const trackClick = async () => {
    if (!gameInfo || clickTracked) return;

    try {
      const response = await trackGameClick(
        gameInfo.gameId,
        user?.id,
        user?.role
      );

      if (response.success && response.data) {
        // Update marks in Redux store if marks were updated (student only)
        if (response.data.marks !== undefined && user?.role === 'student') {
          dispatch(updateMarks(response.data.marks));
        }
      }
    } catch (error) {
      console.error('Failed to track game click:', error);
      // Continue showing the game even if tracking fails
    }
  };

  trackClick();
}, [gameInfo, user, clickTracked, dispatch]);
```

### Backend Lambda Function

**Location**: `backend/lambda/games/click.ts`

**Key Features**:
1. **Atomic Updates**: Uses DynamoDB's `ADD` expression to safely increment counters
2. **Race Condition Safe**: Multiple concurrent requests are handled correctly
3. **Student Mark Updates**: Automatically adds marks based on game difficulty for students only
4. **Role-Based Logic**: Only students receive marks; teachers and admins do not
5. **Validation**: Verifies game exists before attempting update
6. **Error Handling**: Returns appropriate error codes for different failure scenarios

**Request Body**:
```typescript
interface ClickRequestBody {
  student_id?: string;
  role?: 'student' | 'teacher' | 'admin';
}
```

**Mark Calculation**:
```typescript
const MARKS_BY_DIFFICULTY: Record<string, number> = {
  'Beginner': 5,
  'Intermediate': 10,
  'Advanced': 15,
};
```

**DynamoDB Update Expressions**:
```typescript
// Game click increment (always executed)
UpdateExpression: 'ADD accumulated_click :increment',
ExpressionAttributeValues: {
  ':increment': 1,
}

// Student marks update (only for students)
UpdateExpression: 'ADD marks :marksIncrement',
ExpressionAttributeValues: {
  ':marksIncrement': marksToAdd, // 5, 10, or 15 based on difficulty
}
```

This ensures that even if multiple students click the same game simultaneously, each click is properly counted and marks are correctly updated without race conditions.

### Mock Server

**Location**: `backend/mock-server/server.ts`

The mock server provides the same API endpoint for local development:
- Endpoint: `POST /games/:gameId/click`
- Uses in-memory Map for click tracking
- Simulates the same behavior as production Lambda

## API Specification

### Endpoint
`POST /games/{gameId}/click`

### Request Body (Optional)
```json
{
  "student_id": "STU001",
  "role": "student"
}
```

**Note**: If no body is provided, only the click count is incremented. Marks are only updated when `role` is `"student"` and `student_id` is provided.

### Success Response (200)
```json
{
  "success": true,
  "accumulated_click": 16,
  "marks": 125
}
```

**Response Fields**:
- `success`: Always `true` for successful requests
- `accumulated_click`: Updated click count for the game
- `marks`: (Optional) Updated student marks, only present when marks were updated

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
- Coverage: 17 test cases
- Tests include:
  - Basic click increment validation
  - Concurrent click handling
  - Student mark updates for all difficulty levels (Beginner, Intermediate, Advanced)
  - Role-based mark updates (students get marks, teachers/admins don't)
  - Mark accumulation across multiple clicks
  - Error handling and CORS headers

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
- IAM permissions: Lambda has read/write access to:
  - Games DynamoDB table (for click tracking)
  - Students DynamoDB table (for mark updates)

### Environment Variables
The Lambda function uses:
- `GAMES_TABLE_NAME`: Name of the DynamoDB table containing game records
- `STUDENTS_TABLE_NAME`: Name of the DynamoDB table containing student records

## Mark Update Logic

### How Marks Are Calculated
When a student clicks on a game, marks are awarded based on the game's difficulty level:

| Difficulty    | Marks Awarded |
|---------------|---------------|
| Beginner      | 5             |
| Intermediate  | 10            |
| Advanced      | 15            |

### Role-Based Updates
- **Students**: Receive marks based on game difficulty
- **Teachers**: Do NOT receive marks (click is tracked but no mark update)
- **Admins**: Do NOT receive marks (click is tracked but no mark update)
- **Anonymous**: If no user context is provided, only click count is incremented

### Atomic Operations
Both the click increment and mark updates use DynamoDB's atomic `ADD` operation, ensuring:
- No race conditions between concurrent requests
- Accurate counting even with high traffic
- No lost updates or double-counting

### Frontend Integration
The mark update is seamlessly integrated into the game loading flow:
1. User navigates to game page
2. Frontend automatically calls click tracking API with user context
3. Backend updates click count and student marks atomically
4. Frontend updates Redux store with new marks
5. Updated marks are persisted in session storage
6. User sees game and can play immediately

## Future Enhancements

Potential improvements for this feature:

1. **Analytics**: Track which students clicked which games for behavioral insights
2. **Rate Limiting**: Prevent abuse by limiting marks per game per student per day
3. **Click Details**: Record timestamp and user ID for each click
4. **Metrics**: CloudWatch metrics for tracking click patterns and mark distribution
5. **Caching**: Add caching layer to reduce DynamoDB read costs
6. **Leaderboard**: Show top students based on accumulated marks

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
